(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  function lang() {
    if (window.NM && window.NM.lang) return window.NM.lang;
    return localStorage.getItem('nm_lang') || 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  const BIZ = {
    addr: '46 rue de Miromesnil, 75008 Paris',
    phone1: '01 81 80 08 47', phone2: '06 22 80 70 14',
    email: 'contact.nosmontres@gmail.com',
  };

  // ─── Current stock — all refs + prices ───────────────────────────────────────
  const STOCK = [
    { brand:'Rolex', model:'Submariner Date Hulk',     ref:'126610LV',        price:13900 },
    { brand:'Rolex', model:'Submariner acier/or',      ref:'116613LB',        price:11500 },
    { brand:'Rolex', model:'Submariner vintage',       ref:'16800',           price:9500  },
    { brand:'Rolex', model:'Daytona Or Rose 2024',     ref:'126505',          price:49500 },
    { brand:'Rolex', model:'Daytona Panda Acier',      ref:'126500LN',        price:27500 },
    { brand:'Rolex', model:'GMT-Master II Black',      ref:'116710LN',        price:11900 },
    { brand:'Rolex', model:'GMT-Master II Sprite',     ref:'126710GRNR',      price:18500 },
    { brand:'Rolex', model:'GMT-Master II vintage',    ref:'16710',           price:9500  },
    { brand:'Rolex', model:'Datejust 41',              ref:'126334',          price:11500 },
    { brand:'Rolex', model:'Datejust 41',              ref:'126334',          price:12900 },
    { brand:'Rolex', model:'Datejust 36 Mint',         ref:'126300',          price:11000 },
    { brand:'Rolex', model:'Datejust 36 Wimbledon',    ref:'126300 Wimbledon',price:10500 },
    { brand:'Rolex', model:'Datejust 36 Wimbledon',    ref:'126300 Wimbledon',price:9500  },
    { brand:'Rolex', model:'Datejust 36 vintage',      ref:'16234',           price:6500  },
    { brand:'Rolex', model:'Lady Datejust',            ref:'177234',          price:6500  },
    { brand:'Rolex', model:'Lady Datejust',            ref:'6917',            price:8500  },
    { brand:'Rolex', model:'Lady Datejust',            ref:'69178',           price:6000  },
    { brand:'Rolex', model:'Lady Datejust MOP Diamants',ref:'179161',         price:6500  },
    { brand:'Rolex', model:'Turn-O-Graph 36',          ref:'116264',          price:7500  },
    { brand:'Rolex', model:'Explorer II',              ref:'226570',          price:9500  },
    { brand:'Rolex', model:'Yacht-Master',             ref:'326935',          price:35000 },
    { brand:'Rolex', model:'Oyster Perpetual 41 Red',  ref:'124300',          price:14500 },
    { brand:'Audemars Piguet', model:'Royal Oak Chronographe 41 Blue', ref:'26240ST',   price:58500 },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore',             ref:'26325TS',   price:34000 },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore',             ref:'25940SK',   price:17500 },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore Lady Diamants',ref:'26048SK',  price:22500 },
    { brand:'Patek Philippe',  model:'Nautilus Chronographe',          ref:'5980-1A',   price:85000  },
    { brand:'Patek Philippe',  model:'Nautilus Travel Time',           ref:'5990/1R',   price:239000 },
    { brand:'Patek Philippe',  model:'Annual Calendar',                ref:'5726-001',  price:110000 },
    { brand:'Patek Philippe',  model:'Complications',                  ref:'7010R/011', price:53000  },
    { brand:'Richard Mille',   model:'RM 65-01',                       ref:'RM65-01',   price:235000 },
    { brand:'Cartier',         model:'Juste un Clou',                  ref:'WJBA0042',  price:24000  },
  ];

  // ─── Context tracking ─────────────────────────────────────────────────────────
  const ctx = { brand: null, model: null, lastEntry: null };

  // ─── UPGRADE: Conversation memory ─────────────────────────────────────────
  // Tracks last 10 exchanges for multi-turn intelligence
  const memory = {
    history: [],          // [{role:'user'|'bot', text:'...', entry:'kb-id', ts:Date.now()}]
    topics: new Set(),    // unique KB entry IDs discussed this session
    phase: 'greeting',    // greeting → browsing → interested → converting
    turnCount: 0,
    questionsAsked: 0,    // how many questions the user has asked

    push(role, text, entryId) {
      this.history.push({ role, text: text.slice(0, 200), entry: entryId || null, ts: Date.now() });
      if (this.history.length > 20) this.history.shift();
      if (role === 'user') { this.turnCount++; this.questionsAsked++; }
      if (entryId) this.topics.add(entryId);
      // Phase transitions
      if (this.turnCount >= 1 && this.phase === 'greeting') this.phase = 'browsing';
      if (this.turnCount >= 3 && this.topics.size >= 2 && this.phase !== 'converting') this.phase = 'interested';
      if (this.topics.has('sell') || this.topics.has('buy') || this.topics.has('sourcing')) this.phase = 'converting';
    },

    lastUserMsg()  { return [...this.history].reverse().find(h => h.role === 'user'); },
    lastBotEntry() { return [...this.history].reverse().find(h => h.role === 'bot' && h.entry); },
    discussed(id)  { return this.topics.has(id); },

    // Get the last topic for pronoun resolution ("it", "that one", "this watch")
    resolveReference() {
      if (ctx.model) return ctx.model;
      if (ctx.brand) return ctx.brand;
      const last = this.lastBotEntry();
      return last ? last.entry : null;
    }
  };

  // ─── UPGRADE: Synonym expansion map ───────────────────────────────────────
  // Maps natural phrases to KB keywords so users don't need exact terms
  const SYNONYMS = {
    // Price intent
    'how much': 'price', 'what does it cost': 'price', 'pricing': 'price',
    'what is the price': 'price', 'cost': 'price', 'how expensive': 'price',
    'what do you charge': 'price', 'fees': 'price', 'tarif': 'price',
    'combien ça coûte': 'price', 'quel prix': 'price', 'coûte combien': 'price',

    // Hours intent
    'when are you open': 'horaires', 'what time': 'horaires', 'opening time': 'horaires',
    'when can i come': 'horaires', 'when can i visit': 'horaires', 'schedule': 'horaires',
    'are you open now': 'horaires', 'are you open today': 'horaires',
    'are you open on saturday': 'horaires', 'are you open on sunday': 'horaires',
    'quand êtes vous ouvert': 'horaires', 'à quelle heure': 'horaires',

    // Sell intent
    'get rid of my watch': 'vendre', 'cash for my watch': 'vendre',
    'trade in': 'vendre', 'what is my watch worth': 'vendre',
    'how much will you give me': 'vendre', 'sell my': 'vendre',
    'you buy watches': 'vendre', 'do you buy': 'vendre',

    // Location intent
    'where are you': 'adresse', 'how do i get there': 'directions',
    'which metro': 'metro', 'which station': 'metro',
    'closest metro': 'metro', 'nearest metro': 'metro',

    // Service intent
    'my watch is broken': 'révision', 'watch stopped': 'révision',
    'needs fixing': 'révision', 'repair': 'révision',
    'battery': 'révision', 'ma montre ne marche plus': 'révision',
    'montre arrêtée': 'révision', 'en panne': 'révision',

    // Browse intent
    'what do you have': 'stock', 'show me what you have': 'stock',
    'what watches': 'stock', 'your collection': 'collection',
    'what can i buy': 'acheter', "qu'est ce que vous avez": 'stock',

    // Gift intent
    'for my husband': 'cadeau', 'for my wife': 'cadeau',
    'for my dad': 'cadeau', 'for my boyfriend': 'cadeau',
    'for her birthday': 'cadeau', 'for his birthday': 'cadeau',
    'anniversary gift': 'cadeau', 'valentine': 'cadeau',
  };

  // Expand user input with synonym mapping before classification
  function expandSynonyms(text) {
    let expanded = text;
    for (const [phrase, replacement] of Object.entries(SYNONYMS)) {
      if (text.includes(phrase.toLowerCase())) {
        expanded += ' ' + replacement;
      }
    }
    return expanded;
  }

  // ─── UPGRADE: Response variation engine ───────────────────────────────────
  // Multiple phrasings for common responses to avoid repetition
  const VARIATIONS = {
    'greeting': {
      fr: [
        `Bonjour ! Je suis l'assistant **Nos Montres**, spécialiste parisien de l'achat-vente de montres de luxe. Posez-moi votre question.`,
        `Bonjour ! Comment puis-je vous aider — achat, vente, ou renseignement horloger ?`,
        `Bonsoir ! Boutique parisienne de montres de luxe d'occasion. Que puis-je faire pour vous ?`,
        `Bonjour et bienvenue ! Dites-moi ce qui vous intéresse — Rolex, AP, Patek, Cartier…`,
      ],
      en: [
        `Hello! I'm the **Nos Montres** assistant, a Parisian specialist in pre-owned luxury watches. Ask me anything.`,
        `Hello! How can I help — buying, selling, or watch advice?`,
        `Good evening! Parisian luxury watch boutique. What can I do for you?`,
        `Hello and welcome! Tell me what interests you — Rolex, AP, Patek, Cartier…`,
      ]
    },
    'thanks': {
      fr: [`Avec plaisir.`, `Je vous en prie !`, `De rien ! N'hésitez pas si vous avez d'autres questions.`, `Merci à vous ! Je suis là si besoin.`],
      en: [`My pleasure.`, `You're welcome!`, `Happy to help! Let me know if you have other questions.`, `Thanks! I'm here if you need anything else.`]
    },
    'fallback': {
      fr: [
        `Je n'ai pas bien compris. Essayez par exemple :\n• _"Avez-vous des Submariner ?"_\n• _"Je veux vendre ma montre"_\n• _"Quel budget pour une Rolex ?"_\n\n📞 ${BIZ.phone1}`,
        `Hmm, je ne suis pas sûr de comprendre. Posez-moi une question sur nos montres, les prix, la vente, ou l'horlogerie — ou appelez-nous : ${BIZ.phone1}`,
        `Je n'ai pas saisi votre demande. Voici ce que je maîtrise : **stock & prix**, **achat & vente**, **révision**, **conseils horlogers**. Essayez de reformuler ?`,
      ],
      en: [
        `I didn't quite catch that. Try asking:\n• _"Do you have any Submariners?"_\n• _"I want to sell my watch"_\n• _"What budget for a Rolex?"_\n\n📞 ${BIZ.phone1}`,
        `Hmm, I'm not sure I understand. Ask me about our watches, prices, selling, or horology — or call us: ${BIZ.phone1}`,
        `I didn't get that. I can help with: **stock & prices**, **buying & selling**, **servicing**, **watch advice**. Try rephrasing?`,
      ]
    }
  };

  function vary(entryId) {
    const v = VARIATIONS[entryId];
    if (!v) return null;
    const pool = lang() === 'en' ? v.en : v.fr;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ─── UPGRADE: Pronoun & reference resolution ─────────────────────────────
  // Detects "it", "that one", "this watch" etc. and resolves to last discussed item
  const PRONOUNS = /\b(it|that|that one|this one|this watch|that watch|the watch|the one|celle[- ]ci|celle[- ]là|cette montre|la montre|celui[- ]ci|celui[- ]là|ce modèle)\b/i;
  const FOLLOW_UP_SIGNALS = /\b(tell me more|more details|what else|go on|elaborate|continue|en savoir plus|plus de details|dites[- ]m en plus|plus d infos|and|et aussi|also)\b/i;

  function resolvePronouns(text) {
    if (!PRONOUNS.test(text)) return text;
    const ref = memory.resolveReference();
    if (!ref) return text;
    // Inject the reference so the classifier can find it
    return text + ' ' + ref;
  }

  // ─── Levenshtein fuzzy correction ─────────────────────────────────────────────
  function lev(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>j?0:i));
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++) for(let j=1;j<=n;j++){
      const c=a[i-1]===b[j-1]?0:1;
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) dp[i][j]=Math.min(dp[i][j],dp[i-2][j-2]+c);
    }
    return dp[m][n];
  }

  // Build vocab after KB is defined (called lazily)
  let _vocab = null;
  function getVocab() {
    if (_vocab) return _vocab;
    const seen = new Set();
    for (const e of KB) for (const kw of e.kw) kw.split(/\s+/).forEach(w=>{if(w.length>=3)seen.add(w.toLowerCase());});
    return (_vocab = [...seen]);
  }

  function fuzzy(text) {
    return text.replace(/[a-zA-ZÀ-ÿ]{4,}/g, word => {
      const w = word.toLowerCase(), vocab = getVocab();
      if (vocab.includes(w)) return word;
      const maxD = w.length<=5?1:2;
      let best=null, bestD=maxD+1;
      for (const v of vocab) {
        if (Math.abs(v.length-w.length)>maxD) continue;
        const d=lev(w,v);
        if(d<bestD||(d===bestD&&best&&v.length>best.length)){bestD=d;best=v;}
      }
      return best||word;
    });
  }

  // ─── Stock lookup ─────────────────────────────────────────────────────────────
  function stockMatch(text) {
    const t2 = text.toLowerCase().replace(/[\s\-\.]/g,'');
    return STOCK.filter(w =>
      t2.includes(w.ref.toLowerCase().replace(/[\s\-\.]/g,'')) ||
      t2.includes(w.model.toLowerCase().replace(/[\s\-\.]/g,''))
    );
  }

  function fmt(n) { return n.toLocaleString('fr-FR') + ' €'; }

  // ─── KNOWLEDGE BASE (60+ entries · bilingual · short answers) ────────────────
  const KB = [

    // ── CONVERSATIONAL ──────────────────────────────────────────────────────────
    { id:'greeting', kw:['bonjour','bonsoir','salut','allo','hello','hey','coucou','hi','good morning','good evening','good afternoon','yo','hola','good day','howdy','greetings','wassup','whats up','what up','sup','bonne journée','bonne soirée','bonne nuit','good night','bjr','bsr','cc','slt'],
      r:()=>{ ctx.lastEntry='greeting'; return vary('greeting') || t(`Bonjour ! Je suis l'assistant de **Nos Montres**, spécialiste parisien de l'achat-vente de montres de luxe d'occasion. Posez-moi votre question.`,`Hello! I'm the **Nos Montres** assistant, a Parisian specialist in pre-owned luxury watches. Ask me anything.`); } },

    { id:'thanks', kw:['merci','thank you','thanks','parfait','excellent','super','nickel','very helpful','utile','cheers','perfect','génial','bravo','awesome','great','fantastic','wonderful','amazing','terrific','magnifique','formidable','impeccable','top','chapeau','bien joué','well done','appreciated','noted','understood','compris','reçu','ok merci','thanks a lot','merci beaucoup','thank you so much','merci infiniment','many thanks','much appreciated','very kind','très aimable'],
      r:()=>t(`Avec plaisir.`,`My pleasure.`) },

    { id:'help', kw:['aide','help','que faites vous','what do you do','vos services','what can you do','que proposez vous','comment ça marche','how does it work','what do you sell','what do you offer','what can i ask','what topics','tell me about you','qui êtes vous','about you','how can you help','comment pouvez vous aider','what are you','qui es tu','how do i use this','what questions','quelles questions','what can i ask you','quest ce que vous faites','quest ce que vous vendez','what services do you provide','can you help me','can you assist','pouvez vous m aider','assistance','information','renseignements'],
      r:()=>t(`Nos Montres achète et vend des montres de luxe d'occasion à Paris. Posez-moi n'importe quelle question sur : nos montres en stock, les prix, la vente de votre montre, les révisions, les marques (Rolex, AP, Patek, RM, Cartier…), ou l'horlogerie en général.`,
              `Nos Montres buys and sells pre-owned luxury watches in Paris. Ask me anything about: our watches in stock, prices, selling your watch, servicing, brands (Rolex, AP, Patek, RM, Cartier…), or horology in general.`) },

    // ── BOUTIQUE ────────────────────────────────────────────────────────────────
    { id:'contact', kw:['contact','téléphone','telephone','phone','email','mail','adresse','address','numéro','number','joindre','reach','coordonnées','whatsapp','instagram','réseaux'],
      r:()=>t(`📍 ${BIZ.addr}\n📞 ${BIZ.phone1} / ${BIZ.phone2}\n✉️ ${BIZ.email}`,
              `📍 ${BIZ.addr}\n📞 ${BIZ.phone1} / ${BIZ.phone2}\n✉️ ${BIZ.email}`) },

    { id:'hours', kw:['horaires','horaire','heures ouverture','open','opening hours','fermé','closed','disponible','availability','quand êtes vous','when are you','êtes vous ouverts','are you open','samedi','dimanche','weekend','saturday','sunday','7 jours','7 days','are you open today','êtes vous ouverts aujourd hui','opening time','closing time','heure ouverture','heure fermeture','when do you open','when do you close','quand ouvrez vous','quand fermez vous','lundi','mardi','mercredi','jeudi','vendredi','monday','tuesday','wednesday','thursday','friday','du lundi','du mardi','toute la semaine','all week','everyday','tous les jours','open late','open early','what time','à quelle heure','business hours','heures de bureau','shop hours','boutique ouverte','can i visit today','puis je venir aujourd hui','can i come now','puis je venir maintenant'],
      r:()=>t(`Disponibles **7j/7 sur rendez-vous uniquement**.`,`Available **7 days a week, by appointment only**.`) },

    { id:'rdv', kw:['rendez-vous','rendez vous','rdv','appointment','prendre rdv','book appointment','réserver','reserve','prise de rdv','take appointment','fixer rendez vous','schedule meeting','quand puis je venir','when can i come'],
      r:()=>t(`Prenez rendez-vous par téléphone (${BIZ.phone1}), email (${BIZ.email}) ou via notre [formulaire](/prendre-rendez-vous.html).`,
              `Book by phone (${BIZ.phone1}), email (${BIZ.email}) or via our [form](/prendre-rendez-vous.html).`) },

    { id:'location', kw:['miromesnil','paris 8','paris 8ème','paris 8eme','rue de miromesnil','comment venir','how to get','directions','métro','metro','transport','accès','access','où êtes vous','where are you','plan','map','quartier','parking','garer'],
      r:()=>t(`46 rue de Miromesnil, 75008 Paris. Métro **Miromesnil** (lignes 9 & 13), à 2 min à pied.`,
              `46 rue de Miromesnil, 75008 Paris. Metro **Miromesnil** (lines 9 & 13), 2 min walk.`) },

    { id:'about', kw:['qui êtes vous','who are you','à propos','about','votre histoire','your story','depuis quand','experience','expertise','fondé','founded','créé','nos montres','nosmontres','indépendant','independent','15 ans','passion','tell me about','dites moi','about nos montres','about your shop','about your store','about your boutique','what are you','cest quoi nos montres','what is nos montres','your company','votre entreprise','your business','votre commerce','your background','votre parcours','horloger parisien','parisian watchmaker','luxury watch dealer','revendeur montre luxe','watch dealer','watchmaker','horloger','professional','professionnel','certified','certifié','trusted','de confiance','reliable dealer','revendeur fiable','boutique horlogère'],
      r:()=>t(`Boutique horlogère indépendante parisienne, fondée par un passionné avec **plus de 15 ans d'expertise** en montres de luxe de seconde main.`,
              `Independent Parisian watch boutique, founded by an expert with **over 15 years of expertise** in pre-owned luxury watches.`) },

    { id:'authentication', kw:['authentique','authentification','fake','faux','contrefaçon','counterfeit','certifié','garantie','guarantee','confiance','trust','vérification','verification','expertisé','original','provenance','comment savez vous','how do you know','comment vérifiez','is it real','est elle vraie','is it genuine','genuine','authentic','legit','legitimate','checked','verified','expert check','expert opinion','how do you verify','how do you authenticate','comment authentifier','how can i be sure','puis je avoir confiance','can i trust','safe to buy','sûr d acheter','not fake','not counterfeit','pas une copie','not a copy','not a replica','real rolex','real ap','real patek','real watch','vraie montre','montre certifiée'],
      r:()=>t(`Chaque montre est expertisée avant vente : mouvement, finitions, numéro de série, couronne, verre. Si un doute subsiste, nous n'achetons pas.`,
              `Every watch is authenticated before sale: movement, finishes, serial number, crown, crystal. If there's any doubt, we don't buy.`) },

    { id:'delivery', kw:['livraison','livrer','livrez','delivery','deliver','shipping','expédition','envoyer','ship','france','international','colissimo','chronopost','assurance','insured','délai','how long to receive','combien de temps'],
      r:()=>t(`Livraison sécurisée et assurée en France (48-72h) et à l'international. Contactez-nous pour un devis.`,
              `Secure insured delivery in France (48-72h) and internationally. Contact us for a quote.`) },

    { id:'payment', kw:['paiement','payer','payment','pay','virement','wire transfer','carte','card','espèces','cash','crypto','bitcoin','comment payer','how to pay','modes de paiement','payment methods'],
      r:()=>t(`Virement bancaire, espèces (dans la limite légale) et carte bancaire.`,
              `Bank transfer, cash (within the legal limit) and bank card.`) },

    // ── BUYING & SELLING ────────────────────────────────────────────────────────
    { id:'buy', kw:['acheter','acheter une montre','buy','buy a watch','purchase','acquérir','je veux acheter','i want to buy','looking to buy','trouver une montre','find a watch','en stock','in stock','votre collection','i want a watch','comment acheter','how to buy','i am looking','i need a watch','il me faut','j aimerais','i would like','interested in buying','want to purchase','want to buy','wanna buy','je souhaite acheter','je veux une montre','searching for','find me a watch','do you carry','do you stock','show me','montrez moi','what watches','what models','quels modèles'],
      r:()=>t(`Consultez notre [collection](/index.html) ou dites-moi exactement ce que vous cherchez — nous avons souvent des pièces hors vitrine.`,
              `Browse our [collection](/index.html) or tell me exactly what you're looking for — we often have off-display pieces.`) },

    // ── RECOMMENDATION / BEST WATCH ──────────────────────────────────────────────
    { id:'recommendation', kw:['best watch','top watch','best model','top model','recommend','recommendation','recommended','suggest','suggestion','popular','most popular','most wanted','favorite','favourite','what watch','which watch','what should i get','what should i buy','help me choose','aide au choix','guide achat','buying guide','meilleure montre','la meilleure','what would you suggest','what do you suggest','your opinion','votre avis','what is good','what is great','quelle est la meilleure','quelle montre choisir','which is better','which is best','what is worth','worth buying','worth it','vaut le coup','what to buy','quoi acheter','conseils','advice','advise','guide moi','guide me','help me decide','aide moi à choisir','what is your best','your best','show me your best','best value','best bang for buck','best investment','meilleur rapport qualité','best quality','top quality'],
      r:()=>{ const topStock = STOCK.slice(0,4); return t(
        `Nos pièces les plus recherchées en ce moment :\n${topStock.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDites-moi votre budget pour des recommandations personnalisées.`,
        `Our most sought-after pieces right now:\n${topStock.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nTell me your budget for personalised recommendations.`
      );} },

    // ── CLARIFICATION / CONFUSION ─────────────────────────────────────────────
    { id:'clarify', kw:['what do you mean','je ne comprends pas','i dont understand','dont understand','not sure what','clarify','please clarify','pouvez vous préciser','what are you saying','que voulez vous dire','confused','confusing','i am confused','je suis perdu','perdu','lost','unclear','not clear','i dont follow','i dont get it','can you explain','peut on expliquer','expliquer','explain','repeat','répétez','say again','can you repeat','pouvez vous répéter','i missed that','huh','quoi','pardon','sorry what','comment','what now','ok and','et alors','so what','so what now','what next','what does that mean','ça veut dire quoi','what is that','cest quoi','c est quoi'],
      r:()=>t(
        `Je suis spécialisé en montres de luxe. Je peux vous aider sur : **stock & prix**, **achat & vente**, **révision & réparation**, **authentification**, et **conseils horlogers**. Que voulez-vous savoir ?`,
        `I specialise in luxury watches. I can help with: **stock & prices**, **buying & selling**, **servicing & repair**, **authentication**, and **watch advice**. What would you like to know?`
      ) },

    // ── STOCK OVERVIEW ────────────────────────────────────────────────────────
    { id:'stock_overview', kw:['all watches','all stock','everything','tout','tout le stock','all available','all models','every model','full collection','liste complète','complete list','what do you have in stock','what have you got','what is in stock','whats in stock','quelles montres avez vous','toutes vos montres','montrer tout','show everything','show all','liste des montres','watch list','inventory','inventaire','catalogue','catalog'],
      r:()=>{ const brands = [...new Set(STOCK.map(w=>w.brand))]; return t(
        `Nous avons **${STOCK.length} montres en stock** :\n${brands.map(b=>`• **${b}** — ${STOCK.filter(w=>w.brand===b).length} pièce(s)`).join('\n')}\nDites-moi une marque ou un modèle pour le détail.`,
        `We have **${STOCK.length} watches in stock**:\n${brands.map(b=>`• **${b}** — ${STOCK.filter(w=>w.brand===b).length} piece(s)`).join('\n')}\nTell me a brand or model for details.`
      );} },

    // ── BUDGET TIERS ─────────────────────────────────────────────────────────
    { id:'budget_under10k', kw:['budget 5000','budget 6000','budget 7000','budget 8000','budget 9000','budget 10000','moins de 10000','under 10000','under 10k','moins de 10k','5k','6k','7k','8k','9k','10k budget','autour de 8000','autour de 10000','around 8000','around 10000','between 5000 and 10000','entre 5000 et 10000','first rolex','first watch budget','pas plus de 10000','no more than 10000','10 000','8 000','6 000'],
      r:()=>{ const opts=STOCK.filter(w=>w.price<=10000).slice(0,4); return t(
        `Avec un budget jusqu'à 10 000€, voici nos meilleures options :\n${opts.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`,
        `With a budget up to €10,000, here are our best options:\n${opts.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`
      );} },

    { id:'budget_10k_20k', kw:['budget 11000','budget 12000','budget 13000','budget 14000','budget 15000','budget 16000','budget 17000','budget 18000','budget 19000','budget 20000','entre 10000 et 20000','between 10000 and 20000','10k to 20k','10k 20k','15k','15 000','20 000','autour de 15000','around 15000','under 20000','moins de 20000','moins de 20k','pas plus de 20000','no more than 20000'],
      r:()=>{ const opts=STOCK.filter(w=>w.price>=10000&&w.price<=20000).slice(0,4); return t(
        `Entre 10 000 et 20 000€, voici nos options disponibles :\n${opts.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`,
        `Between €10,000 and €20,000, here are our available options:\n${opts.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`
      );} },

    { id:'budget_20k_50k', kw:['budget 25000','budget 30000','budget 35000','budget 40000','budget 45000','budget 50000','entre 20000 et 50000','between 20000 and 50000','20k to 50k','25k','30k','35k','40k','50k','25 000','30 000','35 000','50 000','autour de 30000','around 30000','under 50000','moins de 50000','no more than 50000'],
      r:()=>{ const opts=STOCK.filter(w=>w.price>=20000&&w.price<=50000).slice(0,4); return t(
        `Entre 20 000 et 50 000€, nos options :\n${opts.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`,
        `Between €20,000 and €50,000, our options:\n${opts.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`
      );} },

    { id:'budget_over50k', kw:['budget 60000','budget 70000','budget 80000','budget 100000','budget 150000','budget 200000','plus de 50000','over 50000','more than 50000','50k plus','100k','100 000','150 000','200 000','high end','haut de gamme','top of the range','premium','luxury budget','no budget','budget illimité','unlimited budget','money no object','price is no object'],
      r:()=>{ const opts=STOCK.filter(w=>w.price>=50000).slice(0,4); return t(
        `Nos pièces premium (50 000€+) :\n${opts.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nPour des pièces hors stock, contactez-nous.`,
        `Our premium pieces (€50,000+):\n${opts.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nFor off-stock pieces, contact us.`
      );} },

    { id:'sell', kw:['vendre','vente','sell','selling','racheter','rachat','buyback','buy back','je veux vendre','i want to sell','vendre ma montre','sell my watch','comment vendre','how to sell','estimation','estimate','évaluation','évaluer','combien pour ma montre','how much for my watch','valeur de ma montre','value of my watch','reprise','je cherche à vendre','vendre rapidement','sell quickly','prix de rachat','i have a watch to sell','j ai une montre à vendre','looking to sell','selling my watch','want to sell','wanna sell','sell watch','cash for watch','how to get cash for','get money for my watch','i want cash','how do i sell','how do you buy','do you buy watches','do you purchase','vous achetez','achetez vous','you buy','buying watches','reprise montre','trade in watch','offre de rachat','rachat immédiat','instant buy','sell today','vendre aujourd hui','interested in selling','selling a rolex','selling my rolex','sell a rolex','sell rolex','sell ap','sell patek','sell cartier','sell richard mille'],
      r:()=>t(`Envoyez-nous des photos (cadran, boîtier, bracelet, fond, couronne) — estimation sous **48h**, paiement immédiat si accord.`,
              `Send us photos (dial, case, bracelet, caseback, crown) — estimate within **48h**, immediate payment if agreed.`) },

    { id:'sell_docs', kw:['papiers','papers','boîte','box','certificat','certificate','document','sans papiers','without papers','perdu les papiers','lost papers','avec boîte','with box','sans boîte','without box','originaux','carte de garantie','warranty card'],
      r:()=>t(`Papiers et boîte non obligatoires, mais augmentent la valeur de **15 à 30%** selon le modèle. Pièce d'identité requise légalement.`,
              `Papers and box not required, but increase value by **15 to 30%** depending on the model. ID required by law.`) },

    { id:'investment', kw:['investissement','investment','invest','valeur','cote','côte','appreciation','revente','resale','meilleure montre investissement','best watch investment','quelle montre investissement','which watch investment','prend de la valeur','gains value','patrimoine','heritage','store of value','valeur refuge','cote augmente','montre qui prend de la valeur','watch that appreciates','which watch holds value','watch that holds value','watch value over time','valeur dans le temps','will it keep its value','garde sa valeur','bonne affaire','good deal','good investment','smart buy','wise purchase','worth investing','vaut l investissement','should i invest','is it a good investment','do watches appreciate','les montres prennent elles de la valeur','better than stocks','mieux que la bourse','safe investment','investissement sûr','alternative investment','placement','patrimoine horloger'],
      r:()=>t(`Les meilleures valeurs actuelles : Rolex Daytona acier, AP Royal Oak 15500ST & Jumbo 15202ST, Patek Nautilus 5711 (discontinuée 2021), Patek Grand Complications.`,
              `The best current values: Rolex Daytona steel, AP Royal Oak 15500ST & Jumbo 15202ST, Patek Nautilus 5711 (discontinued 2021), Patek Grand Complications.`) },

    { id:'budget', kw:['budget','combien dépenser','how much to spend','meilleure montre pour','best watch for','quel modèle choisir','which model','pas cher','affordable','entrée de gamme','entry level','10000','15000','20000','25000','30000','50000','5000','8000','under','moins de','below','autour de','around','environ','premier achat','first luxury watch','quelle montre','which watch','aide au choix'],
      r:()=>t(`Donnez-moi votre budget précis, je vous oriente vers les meilleures options disponibles.`,
              `Give me your exact budget and I'll point you to the best available options.`) },

    { id:'woman_watch', kw:['femme','woman','women','lady','ladies','montre femme','watch for women','cadeau femme','gift for women','pour ma femme','for my wife','for my girlfriend','pour ma copine','pour ma mère','for my mother','petite taille','small size','36mm','32mm','28mm','féminin'],
      r:()=>t(`Lady-Datejust (28mm), Datejust 36, Cartier Tank, Cartier Panthère, Patek Twenty-4, AP Royal Oak Lady (33mm). Dites-moi votre budget.`,
              `Lady-Datejust (28mm), Datejust 36, Cartier Tank, Cartier Panthère, Patek Twenty-4, AP Royal Oak Lady (33mm). Tell me your budget.`) },

    { id:'gift', kw:['cadeau','gift','offrir','offer','surprise','anniversaire','birthday','noël','christmas','fête','celebration','pour offrir','to gift','idée cadeau','gift idea','pour quelqu un','for someone','present','cadeaux','gift for him','gift for her','cadeau pour lui','cadeau pour elle','cadeau pour mon mari','cadeau pour ma femme','cadeau pour mon copain','cadeau pour ma copine','gift for husband','gift for wife','gift for boyfriend','gift for girlfriend','gift for dad','gift for mom','cadeau pour papa','cadeau pour maman','gift for friend','cadeau pour ami','special occasion','occasion spéciale','graduation','diplôme','mariage','wedding','naissance','birth','promotion','anniversaire de mariage','wedding anniversary','fête des pères','fathers day','fête des mères','mothers day','saint valentin','valentines day','cadeau original','unique gift','luxury gift','cadeau luxe','expensive gift','cadeau cher','meaningful gift','cadeau qui a du sens','memorable gift','montre cadeau'],
      r:()=>t(`Quelle est la relation (homme/femme, son style) et votre budget ? Je vous propose les meilleures options.`,
              `What's the relationship (man/woman, their style) and your budget? I'll suggest the best options.`) },

    { id:'sourcing', kw:['chercher','trouver','find','search','commande spéciale','special order','liste d attente','waiting list','sourcing','difficile à trouver','hard to find','rare','introuvable','hors catalogue','hors inventaire','off inventory','looking specifically','vous pouvez trouver','can you find'],
      r:()=>t(`Si vous ne la voyez pas en ligne, contactez-nous — nous sourçons via notre réseau de marchands et collectionneurs européens.`,
              `If you don't see it online, contact us — we source through our network of European dealers and private collectors.`) },


    // ── ROLEX — GÉNÉRAL ─────────────────────────────────────────────────────────
    // ── QUICK INVENTORY QUESTIONS ─────────────────────────────────────────────────
    { id:'most_expensive', kw:['most expensive','plus cher','plus onéreux','highest price','prix le plus élevé','most costly','expensive watch','montre la plus chère','top price','le plus cher','what is your most expensive','quelle est votre plus chère','luxury top','ultimate piece','flagship piece','pièce phare','crown jewel','pièce maîtresse'],
      r:()=>{ const top=STOCK.slice().sort((a,b)=>b.price-a.price)[0]; return t(
        `Notre pièce la plus chère en stock : **${top.brand} ${top.model}** réf. ${top.ref} à ${fmt(top.price)}.`,
        `Our most expensive piece in stock: **${top.brand} ${top.model}** ref. ${top.ref} at ${fmt(top.price)}.`
      );} },

    { id:'cheapest', kw:['cheapest','least expensive','pas cher','moins cher','most affordable','prix le plus bas','lowest price','entry price','prix d entrée','starting price','prix de départ','minimum price','minimum budget','smallest budget','smallest price','what is cheapest','le moins cher','budget minimum','what can i get for','que puis je avoir pour','starter piece'],
      r:()=>{ const bot=STOCK.slice().sort((a,b)=>a.price-b.price)[0]; return t(
        `Notre pièce la plus accessible en stock : **${bot.brand} ${bot.model}** réf. ${bot.ref} à ${fmt(bot.price)}.`,
        `Our most accessible piece in stock: **${bot.brand} ${bot.model}** ref. ${bot.ref} at ${fmt(bot.price)}.`
      );} },

    { id:'most_popular', kw:['most popular','plus populaire','best seller','bestseller','best selling','most sold','le plus vendu','most bought','most requested','most wanted','le plus demandé','trending','en vogue','popular now','populaire maintenant','what sells most','qu est ce qui se vend le mieux','hot model','hot watch','hot piece','en ce moment','right now'],
      r:()=>t(
        `Nos modèles les plus demandés en ce moment : Rolex Submariner Hulk 126610LV, GMT-Master II Sprite 126710GRNR, AP Royal Oak Chronographe 26240ST, Patek Nautilus 5980-1A. Vous en voulez un ?`,
        `Our most requested models right now: Rolex Submariner Hulk 126610LV, GMT-Master II Sprite 126710GRNR, AP Royal Oak Chronographe 26240ST, Patek Nautilus 5980-1A. Interested in one?`
      ) },

    { id:'new_arrivals', kw:['new arrivals','nouveautés','nouvelles arrivées','new stock','nouveau stock','just arrived','vient d arriver','recently added','ajouté récemment','new in','new watches','nouvelles montres','latest pieces','dernières pièces','fresh stock','what is new','quoi de neuf','anything new','du nouveau','recent additions','ajouts récents'],
      r:()=>t(
        `Notre stock est mis à jour régulièrement. Pour voir les dernières arrivées en primeur, suivez-nous sur Instagram ou consultez notre [collection](/index.html). Vous pouvez aussi nous appeler au ${BIZ.phone1}.`,
        `Our stock is updated regularly. To see the latest arrivals first, follow us on Instagram or check our [collection](/index.html). You can also call us on ${BIZ.phone1}.`
      ) },

    { id:'rolex_general', kw:['rolex','rolex paris','couronne d or','crown logo','achat rolex','vente rolex','montre rolex','rolex occasion','rolex secondhand','rolex pre-owned','rolex luxe','marque rolex','histoire rolex','rolex histoire','rolex fondé','rolex 1905','hans wilsdorf','rolex suisse','rolex certifié','rolex watch','rolex watches','rolex models','rolex collection','what rolex','which rolex','rolex available','rolex in stock','rolex you have','rolex do you have','got any rolex','avez vous des rolex','rolex pas cher','cheap rolex','affordable rolex','rolex brand','the rolex','a rolex','rolex dealer','revendeur rolex','buy rolex','acheter rolex','rolex paris 8','rolex 75008'],
      r:()=>{ ctx.brand='Rolex'; const s=STOCK.filter(w=>w.brand==='Rolex'); return t(
        `Rolex, fondée en 1905 à Londres par Hans Wilsdorf, est la marque horlogère la plus reconnue au monde. Manufacture intégrée à Genève, inventeur de l'Oyster (premier boîtier étanche, 1926), du rotor Perpetual (1931) et du Datejust (premier affichage date, 1945). Calibres exclusivement manufacture, certifiés Chronomètre Superlatif (-2/+2 sec/jour). Acier 904L (plus résistant que le 316L standard). Nous avons ${s.length} Rolex en stock :\n${s.slice(0,8).map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n${s.length>8?'...et plus. ':''}Dites-moi quel modèle vous intéresse !`,
        `Rolex, founded 1905 in London by Hans Wilsdorf, is the world's most recognised watch brand. Integrated manufacture in Geneva, inventor of the Oyster (first waterproof case, 1926), the Perpetual rotor (1931) and the Datejust (first date display, 1945). Exclusively manufacture calibres, Superlative Chronometer certified (-2/+2 sec/day). 904L steel (more resistant than standard 316L). We have ${s.length} Rolex in stock:\n${s.slice(0,8).map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n${s.length>8?'...and more. ':''}Tell me which model interests you!`
      );} },

    { id:'rolex_submariner', kw:['submariner','sub','126610','116613','16800','submariner date','submariner no date','plongée','diving watch','diver','sousmarin','sous marin','116610','sub date','subno','ref 126610','ref 116613','acier or submariner','rolex submariner','rolex sub','the submariner','a submariner','submariner rolex','submariner watch','submariner model','submariner price','submariner cost','submariner available','tell me about submariner','parlez moi du submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('submariner')); return t(
        `Le Submariner, lancé en 1953, est LA montre de plongée par excellence. Première montre étanche à 100m (aujourd'hui 300m). Lunette tournante unidirectionnelle céramique Cerachrom (depuis 2010), verre saphir, couronne Triplock. Génération actuelle : boîtier Oyster 41mm (avant 2020 : 40mm), calibre 3235 (70h réserve de marche), bracelet Oyster + Glidelock.\n\nNos Submariner en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nLe Submariner est le modèle Rolex le plus iconique avec le Daytona. Forte valeur de revente. Quel Submariner vous intéresse ?`,
        `The Submariner, launched 1953, is THE quintessential dive watch. First watch water-resistant to 100m (now 300m). Unidirectional rotating Cerachrom ceramic bezel (since 2010), sapphire crystal, Triplock crown. Current generation: 41mm Oyster case (pre-2020: 40mm), calibre 3235 (70h power reserve), Oyster bracelet + Glidelock.\n\nOur Submariners in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nThe Submariner is the most iconic Rolex alongside the Daytona. Strong resale value. Which Submariner interests you?`
      );} },

    { id:'rolex_daytona', kw:['daytona','rolex daytona','cosmograph','paul newman','chronographe rolex','126500','126505','or rose daytona','steel daytona','daytona acier','daytona gold','daytona noir','daytona cadran','ref 126500','ref 126505','116500','116520','116503','tell me about daytona','parlez moi du daytona'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('daytona')); return t(
        `Le **Cosmograph Daytona**, lancé en 1963, est le chronographe le plus iconique de l'horlogerie. Nommé d'après le circuit de Daytona Beach, Floride. La montre de Paul Newman (vendu 17,8M$ aux enchères en 2017). Boîtier Oyster 40mm, lunette tachymétrique, calibre manufacture 4131 (72h réserve). Étanche 100m.\n\nVariantes : acier (réf. 126500LN, le plus convoité), or rose (réf. 126505), platine (réf. 126506 cadran météorite), acier/or "Rolesor" (réf. 126503).\n\nNos Daytona en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nLa Daytona est LA valeur refuge Rolex — forte demande, longues listes d'attente.`,
        `The **Cosmograph Daytona**, launched 1963, is horology's most iconic chronograph. Named after the Daytona Beach circuit, Florida. Paul Newman's watch (sold for $17.8M at auction in 2017). 40mm Oyster case, tachymeter bezel, manufacture calibre 4131 (72h reserve). 100m water resistant.\n\nVariants: steel (ref. 126500LN, most coveted), rose gold (ref. 126505), platinum (ref. 126506 meteorite dial), steel/gold "Rolesor" (ref. 126503).\n\nOur Daytonas in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nThe Daytona is THE Rolex safe-haven investment — high demand, long waitlists.`
      );} },

    { id:'rolex_gmt', kw:['gmt','gmt master','gmt-master','gmt ii','rolex gmt','116710','126710','pepsi','batman','sprite','jubilée gmt','gmt bicolore','gmt rouge bleu','gmt 2 fuseaux','deux fuseaux','second timezone','gmt master ii black','gmt master ii sprite','gmt vintage','16710','gmt acier','tell me about gmt','parlez moi du gmt'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('gmt')); return t(
        `Le **GMT-Master II** est la montre de voyage par excellence, conçue initialement en 1955 pour les pilotes Pan Am. Permet de lire simultanément 2 fuseaux horaires grâce à l'aiguille 24h et la lunette tournante bidirectionnelle.\n\nGénération actuelle (2018+) : boîtier Oyster 40mm, lunette Cerachrom bicolore en une seule pièce de céramique, calibre 3285 (70h réserve). Surnoms célèbres : **Pepsi** (rouge/bleu, réf. 126710BLRO), **Batman** (noir/bleu, réf. 126710BLNR), **Sprite** (vert/noir, réf. 126720VTNR couronne à gauche).\n\nNos GMT en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nModèle polyvalent, porté aussi bien en voyage qu'au quotidien.`,
        `The **GMT-Master II** is the ultimate travel watch, originally designed in 1955 for Pan Am pilots. Allows reading 2 time zones simultaneously via the 24h hand and bidirectional rotating bezel.\n\nCurrent generation (2018+): 40mm Oyster case, two-colour Cerachrom bezel in a single ceramic piece, calibre 3285 (70h reserve). Famous nicknames: **Pepsi** (red/blue, ref. 126710BLRO), **Batman** (black/blue, ref. 126710BLNR), **Sprite** (green/black, ref. 126720VTNR left-hand crown).\n\nOur GMTs in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nVersatile model, worn for travel and daily wear alike.`
      );} },


    { id:'rolex_datejust', kw:['datejust','rolex datejust','date just','126334','126300','16234','datejust 41','datejust 36','wimbledon','mint','jubilé','jubilee','oyster bracelet','rolesor','datejust acier','datejust or','datejust cadran','fluted bezel','cannelée','datejust vintage','ref 126334','ref 126300','datejust homme','men datejust','tell me about datejust','parlez moi du datejust'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('datejust')&&!w.model.toLowerCase().includes('lady')); return t(
        `Le **Datejust**, lancé en 1945, est le pilier de la gamme Rolex — première montre-bracelet automatique avec affichage de la date par guichet. C'est la montre la plus polyvalente de la marque : aussi à l'aise avec un costume qu'en casual.\n\n**Tailles** : 36mm (classique) et 41mm (moderne). **Lunettes** : lisse, cannelée (or blanc), diamants. **Bracelets** : Oyster (sportif) ou Jubilee (élégant). **Cadrans** : +30 options (bleu, noir, ardoise, vert "Mint", Wimbledon slate/vert).\n\nCalibre 3235 (70h réserve), étanche 100m, certifié Chronomètre Superlatif.\n\nNos Datejust en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nLe Datejust est la porte d'entrée idéale dans l'univers Rolex.`,
        `The **Datejust**, launched 1945, is the cornerstone of the Rolex range — the first automatic wristwatch with a date display window. It's the brand's most versatile watch: equally at home with a suit or casual wear.\n\n**Sizes**: 36mm (classic) and 41mm (modern). **Bezels**: smooth, fluted (white gold), diamond-set. **Bracelets**: Oyster (sporty) or Jubilee (elegant). **Dials**: 30+ options (blue, black, slate, green "Mint", Wimbledon slate/green).\n\nCalibre 3235 (70h reserve), 100m water resistant, Superlative Chronometer certified.\n\nOur Datejusts in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nThe Datejust is the ideal entry point into the Rolex universe.`
      );} },

    { id:'rolex_lady_datejust', kw:['lady datejust','lady','179161','177234','6917','69178','datejust femme','women rolex','rolex femme','rolex lady','cadran mop','mop','diamants','diamonds','petite rolex','small rolex','28mm rolex','26mm rolex','lady-datejust'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Lady Datejust'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('lady')); return t(
        `Nos Lady-Datejust :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDisponibles en 26mm (vintage) ou 28mm (actuel). Cadrans nacre ou diamants disponibles.`,
        `Our Lady-Datejusts:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nAvailable in 26mm (vintage) or 28mm (current). MOP or diamond dials available.`
      );} },

    { id:'rolex_explorer', kw:['explorer','explorer ii','226570','216570','214270','114270','explorer 2','explorer ii blanc','orange hand','alpiniste','explorateur','montagne','mountain','exploration','safari dial','ref 226570','rolex explorer','tell me about explorer','parlez moi de l explorer','explorer rolex','explorer watch','explorer 1','explorer i','124270','rolex explorer ii'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('explorer')); return t(
        `L'**Explorer**, lancé en 1953, commémore l'ascension de l'Everest par Edmund Hillary et Tenzing Norgay avec une Rolex au poignet. C'est la quintessence de la montre d'aventure.\n\n**Explorer I** (réf. 124270) : 36mm, cadran noir 3-6-9, calibre 3230 (70h), 100m. La Rolex la plus épurée — zéro complication, lisibilité maximale. Marché ~7 000–8 000€.\n\n**Explorer II** (réf. 226570) : 42mm, aiguille 24h orange indépendante (AM/PM), cadran blanc ou noir, calibre 3285 (70h), 100m. Conçue pour les spéléologues et explorateurs polaires.\n\n${s.length?`Nos Explorer en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`:'Contactez-nous pour disponibilité.'}\n\nL'Explorer est la Rolex la plus discrète et sous-estimée — parfaite pour un quotidien sans frime.`,
        `The **Explorer**, launched 1953, commemorates Edmund Hillary and Tenzing Norgay's Everest ascent wearing a Rolex. It is the quintessential adventure watch.\n\n**Explorer I** (ref. 124270): 36mm, black 3-6-9 dial, calibre 3230 (70h), 100m. The purest Rolex — zero complications, maximum legibility. Market ~€7,000–8,000.\n\n**Explorer II** (ref. 226570): 42mm, independent orange 24h hand (AM/PM), white or black dial, calibre 3285 (70h), 100m. Designed for speleologists and polar explorers.\n\n${s.length?`Our Explorers in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`:'Contact us for availability.'}\n\nThe Explorer is the most discreet and underrated Rolex — perfect for understated daily wear.`
      );} },

    { id:'rolex_yacht_master', kw:['yacht master','yachtmaster','yacht-master','326935','226659','116622','116655','226655','oysterflex','everose','palladium','platine','rolex voile','nautical rolex','yacht','bateau','boat','326935'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('yacht')); return t(
        `Nos Yacht-Master :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nBracelet Oysterflex, boîtier RLX Titanium, lunette plateau. Le Rolex sportif le plus exclusif.`,
        `Our Yacht-Masters:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nOysterflex bracelet, RLX titanium case, matte bezel. The most exclusive sporty Rolex.`
      );} },


    { id:'rolex_oyster_perpetual', kw:['oyster perpetual','op','124300','124340','124310','op 41','op 36','op 41 rouge','red dial','couleur dial','lac candy','candy color','126000','ref 124300','oyster perpetual red','oyster perpetual coral','rolex oyster perpetual','tell me about oyster perpetual','rolex op'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Oyster Perpetual'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('oyster')); return t(
        `L'**Oyster Perpetual**, la Rolex la plus classique — l'essence même de la marque. Successeur direct de l'Oyster originale de 1926.\n\n**OP 41** (réf. 124300) : 41mm, cadrans couleurs vives (rouge corail, turquoise, vert, jaune — très convoités). Cal. 3230 (70h réserve), 100m. Les cadrans "Stella" colorés ont explosé en valeur en 2020-2021 — le rouge et le turquoise se vendent bien au-dessus du retail.\n\n**OP 36** (réf. 126000) : 36mm, même calibre, taille classique.\n\nPas de date, pas de complication — juste l'heure, dans un boîtier Oyster pur. Lunette lisse bombée. C'est la Rolex la plus accessible ET celle qui a vu la plus forte appréciation récente.\n\n${s.length?`Nos OP en stock :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`:'Contactez-nous.'}`,
        `The **Oyster Perpetual**, the most classic Rolex — the very essence of the brand. Direct successor to the original 1926 Oyster.\n\n**OP 41** (ref. 124300): 41mm, vibrant coloured dials (coral red, turquoise, green, yellow — highly coveted). Cal. 3230 (70h reserve), 100m. The "Stella" coloured dials exploded in value in 2020-2021 — red and turquoise sell well above retail.\n\n**OP 36** (ref. 126000): 36mm, same calibre, classic size.\n\nNo date, no complication — just the time, in a pure Oyster case. Smooth domed bezel. It's the most accessible Rolex AND the one that saw the strongest recent appreciation.\n\n${s.length?`Our OPs in stock:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}`:'Contact us.'}`
      );} },

    { id:'rolex_turn_o_graph', kw:['turn-o-graph','turno','116264','thunderbird','turn o graph','réf 116264','rolex vintage acier','rolex bicolore acier','datejust lunette tournante','rotating bezel datejust','rolex collector','rolex rare'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Turn-O-Graph'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('turn')); return t(
        `Nos Turn-O-Graph :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nPremier Rolex à lunette tournante (1953). Pièce collector rare, boîtier 36mm, lunette cannelée.`,
        `Our Turn-O-Graphs:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nFirst Rolex with rotating bezel (1953). Rare collector piece, 36mm case, fluted bezel.`
      );} },

    { id:'rolex_day_date', kw:['day-date','day date','daydate','président','president bracelet','118235','228235','228238','228206','platine rolex','oro rolex','rolex or jaune','rolex or rose','rolex president','chefs d etat','head of state','rolex or massif','solid gold','36mm or','40mm or'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Le Day-Date existe en or jaune, or rose ou platine (jamais en acier). Affiched du jour en toutes lettres et date. Nous pouvons en sourcer — contactez-nous avec votre budget.`,
        `The Day-Date comes in yellow gold, rose gold or platinum (never steel). Displays day in full and date. We can source one — contact us with your budget.`
      );} },

    { id:'rolex_sea_dweller', kw:['sea-dweller','sea dweller','seadweller','126600','116600','deepsea','deep sea','126660','d-blue','d blue','plongée professionnelle','helium escape','1220m','3900m','pro diver','montre plongée pro'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Nous ne stockons pas de Sea-Dweller en ce moment, mais pouvons en sourcer. Sea-Dweller 43mm (réf. 126600, ~14 000€ marché) ou Deepsea 44mm (réf. 126660, ~16 000€). Contactez-nous.`,
        `No Sea-Dweller in stock currently, but we can source one. Sea-Dweller 43mm (ref. 126600, ~€14,000 market) or Deepsea 44mm (ref. 126660, ~€16,000). Contact us.`
      );} },

    { id:'rolex_milgauss', kw:['milgauss','116400','116400gv','verre vert','green glass','anti-magnétique','antimagnétique','antimagnetic','ingénieur','engineer','cern','1000 gauss','cadran Z-Blue','z blue','zblue','aiguille foudre','lightning bolt'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Le Milgauss (réf. 116400GV, verre vert anti-reflet) résiste à 1 000 gauss. Marché environ 13 000–15 000€. Pas en stock actuellement — contactez-nous pour sourcing.`,
        `The Milgauss (ref. 116400GV, green anti-reflective crystal) resists 1,000 gauss. Market ~€13,000–15,000. Not in stock now — contact us to source one.`
      );} },

    { id:'rolex_sky_dweller', kw:['sky-dweller','sky dweller','326934','326938','326939','annuel calendrier rolex','annual calendar rolex','double timezone rolex','saros','flechette','festive','sky dweller acier','sky dweller or'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Sky-Dweller : calendrier annuel + 2e fuseau. Réf. 326934 (acier/or, ~30 000€). Pas en stock en ce moment. Contactez-nous pour sourcing.`,
        `Sky-Dweller: annual calendar + 2nd time zone. Ref. 326934 (steel/gold, ~€30,000). Not in stock currently. Contact us to source one.`
      );} },

    { id:'rolex_air_king', kw:['air-king','air king','airking','126900','116900','rolex air king','rolex air-king','air king 40','air king green','air king cadran','air king dial','air king black','air king rolex','réf 126900','ref 126900','new air king','air king 2022','air king couronne','air king crown guard'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `L'Air-King (réf. 126900, 40mm) est la Rolex d'aviation. Cadran noir distinctif, chiffres 3-6-9 colorés, couronne protégée. Calibre 3230, 70h de réserve. Marché ~8 000–10 000€. Contactez-nous pour sourcing.`,
        `The Air-King (ref. 126900, 40mm) is Rolex's aviation watch. Distinctive black dial, coloured 3-6-9 numerals, crown guard. Cal. 3230, 70h reserve. Market ~€8,000–10,000. Contact us to source.`
      );} },

    { id:'rolex_cellini', kw:['cellini','rolex cellini','50505','50509','50515','50519','50525','50535','cellini moonphase','cellini date','cellini time','cellini dual time','rolex dress','rolex habillée','rolex classique','rolex formal','cellini or','cellini gold','cellini prince','cellini danaos','cellini cestello'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `La Cellini est la ligne habillée de Rolex. Boîtier or 39mm, cadran classique. Moonphase (réf. 50535), Date (réf. 50519), Time (réf. 50509). Marché 15 000–25 000€. Nous pouvons sourcer.`,
        `Cellini is Rolex's dress line. 39mm gold case, classic dial. Moonphase (ref. 50535), Date (ref. 50519), Time (ref. 50509). Market €15,000–25,000. We can source.`
      );} },

    { id:'rolex_pearlmaster', kw:['pearlmaster','pearl master','rolex pearlmaster','86349','81319','86348','81349','86285','pearlmaster 39','pearlmaster 34','pearlmaster diamants','pearlmaster diamonds','pearlmaster or','pearlmaster gold','rolex bijou','jewel rolex','gem set rolex','rolex sertie','haute joaillerie rolex'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Le Pearlmaster est la montre joaillerie de Rolex. Boîtier 39mm ou 34mm, lunette sertie diamants/pierres, or massif. Marché 30 000–80 000€+ selon sertissage. Pièce rare — contactez-nous.`,
        `The Pearlmaster is Rolex's jewellery watch. 39mm or 34mm case, gem-set bezel, solid gold. Market €30,000–80,000+ depending on setting. Rare piece — contact us.`
      );} },



    // ── AUDEMARS PIGUET ──────────────────────────────────────────────────────────
    
// ═══ ROLEX EXPANDED REFERENCES ═══════════════════════════════════════

// SUBMARINER FAMILY — Iconic diving instrument, since 1953
{ id:'rolex_124060', kw:['124060','submariner no date','submariner nodate 41','rolex submariner no date','rolex 124060','ref 124060','submariner sans date'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner No-Date 41mm'; return t(
    `**Rolex Submariner réf. 124060** — Le Submariner moderne sans date. Boîtier 41mm acier Oystersteel, lunette unidirectionnelle céramique noire, verre Cyclope bombé. Mouvement Perpetual Rotor, Chronometer certifié COSC, remontage automatique 3230 (70h, 15/20 Hz). Étanchéité 300m (1000ft), bracelet Oyster 3-mailles. Lancé en 2020, ce modèle remplace la légende 114060 avec technologie à la pointe. Réf. actuelle, très demandée par les collectionneurs de Submariner pur (sans date). Les forums horlogers la classent parmi les meilleurs rapports qualité-prix des sports Rolex.`,
    `**Rolex Submariner ref. 124060** — The modern no-date Submariner. 41mm Oystersteel case, unidirectional ceramic black bezel, domed cyclops crystal. Perpetual rotor, COSC-certified chronometer, automatic 3230 movement (70h, 15/20 Hz). 300m water resistance, 3-link Oyster bracelet. Introduced 2020, replacing the legendary 114060 with state-of-the-art tech. Current reference, highly sought by pure Submariner collectors. Watch forums rank it among the best value in sports Rolex.`
  );} },

{ id:'rolex_116610ln', kw:['116610ln','submariner black 40','submariner date 40mm','rolex 116610ln','ref 116610ln','submariner generation 2','previous gen submariner'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Date 40mm'; return t(
    `**Rolex Submariner réf. 116610LN** — La génération précédente, 40mm acier, lunette céramique noire. Mouvement 3135 (48h réserve), Chronometer. Fenêtre de date avec loupe Cyclope, bracelet Oyster. Produit 2009-2020, très fiable et abordable face au 126610. Cas intermédiaire : plus tard que le 16610, plus tôt que le 124060/126610. Recherché des collectionneurs budget et des plongeurs de terrain. Les prix de seconde main restent stables, excellente entrée dans les Submariner sports Rolex.`,
    `**Rolex Submariner ref. 116610LN** — The previous generation, 40mm steel, black ceramic bezel. 3135 movement (48h power reserve), Chronometer-certified. Date window with magnifying cyclops, Oyster bracelet. Made 2009–2020, bulletproof reliability and more affordable than 126610. Sweet spot: later than 16610, earlier than 124060/126610. Collected by budget-conscious collectors and field divers. Secondary market prices remain stable—excellent entry point to sports Rolex Submariners.`
  );} },

{ id:'rolex_126610ln', kw:['126610ln','submariner 41mm black','submariner date current','rolex 126610ln','ref 126610ln','new submariner','submariner 2020'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Date 41mm'; return t(
    `**Rolex Submariner réf. 126610LN** — Le Submariner Date actuel, 41mm acier, lunette céramique noire, verre Cyclope. Calibre 3235 (70h, nouvelle génération). Étanchéité 300m, bracelet Oyster. Lancé 2020 en même temps que le 124060 (no-date). Boîtier légèrement plus grand que le 116610, plus mince et léger. C'est le sport Rolex le plus demandé du moment, avec listes d'attente dans les boutiques. Excellent investissement à long terme, très collectionné.`,
    `**Rolex Submariner ref. 126610LN** — The current Submariner Date, 41mm steel, black ceramic bezel, cyclops crystal. 3235 movement (70h, next-gen). 300m water resistance, Oyster bracelet. Launched 2020 alongside the 124060. Slightly larger than 116610, thinner and lighter. Currently the most-demanded sports Rolex, with waiting lists at ADs. Excellent long-term investment, heavily collected.`
  );} },

{ id:'rolex_116610lv', kw:['116610lv','hulk','submariner green','green dial green bezel','rolex hulk','discontinued submariner','ref 116610lv'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner "Hulk" 40mm'; return t(
    `**Rolex Submariner réf. 116610LV "Hulk"** — Légende discontinuée 2020, 40mm acier, cadran ET lunette verts uniques. Mouvement 3135 (48h). Seul Submariner sport avec deux verts, jamais reproduit. Produit 2010–2020, recherchissime en occasion. La discontinuation en 2020 (remplacée par le noir 126610) a créé une aura de rareté. Prix de seconde main: 2–3× la valeur d'un noir. Symbole collector des années 2010, très demandé par les investisseurs horlogers.`,
    `**Rolex Submariner ref. 116610LV "Hulk"** — Discontinued legend, 2020. 40mm steel, unique green dial AND bezel. 3135 movement (48h). Only sports Submariner ever with dual green colorway—never repeated. Made 2010–2020, highly prized on secondary market. Discontinuation in 2020 (replaced by black 126610) created scarcity mythology. Secondary prices: 2–3× black. Iconic 2010s collector symbol, heavily pursued by watch investors.`
  );} },

{ id:'rolex_114060', kw:['114060','submariner no date 40','rolex 114060','ref 114060','previous no date','2012 submariner'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner No-Date 40mm'; return t(
    `**Rolex Submariner réf. 114060** — Prédécesseur du 124060, 40mm acier, lunette céramique, mouvement 3130. Produit 2012–2020, transition entre le 14060M et le 124060. 300m étanchéité, très apprécié des puristes sans-date. Moins cher que le 124060 actuel mais les prix montent. Excellent collector's piece, spécification vintage au design moderne. Les forums considèrent cette "génération intermédiaire" comme équilibrée.`,
    `**Rolex Submariner ref. 114060** — Predecessor to 124060, 40mm steel, ceramic bezel, 3130 movement. Made 2012–2020, bridge between 14060M and 124060. 300m water resistance, beloved by no-date purists. Less expensive than current 124060 but prices climbing. Excellent collector's piece—vintage spec in modern design. Forums call this "middle generation" a balanced sweet spot.`
  );} },

{ id:'rolex_16610', kw:['16610','submariner date 40','rolex 16610','ref 16610','1989 submariner','vintage submariner steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Date 40mm'; return t(
    `**Rolex Submariner réf. 16610** — Classique intemporel, 40mm acier, lunette aluminium (pré-céramique), mouvement 3135 (48h). Produit 1989–2010, le Submariner des années 1990-2000. Lunette peinte, plus rustique que céramique mais très collectée. Étanchéité 300m. Référence de transition du vintage au moderne, Prix affichent forte demande: 8–12k EUR en bon état. Montre outil robuste, investissement sûr.`,
    `**Rolex Submariner ref. 16610** — Timeless classic, 40mm steel, aluminum bezel (pre-ceramic), 3135 movement (48h). Made 1989–2010, the Submariner of the 1990s–2000s. Painted bezel, more utilitarian than ceramic but heavily collected. 300m rating. Bridge between vintage and modern—reference era. Prices show strong demand: 8–12k EUR in fine condition. Robust tool watch, safe investment.`
  );} },

{ id:'rolex_14060m', kw:['14060m','submariner no date vintage','rolex 14060m','ref 14060m','no date 40mm 1990s','maxi dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner No-Date 40mm'; return t(
    `**Rolex Submariner réf. 14060M** — Modèle sans-date culte des années 1990-2006, 40mm acier, lunette aluminium peinte, cadran "maxi" très lisible. Mouvement 3000 puis 3130. Étanchéité 300m, bracelet Oyster. Très apprécié des minimalistes et des plongeurs. Rareté sur le marché secondaire car jamais remplacé directement (sauts vers 114060 ou versions date). Excellent vintage, investissement stable.`,
    `**Rolex Submariner ref. 14060M** — Cult no-date model 1990s–2006, 40mm steel, painted aluminum bezel, prominent "maxi" dial. 3000 then 3130 movement. 300m rating, Oyster bracelet. Beloved by minimalists and field divers. Scarce on secondary market—never directly succeeded (jumps to 114060 or date versions). Excellent vintage, stable investment.`
  );} },

{ id:'rolex_5513', kw:['5513','vintage submariner no date','rolex 5513','ref 5513','1960s submariner','early submariner'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner No-Date Vintage'; return t(
    `**Rolex Submariner réf. 5513** — Légende vintage sans date, produit 1962–1989. 40mm acier, lunette aluminium peinte, verre plexiglas, mouvement 1530 ou 1575. Montre de plongée d'époque, très recherchée des vintage-enthusiastes. Production massive mais usure inévitable sur les spécimens de 60+ ans. Excellent pour son époque, prix: 4–8k EUR selon condition. Icône des années 1960-1970, rêve de collectionneurs.`,
    `**Rolex Submariner ref. 5513** — Vintage no-date legend, made 1962–1989. 40mm steel, painted aluminum bezel, plexiglass crystal, 1530 or 1575 movement. Period diving tool, highly coveted by vintage enthusiasts. Large production but inevitable wear on 60+ year old examples. Historic for its era, prices: 4–8k EUR depending on condition. Icon of 1960s–1970s, collector's dream.`
  );} },

{ id:'rolex_5512', kw:['5512','submariner cosc','rolex 5512','ref 5512','1950s submariner','chronometer submariner'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner COSC Vintage'; return t(
    `**Rolex Submariner réf. 5512** — Très rare, 1959–1980, Chronometer-certifié. 40mm acier, lunette aluminium, verre plexiglas, mouvement 1575 (18000 A/h). Moins produit que le 5513, premium vintage recherché. Désacralisation complète: exemplaires de 65 ans avec patine légendaire. Référence "pré-PCG" (avant guichet de date), culte des collectionneurs vintage extrêmes. Prix: 8–15k EUR selon provenance et condition.`,
    `**Rolex Submariner ref. 5512** — Very rare, 1959–1980, COSC-Chronometer-certified. 40mm steel, aluminum bezel, plexiglass crystal, 1575 movement (18000 A/h). Smaller production than 5513, premium vintage seek. Mystique complete: 65-year-old examples with legendary patina. Reference "pre-date window" (pre-PCG), cult among extreme vintage collectors. Prices: 8–15k EUR depending on provenance and condition.`
  );} },

{ id:'rolex_6538', kw:['6538','james bond submariner','rolex 6538','ref 6538','1950s bond watch','original submariner'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner "James Bond" Vintage'; return t(
    `**Rolex Submariner réf. 6538 "James Bond"** — Submariner originel de Sean Connery, 1955–1959. Rare, 40mm acier, lunette rotative unidirectionnelle, verre plexiglas, mouvement 1575. Poussoirs bomb (crown guards), sans guichet de date. Mythologie horlogère: c'est LE Submariner des débuts. Production très limitée, 150–300 pièces seulement. Prix: 25–50k EUR+ pour exemplaires authentiques documentés. Réservé aux ultra-collectionneurs et musées.`,
    `**Rolex Submariner ref. 6538 "James Bond"** — Original Submariner worn by Sean Connery, 1955–1959. Rare, 40mm steel, unidirectional rotating bezel, plexiglass crystal, 1575 movement. Bulbous crown guards, no date window. Watchmaking mythology: THE original Submariner. Very limited production, 150–300 pieces only. Price: 25–50k EUR+ for authenticated documented examples. Reserved for ultra-collectors and museums.`
  );} },

// DAYTONA FAMILY — Chronograph racing icon, since 1963
{ id:'rolex_116500ln', kw:['116500ln','daytona ceramic','daytona white','steel daytona modern','rolex 116500ln','ref 116500ln','2016 daytona'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm Steel/Ceramic'; return t(
    `**Rolex Daytona réf. 116500LN** — Référence moderne acier-céramique, 2016–2023. 40mm acier Oystersteel, lunette céramique noire avec échelle Tachymetre, chronographe 4130 (72h, COSC). Index en or blanc et or jaune sur cadran blanc. Étanchéité 100m, bracelet Oyster 3-mailles. Transition majeure: introduction de la céramique et du mouvement 4130 maison. Arrêt production 2023 (remplacé par 126500). Très demandé, liste d'attente massive aux ADs. Investissement à long terme stable.`,
    `**Rolex Daytona ref. 116500LN** — Modern steel-ceramic reference, 2016–2023. 40mm Oystersteel, black ceramic bezel with Tachymetre scale, 4130 chronograph (72h, COSC). White and yellow gold indices on white dial. 100m rating, 3-link Oyster bracelet. Major transition: introduction of ceramic and in-house 4130 movement. Production ended 2023 (replaced by 126500). Heavily sought, massive waitlists at ADs. Stable long-term investment.`
  );} },

{ id:'rolex_116520', kw:['116520','daytona zenith','steel daytona 1988','rolex 116520','ref 116520','el primero daytona','zenith movement'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm Zenith'; return t(
    `**Rolex Daytona réf. 116520** — Légende El Primero, 1988–2000. 40mm acier, lunette aluminium peinte, mouvement Zenith El Primero 4002 (36000 A/h, 50h réserve). Avant Rolex in-house 4130. Très collecté: c'est le "Daytona intermédiaire" entre vintage et moderne. Chronographe exceptionnel, histoire fabuleuse. Prix: 15–25k EUR selon condition. Tous les puristes possèdent un 116520. Investissement patrimoine.`,
    `**Rolex Daytona ref. 116520** — El Primero legend, 1988–2000. 40mm steel, painted aluminum bezel, Zenith El Primero 4002 movement (36000 A/h, 50h power reserve). Pre in-house Rolex 4130. Heavily collected: the "middle Daytona" between vintage and modern. Exceptional chronograph, fabulous history. Price: 15–25k EUR depending on condition. Every purist owns a 116520. Heritage investment.`
  );} },

{ id:'rolex_16520', kw:['16520','daytona white gold','vintage daytona 1988','rolex 16520','ref 16520','daytona two tone'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm Two-Tone'; return t(
    `**Rolex Daytona réf. 16520** — Version deux-tons classique, 1988–1992. 40mm acier & or blanc, lunette aluminium peinte, mouvement Zenith El Primero 4002. Très rare combinaison: acier + or blanc à cette époque (normalement tout or ou tout acier). Pièce transitoire, très respectée des collectionneurs. Petit production run. Prix: 20–35k EUR. Graal des Daytona-philes.`,
    `**Rolex Daytona ref. 16520** — Classic two-tone version, 1988–1992. 40mm steel & white gold, painted aluminum bezel, Zenith El Primero 4002 movement. Very rare combo: steel + white gold at this time (normally all-gold or all-steel). Transitional piece, highly respected by collectors. Small production run. Price: 20–35k EUR. Holy grail for Daytona enthusiasts.`
  );} },

{ id:'rolex_6239', kw:['6239','paul newman daytona','rolex 6239','ref 6239','cosmograph daytona','vintage daytona exotic dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona "Paul Newman" Vintage'; return t(
    `**Rolex Daytona réf. 6239 "Paul Newman"** — Légende absolue, 1963–1969. 40mm acier, lunette aluminium peinte, cadran exotique ("exotic" ou "Paul Newman" dial) avec sous-cadrans carrés uniques. Mouvement Valjoux 72 (mécanique manuelle). Montre de Paul Newman lui-même pendant 36 ans. Rareté extrême: moins de 1000 produites. Prix: 100k–300k EUR+ pour authentic documented. Montre la plus célèbre jamais créée.`,
    `**Rolex Daytona ref. 6239 "Paul Newman"** — Absolute legend, 1963–1969. 40mm steel, painted aluminum bezel, exotic dial (nicknamed "Paul Newman dial") with unique square sub-dials. Valjoux 72 manual-wind movement. Worn by Paul Newman himself for 36 years. Extreme rarity: under 1,000 made. Price: 100k–300k EUR+ for authenticated documented examples. Most famous watch ever created.`
  );} },

{ id:'rolex_6263', kw:['6263','daytona manual wind','rolex 6263','ref 6263','pump pushers daytona','vintage hand wind'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Manual-Wind Vintage'; return t(
    `**Rolex Daytona réf. 6263** — Variante manuelle rare, 1969–1977. 40mm acier, poussoirs "pump" caractéristiques, lunette aluminium, mouvement Valjoux 727 (mécanique manuelle). Moins connu que 6239 mais culte. Production limitée, condition rarement vue. Prix: 50–120k EUR selon état. Collectionneurs hardcore recherchent cette "génération manuelle". Pièce d'exception.`,
    `**Rolex Daytona ref. 6263** — Rare manual variant, 1969–1977. 40mm steel, characteristic "pump" pushers, aluminum bezel, Valjoux 727 manual-wind movement. Less known than 6239 but cult. Limited production, rarely seen in good condition. Price: 50–120k EUR depending on state. Hardcore collectors seek this "manual generation." Exceptional piece.`
  );} },

{ id:'rolex_116508', kw:['116508','daytona yellow gold green dial','rolex 116508','ref 116508','gold daytona green','two tone daytona'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm Yellow Gold'; return t(
    `**Rolex Daytona réf. 116508** — Or jaune pur, cadran vert lime, 2009–2016. 40mm or jaune massif, lunette céramique noire, mouvement 4130 (72h). Combinaison striking: or jaune (non-sport habituellement) + cadran vert moderne. Très rare, environ 1000–2000 pièces. Arrêtée 2016. Prix: 30–50k EUR. Pièce d'investissement de prestige.`,
    `**Rolex Daytona ref. 116508** — Solid yellow gold, lime green dial, 2009–2016. 40mm solid yellow gold, black ceramic bezel, 4130 movement (72h). Striking combo: yellow gold (non-sports typically) + modern green dial. Very rare, approximately 1000–2000 made. Discontinued 2016. Price: 30–50k EUR. Prestige investment piece.`
  );} },

{ id:'rolex_116519ln', kw:['116519ln','daytona white gold oysterflex','rolex 116519ln','ref 116519ln','platinum daytona','daytona rubber strap'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm White Gold Oysterflex'; return t(
    `**Rolex Daytona réf. 116519LN** — Or blanc élégant, bracelet Oysterflex révolutionnaire, 2015–2023. 40mm or blanc massif, lunette céramique noire, mouvement 4130 (72h). Bracelet Oysterflex caoutchouc noir (innovation 2015). Très recherché par collectionneurs de prestige. Production limitée. Prix: 35–60k EUR. Arrêtée 2023. Combinaison ultra-luxe: or blanc + Oysterflex (design moderne futuriste).`,
    `**Rolex Daytona ref. 116519LN** — Elegant white gold, revolutionary Oysterflex bracelet, 2015–2023. 40mm solid white gold, black ceramic bezel, 4130 movement (72h). Black rubber Oysterflex bracelet (2015 innovation). Highly sought by luxury collectors. Limited production. Price: 35–60k EUR. Discontinued 2023. Ultra-luxury combo: white gold + Oysterflex (futuristic modern design).`
  );} },

{ id:'rolex_126500ln', kw:['126500ln','daytona current 2023','new daytona','rolex 126500ln','ref 126500ln','daytona latest'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm Steel Ceramic'; return t(
    `**Rolex Daytona réf. 126500LN** — La génération 2023+, acier-céramique actuelle. 40mm Oystersteel, lunette Cerachrom noire, cadran blanc avec index or, mouvement 4130 (72h, Chronometer). Bracelet Oyster 3-mailles renforcé. Évolution subtile du 116500: châssis affiné, technologie consolidée, mouvement +2 ans réserve marche. Référence actuelle, liste d'attente énorme. Investissement de prestige moderne.`,
    `**Rolex Daytona ref. 126500LN** — Current 2023+ generation, steel-ceramic. 40mm Oystersteel, black Cerachrom bezel, white dial with gold indices, 4130 movement (72h, Chronometer). Reinforced 3-link Oyster bracelet. Subtle evolution from 116500: refined case, consolidated tech, +2 years power reserve. Current reference, enormous waitlist. Modern prestige investment.`
  );} },

{ id:'rolex_126529ln', kw:['126529ln','daytona reverse panda','white dial black subdials','rolex 126529ln','ref 126529ln','2023 panda daytona'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona 40mm "Reverse Panda"'; return t(
    `**Rolex Daytona réf. 126529LN "Reverse Panda"** — Nouvelle couleur 2023, acier blanc avec cadran noir inversé. 40mm Oystersteel, lunette Cerachrom noire, cadran NOIR avec sous-cadrans blancs (inverse du "panda" classique). Mouvement 4130 (72h). Couleur électrisante, très demandée. Très limité, listes d'attente. Pièce de collection immédiate, investissement garanti. Rolex innovation couleur rare.`,
    `**Rolex Daytona ref. 126529LN "Reverse Panda"** — New 2023 color, steel white with inverted black dial. 40mm Oystersteel, black Cerachrom bezel, BLACK dial with white sub-dials (inverse of classic "panda"). 4130 movement (72h). Electric color, highly demanded. Very limited, waitlists. Instant collectible, guaranteed investment. Rare Rolex color innovation.`
  );} },

// GMT-MASTER FAMILY — Traveler's instrument, since 1954
{ id:'rolex_126710blro', kw:['126710blro','gmt pepsi current','gmt jubilee','rolex 126710blro','ref 126710blro','2023 gmt pepsi','gmt master ii pepsi'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II "Pepsi" Jubilee'; return t(
    `**Rolex GMT-Master II réf. 126710BLRO** — Pepsi actuel, bracelet Jubilee, 2023+. 40mm acier Oystersteel, lunette bi-directionnelle Cerachrom rouge/bleu, cadran noir, mouvement 3285 (70h). Bracelet Jubilee 5-mailles iconic (en alternance avec Oyster 3-mailles). Lunette "Pepsi" (rouge-bleu) recherchissime. Référence actuelle ultra-demandée. Prix élevé, liste d'attente massive. Investissement prestige incontournable.`,
    `**Rolex GMT-Master II ref. 126710BLRO** — Current Pepsi, Jubilee bracelet, 2023+. 40mm Oystersteel, bidirectional Cerachrom red/blue bezel, black dial, 3285 movement (70h). Iconic 5-link Jubilee bracelet (alternating with 3-link Oyster option). "Pepsi" bezel (red-blue) highly sought. Current reference, ultra-demanded. High price, massive waitlist. Essential prestige investment.`
  );} },

{ id:'rolex_126710blnr', kw:['126710blnr','gmt batman current','rolex 126710blnr','ref 126710blnr','batman gmt jubilee','2023 batman'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II "Batman" Jubilee'; return t(
    `**Rolex GMT-Master II réf. 126710BLNR** — Batman actuel, bracelet Jubilee, 2023+. 40mm acier Oystersteel, lunette Cerachrom noir/bleu (24h), cadran noir mat, mouvement 3285 (70h, Chronometer). Bracelet Jubilee 5-mailles signature. Lunette "Batman" nuit-jour très lisible, très populaire auprès des voyageurs. Référence actuelle, disponibilité limitée. Investissement sûr.`,
    `**Rolex GMT-Master II ref. 126710BLNR** — Current Batman, Jubilee bracelet, 2023+. 40mm Oystersteel, black/blue Cerachrom bezel (24h), matte black dial, 3285 movement (70h, Chronometer). Signature 5-link Jubilee bracelet. "Batman" night-day bezel highly readable, popular with travelers. Current reference, limited availability. Safe investment.`
  );} },

{ id:'rolex_116710blnr', kw:['116710blnr','gmt batman previous','rolex 116710blnr','ref 116710blnr','2010 batman gmt','gmt-master batman steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II "Batman" Steel'; return t(
    `**Rolex GMT-Master II réf. 116710BLNR** — Batman génération antérieure, 2010–2023. 40mm acier, lunette aluminium peinte noir/bleu (plus fragile que céramique), mouvement 3186 (48h). Très populaire avant arrivée céramique. Prix secondaire: 8–12k EUR. Bon entrée de gamme GMT-Master. Robustesse éprouvée. Investissement stable.`,
    `**Rolex GMT-Master II ref. 116710BLNR** — Previous Batman generation, 2010–2023. 40mm steel, painted aluminum black/blue bezel (less durable than ceramic), 3186 movement (48h). Very popular before ceramic arrival. Secondary price: 8–12k EUR. Good entry-level GMT-Master. Proven robustness. Stable investment.`
  );} },

{ id:'rolex_16750', kw:['16750','gmt vintage 1981','rolex 16750','ref 16750','quickset date gmt','vintage traveler watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master 40mm Vintage'; return t(
    `**Rolex GMT-Master réf. 16750** — Classique vintage, 1981–1988. 40mm acier, lunette aluminium peinte rouge/bleu, mouvement 3075 (48h, quickset date). Premier GMT avec changement rapide de date. Très collecté, qualité horlogère excellente. Prix: 5–8k EUR selon condition. Montre outil de voyageur légendaire, très demandée.`,
    `**Rolex GMT-Master ref. 16750** — Vintage classic, 1981–1988. 40mm steel, red/blue painted aluminum bezel, 3075 movement (48h, quickset date). First GMT with rapid-set date change. Heavily collected, excellent watchmaking quality. Price: 5–8k EUR depending on condition. Legendary traveler tool watch, highly sought.`
  );} },

{ id:'rolex_1675', kw:['1675','gmt-master original','rolex 1675','ref 1675','1950s gmt','original gmt watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master Vintage'; return t(
    `**Rolex GMT-Master réf. 1675** — Originel légendaire, 1959–1980. 40mm acier, lunette aluminium peinte "tropical" virant au brun, mouvement 1575 (18000 A/h). Montre outil des pilotes, très rare. Condition variable (tropicalization), très respectée. Prix: 10–25k EUR selon état. Graal des collectionneurs GMT. Symbole du voyage haute horlogerie.`,
    `**Rolex GMT-Master ref. 1675** — Legendary original, 1959–1980. 40mm steel, "tropical" painted aluminum bezel (fades to brown), 1575 movement (18000 A/h). Pilot tool watch, very rare. Variable condition (tropicalization), highly respected. Price: 10–25k EUR depending on state. Holy grail for GMT collectors. Symbol of high-watch travel.`
  );} },

{ id:'rolex_126720vtnr', kw:['126720vtnr','gmt destro left handed','left-hand gmt','rolex 126720vtnr','ref 126720vtnr','southpaw gmt','2023 destro'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II "Destro" 40mm'; return t(
    `**Rolex GMT-Master II réf. 126720VTNR "Destro"** — Gaucher révolutionnaire, 2023. 40mm acier Oystersteel, couronne positionnée à GAUCHE (innovation rare Rolex), lunette Cerachrom noir/bleu, cadran noir, mouvement 3285 (70h). Bracelet Oyster 3-mailles. Pièce ultra-spécialisée pour gauchers. Production très limitée. Prix: 15–20k EUR. Montre d'exception, investissement de collection.`,
    `**Rolex GMT-Master II ref. 126720VTNR "Destro"** — Revolutionary left-handed, 2023. 40mm Oystersteel, crown positioned on LEFT side (rare Rolex innovation), black/blue Cerachrom bezel, black dial, 3285 movement (70h). 3-link Oyster bracelet. Ultra-specialized piece for left-handers. Very limited production. Price: 15–20k EUR. Exceptional watch, collection investment.`
  );} },

// DAY-DATE (PRESIDENT) FAMILY — Dress sport prestige, since 1956
{ id:'rolex_228238', kw:['228238','day date 40 yellow gold','rolex 228238','ref 228238','daydate president gold 40','2023 day date yellow'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 40 Yellow Gold'; return t(
    `**Rolex Day-Date réf. 228238** — Or jaune massif, 40mm, 2023+. Lunette cannelée, cadran champagne, jour ET date en majuscules dorés. Mouvement 3255 (70h, perpetual rotor, Chronometer). Bracelet President 3-mailles or jaune. Montre présidentielle de luxe absolu. Très demandée par executives et collectionneurs. Prix: 35–50k EUR. Investissement patrimoine intemporelle.`,
    `**Rolex Day-Date ref. 228238** — Solid yellow gold, 40mm, 2023+. Fluted bezel, champagne dial, day AND date in gold capitals. 3255 movement (70h, perpetual rotor, Chronometer). President 3-link yellow gold bracelet. Ultimate presidential luxury watch. Highly sought by executives and collectors. Price: 35–50k EUR. Timeless heritage investment.`
  );} },

{ id:'rolex_228235', kw:['228235','day date 40 everose gold','rolex 228235','ref 228235','daydate president everose','rose gold day date'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 40 Everose Gold'; return t(
    `**Rolex Day-Date réf. 228235** — Or rose Everose massif, 40mm, 2023+. Lunette cannelée, cadran chocolat ou champagne, jour ET date dorés. Mouvement 3255 (70h). Bracelet President 3-mailles Everose. Couleur rose tendance, prestige discret. Très prisée des femmes executives et collectionneurs de prestige. Prix: 35–50k EUR. Montre d'exception.`,
    `**Rolex Day-Date ref. 228235** — Solid Everose gold, 40mm, 2023+. Fluted bezel, chocolate or champagne dial, day AND date in gold. 3255 movement (70h). President 3-link Everose bracelet. Trendy rose color, discrete prestige. Highly valued by female executives and luxury collectors. Price: 35–50k EUR. Exceptional watch.`
  );} },

{ id:'rolex_228239', kw:['228239','day date 40 white gold','rolex 228239','ref 228239','daydate platinum watch','white gold president'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 40 White Gold'; return t(
    `**Rolex Day-Date réf. 228239** — Or blanc massif, 40mm, 2023+. Lunette cannelée, cadran bleu ou argent. Jour ET date en majuscules dorées très visibles. Mouvement 3255 (70h, Chronometer COSC). Bracelet President 3-mailles or blanc. Montre présidentielle à la fois sportive et élégante. Très demandée. Prix: 35–50k EUR. Ultimate luxury dresswear.`,
    `**Rolex Day-Date ref. 228239** — Solid white gold, 40mm, 2023+. Fluted bezel, blue or silver dial. Day AND date in prominent gold capitals. 3255 movement (70h, COSC Chronometer). President 3-link white gold bracelet. Presidential watch that's both sporty and elegant. Highly sought. Price: 35–50k EUR. Ultimate luxury dresswear.`
  );} },

{ id:'rolex_118238', kw:['118238','day date 36 yellow gold','rolex 118238','ref 118238','president 36mm yellow','classic daydate gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 36 Yellow Gold'; return t(
    `**Rolex Day-Date réf. 118238** — Or jaune massif, 36mm, génération antérieure (2000–2008). Taille classique élégante. Lunette cannelée, cadran champagne, jour ET date. Mouvement 3155 (48h). Bracelet President 3-mailles. Très apprécié avant agrandissement à 40mm. Excellent rapport qualité-prix occasion. Prix: 20–30k EUR selon condition. Taille vintage, prestige éternel.`,
    `**Rolex Day-Date ref. 118238** — Solid yellow gold, 36mm, previous generation (2000–2008). Classic elegant size. Fluted bezel, champagne dial, day AND date. 3155 movement (48h). President 3-link bracelet. Highly valued before size increase to 40mm. Excellent secondary market value. Price: 20–30k EUR depending on condition. Vintage size, eternal prestige.`
  );} },

{ id:'rolex_18038', kw:['18038','day date vintage gold 36','rolex 18038','ref 18038','president 1977','daydate earlier generation'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 36 Vintage Gold'; return t(
    `**Rolex Day-Date réf. 18038** — Or massif vintage, 36mm, 1977+. Lunette cannelée classique, cadran champagne/argent, jour ET date or. Mouvement automatique 3035 (48h). Bracelet President 3-mailles. Très recherché par vintage-lovers. Bon marché secondaire: 15–25k EUR selon or utilisé (jaune, blanc). Prestige intemporel, très collecté.`,
    `**Rolex Day-Date ref. 18038** — Vintage solid gold, 36mm, 1977+. Classic fluted bezel, champagne/silver dial, day AND date in gold. Automatic 3035 movement (48h). President 3-link bracelet. Highly sought by vintage lovers. Good secondary market: 15–25k EUR depending on gold type (yellow, white). Timeless prestige, heavily collected.`
  );} },

// DATEJUST FAMILY — Dress sport icon, since 1945
{ id:'rolex_126334', kw:['126334','datejust 41 white gold','rolex 126334','ref 126334','datejust 41 fluted','2020 datejust 41mm'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 White Gold'; return t(
    `**Rolex Datejust réf. 126334** — Or blanc massif, 41mm, 2020+. Lunette cannelée (fluted), cadran blanc ou bleu, fenêtre de date loupe Cyclope. Mouvement 3235 (70h, Chronometer perpetual rotor). Bracelet Oyster 3-mailles or blanc. Montre élégante et robuste. Très demandée. Prix: 22–35k EUR. Investissement prestige stable.`,
    `**Rolex Datejust ref. 126334** — Solid white gold, 41mm, 2020+. Fluted bezel, white or blue dial, magnifying cyclops date window. 3235 movement (70h, Chronometer perpetual rotor). 3-link Oyster white gold bracelet. Elegant and robust watch. Highly sought. Price: 22–35k EUR. Stable prestige investment.`
  );} },

{ id:'rolex_126234', kw:['126234','datejust 36 white gold','rolex 126234','ref 126234','datejust 36 fluted','classic datejust 36mm'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 36 White Gold'; return t(
    `**Rolex Datejust réf. 126234** — Or blanc massif, 36mm, taille classique, 2020+. Lunette cannelée, cadran bleu, date cyclope. Mouvement 3235 (70h). Bracelet Oyster 3-mailles or blanc. Très apprécié pour proportions parfaites. Très demandé. Prix: 20–32k EUR. Montre intemporelle, investissement patrimonial.`,
    `**Rolex Datejust ref. 126234** — Solid white gold, 36mm classic size, 2020+. Fluted bezel, blue dial, cyclops date. 3235 movement (70h). 3-link Oyster white gold bracelet. Highly valued for perfect proportions. Heavily sought. Price: 20–32k EUR. Timeless watch, heritage investment.`
  );} },

{ id:'rolex_126200', kw:['126200','datejust 36 steel smooth bezel','rolex 126200','ref 126200','smooth datejust 36','2020 datejust steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 36 Steel'; return t(
    `**Rolex Datejust réf. 126200** — Acier Oystersteel, 36mm, lunette lisse (smooth), 2020+. Cadran blanc ou noir, date cyclope. Mouvement 3235 (70h, Chronometer perpetual). Bracelet Oyster 3-mailles acier. Option sports-elegante, plus discrète que cannelée. Très populaire. Prix: 8–11k EUR. Excellent rapport qualité-prix Rolex actuel.`,
    `**Rolex Datejust ref. 126200** — Oystersteel, 36mm, smooth bezel, 2020+. White or black dial, cyclops date. 3235 movement (70h, Chronometer perpetual). 3-link Oyster steel bracelet. Sports-elegant option, more discrete than fluted. Very popular. Price: 8–11k EUR. Excellent current Rolex value.`
  );} },

{ id:'rolex_116234', kw:['116234','datejust 36 previous','rolex 116234','ref 116234','older datejust 36mm','2000s datejust'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 36 Steel'; return t(
    `**Rolex Datejust réf. 116234** — Acier, 36mm, génération antérieure (2000–2009). Mouvement 3135 (48h, très fiable). Lunette lisse, très sobre. Excellent sportwear discret. Prix secondaire: 6–8k EUR. Entrée très accessible Datejust/Rolex. Très collecté, investissement sûr.`,
    `**Rolex Datejust ref. 116234** — Steel, 36mm, previous generation (2000–2009). 3135 movement (48h, very reliable). Smooth bezel, very understated. Excellent discrete sportwear. Secondary price: 6–8k EUR. Very accessible Datejust/Rolex entry. Heavily collected, safe investment.`
  );} },

{ id:'rolex_1601', kw:['1601','datejust vintage 1960s','rolex 1601','ref 1601','classic vintage datejust','1960 datejust steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 36 Vintage'; return t(
    `**Rolex Datejust réf. 1601** — Légende vintage acier, 36mm, 1960s–1977. Lunette lisse ou cannelée, cadran variés, mouvement 1570/1575 (18000 A/h ou 19800 A/h). Très collecté pour rareté et prestige. Condition variable mais très apprécié. Prix: 5–12k EUR selon condition et variante. Icône horlogère absolue, "original Datejust".`,
    `**Rolex Datejust ref. 1601** — Vintage steel legend, 36mm, 1960s–1977. Smooth or fluted bezel, varied dials, 1570/1575 movements (18000 A/h or 19800 A/h). Heavily collected for rarity and prestige. Variable condition but highly valued. Price: 5–12k EUR depending on condition and variant. Absolute watchmaking icon, "original Datejust."`
  );} },

{ id:'rolex_16013', kw:['16013','datejust two tone vintage','rolex 16013','ref 16013','gold and steel datejust','two tone classic'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust Two-Tone Vintage'; return t(
    `**Rolex Datejust réf. 16013** — Deux-tons or/acier vintage, 36mm, 1982–1990. Lunette cannelée, cadran variés, mouvement 3035 (48h). Très élégante combinaison couleur. Moins produite que versions monomatière. Recherchée. Prix: 8–15k EUR selon or utilisé. Prestige intermédiaire, vintage chic.`,
    `**Rolex Datejust ref. 16013** — Vintage two-tone gold/steel, 36mm, 1982–1990. Fluted bezel, varied dials, 3035 movement (48h). Very elegant color combo. Less produced than single-material versions. Sought after. Price: 8–15k EUR depending on gold used. Intermediate prestige, vintage chic.`
  );} },

{ id:'rolex_278271', kw:['278271','datejust 31 rolesor rose','rolex 278271','ref 278271','datejust rose gold steel','rose gold datejust womens'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 31 Rolesor Rose'; return t(
    `**Rolex Datejust réf. 278271** — Rolesor® rose/acier, 31mm, dame, 2023+. Lunette cannelée, cadran rose ou chocolat, date cyclope. Mouvement 2235 (55h, automatique, COSC). Bracelet Jubilee 5-mailles Rolesor rose. Très féminin, prestige élégant. Prix: 12–18k EUR. Investissement prestige classique pour femmes.`,
    `**Rolex Datejust ref. 278271** — Rolesor® rose/steel, 31mm lady, 2023+. Fluted bezel, rose or chocolate dial, cyclops date. 2235 movement (55h, automatic, COSC). 5-link Jubilee Rolesor rose bracelet. Very feminine, elegant prestige. Price: 12–18k EUR. Classic prestige investment for women.`
  );} },

// EXPLORER FAMILY — Field instrument, since 1953
{ id:'rolex_224270', kw:['224270','explorer 40mm current','rolex 224270','ref 224270','2023 explorer','explorer i 40'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer I 40mm'; return t(
    `**Rolex Explorer réf. 224270** — Acier, 40mm, 2023+. Lunette unie noire, cadran noir très sobre "mercedes" (aiguilles caractéristiques), mouvement 3230 (70h, Chronometer perpetual). Bracelet Oyster 3-mailles. Montre pilote/aventurier moderne, très épurée. Excellent rapport qualité-prix. Prix: 6–8k EUR. Rolex accessibilité, investissement stable.`,
    `**Rolex Explorer ref. 224270** — Steel, 40mm, 2023+. Unified black bezel, very simple black dial with "Mercedes" hands (characteristic), 3230 movement (70h, Chronometer perpetual). 3-link Oyster bracelet. Modern pilot/adventurer watch, very minimalist. Excellent value. Price: 6–8k EUR. Accessible Rolex, stable investment.`
  );} },

{ id:'rolex_124270', kw:['124270','explorer 36mm current','rolex 124270','ref 124270','2021 explorer 36','explorer classic size'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer I 36mm'; return t(
    `**Rolex Explorer réf. 124270** — Acier, 36mm, taille classique, 2021+. Lunette unie, cadran noir, aiguilles "mercedes". Mouvement 3130 (70h, COSC Chronometer). Bracelet Oyster 3-mailles. Très apprécié pour proportions équilibrées. Moins produit que 40mm. Prix: 6–7.5k EUR. Excellent entrée Rolex sport-elegante.`,
    `**Rolex Explorer ref. 124270** — Steel, 36mm classic size, 2021+. Unified bezel, black dial, "Mercedes" hands. 3130 movement (70h, COSC Chronometer). 3-link Oyster bracelet. Valued for balanced proportions. Less produced than 40mm. Price: 6–7.5k EUR. Excellent entry sports-elegant Rolex.`
  );} },

{ id:'rolex_214270', kw:['214270','explorer 39mm previous','rolex 214270','ref 214270','2010 explorer','older explorer generation'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer I 39mm'; return t(
    `**Rolex Explorer réf. 214270** — Acier, 39mm, génération intermédiaire, 2010–2021. Mouvement 3130 (70h). Lunette unie, très robuste. Excellent pont entre 36mm classique et 40mm moderne. Prix secondaire: 5–6.5k EUR. Très fiable, très accessibilité. Investissement stable, rapport qualité-prix remarquable.`,
    `**Rolex Explorer ref. 214270** — Steel, 39mm, intermediate generation, 2010–2021. 3130 movement (70h). Unified bezel, very robust. Excellent bridge between classic 36mm and modern 40mm. Secondary price: 5–6.5k EUR. Bulletproof, very accessible. Stable investment, remarkable value.`
  );} },

{ id:'rolex_1016', kw:['1016','explorer vintage legendary','rolex 1016','ref 1016','1960s explorer','explorer original'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer I Vintage'; return t(
    `**Rolex Explorer réf. 1016** — Légende absolue, 36mm acier, 1963–1989. Cadran noir sobriquet "W" ou "3-6-9" (numéros pointeur). Mouvement 1560 ou 1570 (18000/19800 A/h). Montre d'explorateur pur-sang, jamais "sportive" ostentatoire. Très recherchée. Prix: 8–20k EUR selon condition et variante. Graal des minimalistes. Investissement patrimoine.`,
    `**Rolex Explorer ref. 1016** — Absolute legend, 36mm steel, 1963–1989. Simple black dial with "W" or "3-6-9" (hour markers). 1560 or 1570 movement (18000/19800 A/h). Pure explorer watch, never showy sports. Highly sought. Price: 8–20k EUR depending on condition and variant. Holy grail for minimalists. Heritage investment.`
  );} },

{ id:'rolex_226570', kw:['226570','explorer ii 42mm white','rolex 226570','ref 226570','2021 explorer ii','current explorer ii'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II 42mm'; return t(
    `**Rolex Explorer II réf. 226570** — Acier, 42mm, cadran blanc, 2021+. Lunette 24h GMT fixe (orange), aiguilles Mercedes blanc. Mouvement 3285 (70h, Chronometer perpetual). Bracelet Oyster 3-mailles. Fonction GMT intégrée (pas de second fuseau mais 24h). Très robuste, excellent pour expédition/survie. Prix: 8–10k EUR. Investissement fiabilité absolue.`,
    `**Rolex Explorer II ref. 226570** — Steel, 42mm white dial, 2021+. Fixed 24h GMT bezel (orange), white Mercedes hands. 3285 movement (70h, Chronometer perpetual). 3-link Oyster bracelet. Integrated GMT function (not dual time but 24h). Very robust, excellent for expedition/survival. Price: 8–10k EUR. Investment in absolute reliability.`
  );} },

{ id:'rolex_216570', kw:['216570','explorer ii previous generation','rolex 216570','ref 216570','older explorer ii','2009 explorer ii'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II 42mm'; return t(
    `**Rolex Explorer II réf. 216570** — Acier, 42mm, génération antérieure, 2011–2021. Mouvement 3186 (48h). Cadran blanc ou noir, lunette GMT 24h orange fixe. Très fiable. Prix secondaire: 7–9k EUR. Excellent rapport qualité-prix en occasion. Investissement robuste.`,
    `**Rolex Explorer II ref. 216570** — Steel, 42mm, previous generation, 2011–2021. 3186 movement (48h). White or black dial, orange fixed 24h GMT bezel. Very reliable. Secondary price: 7–9k EUR. Excellent secondary market value. Robust investment.`
  );} },

{ id:'rolex_16570', kw:['16570','explorer ii 40mm vintage','rolex 16570','ref 16570','1991 explorer ii','older gmt explorer'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II 40mm Vintage'; return t(
    `**Rolex Explorer II réf. 16570** — Acier, 40mm, 1991–2011. Mouvement 3185 (48h). Cadran blanc, lunette GMT aluminium peinte rouge/blanc. Très collecté, excellent état encore trouvable. Prix: 6–10k EUR selon condition. Très apprécié pour taille 40mm "moyenne" (avant agrandissement 42mm). Investissement stable.`,
    `**Rolex Explorer II ref. 16570** — Steel, 40mm, 1991–2011. 3185 movement (48h). White dial, painted aluminum red/white GMT bezel. Heavily collected, good condition examples still findable. Price: 6–10k EUR depending on state. Valued for 40mm "middle" size (before 42mm enlargement). Stable investment.`
  );} },

// SEA-DWELLER FAMILY — Deep diving specialist, since 1967
{ id:'rolex_126600', kw:['126600','sea dweller red','rolex 126600','ref 126600','2023 sea dweller','current sea dweller 43mm'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Sea-Dweller 43mm'; return t(
    `**Rolex Sea-Dweller réf. 126600** — Acier, 43mm, "Red Writing" actuel, 2023+. Lunette bi-directionnelle Cerachrom noire, cadran noir, texte "Sea-Dweller" EN ROUGE (distinction iconique). Mouvement 3235 (70h, Chronometer). Étanchéité 4000 pieds (1220m). Helium valve exclusive. Bracelet Oyster 3-mailles. Montre plongée extrême, très demandée. Prix: 12–15k EUR. Investissement prestige professionnel.`,
    `**Rolex Sea-Dweller ref. 126600** — Steel, 43mm, current "Red Writing," 2023+. Black bidirectional Cerachrom bezel, black dial, "Sea-Dweller" text IN RED (iconic distinction). 3235 movement (70h, Chronometer). 4000 feet (1220m) water resistance. Exclusive helium valve. 3-link Oyster bracelet. Extreme diving watch, highly sought. Price: 12–15k EUR. Professional prestige investment.`
  );} },

{ id:'rolex_126660', kw:['126660','deepsea 44mm','rolex 126660','ref 126660','deepsea current','3900m deepsea'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Deepsea 44mm'; return t(
    `**Rolex Deepsea réf. 126660** — Acier spécial, 44mm, 3900m plongée extrême, 2023+. Lunette Cerachrom bidirectionnelle noire, cadran noir, mouvement 3235 (70h). Helium valve. Boîtier massif avec "Ring Lock" (innovation Rolex pour pression). Bracelet Oyster renforcé. Montre légendaire pour plongeurs professionnels. Très rare civilian. Prix: 14–18k EUR. Investissement exceptionnel.`,
    `**Rolex Deepsea ref. 126660** — Special steel, 44mm, 3900m extreme diving, 2023+. Black bidirectional Cerachrom bezel, black dial, 3235 movement (70h). Helium valve. Massive case with "Ring Lock" (Rolex innovation for pressure). Reinforced Oyster bracelet. Legendary watch for professional divers. Very rare civilian. Price: 14–18k EUR. Exceptional investment.`
  );} },

{ id:'rolex_136660', kw:['136660','deepsea challenge 50mm','rolex 136660','ref 136660','titanium deepsea','11000m challenger'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Deepsea Challenge 50mm'; return t(
    `**Rolex Deepsea Challenge réf. 136660** — Titane, 50mm, 11000m (Challenger Deep), 2023+. Mouvement 3230 (70h) spécialisé. Helium valve, Ring Lock. Lunette Cerachrom noire. Montre d'expédition ultra-rare, très limitée (100–200/an). Seule Rolex capable d'atteindre les profondeurs absolues. Prix: 60–100k EUR+. Réservée aux collectionneurs extrêmes et expéditions.`,
    `**Rolex Deepsea Challenge ref. 136660** — Titanium, 50mm, 11000m (Challenger Deep), 2023+. Specialized 3230 movement (70h). Helium valve, Ring Lock. Black Cerachrom bezel. Ultra-rare expedition watch, very limited (100–200/year). Only Rolex capable of absolute depths. Price: 60–100k EUR+. Reserved for extreme collectors and expeditions.`
  );} },

{ id:'rolex_116600', kw:['116600','sea dweller 40mm','rolex 116600','ref 116600','2014 sea dweller','brief production sea dweller'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Sea-Dweller 40mm'; return t(
    `**Rolex Sea-Dweller réf. 116600** — Acier, 40mm, production brève 2014–2017. Mouvement 3135 (48h). Helium valve, étanchéité 4000 pieds. Taille intermédiaire, très rare. Très collectée car production très courte. Prix secondaire: 10–14k EUR. Pièce exceptionnelle, investissement collector.`,
    `**Rolex Sea-Dweller ref. 116600** — Steel, 40mm, brief production 2014–2017. 3135 movement (48h). Helium valve, 4000 feet rating. Intermediate size, very rare. Heavily collected—short production run. Secondary price: 10–14k EUR. Exceptional piece, collector investment.`
  );} },

// SKY-DWELLER FAMILY — Complication prestige, since 2012
{ id:'rolex_326934', kw:['326934','sky dweller steel white gold','rolex 326934','ref 326934','sky dweller oyster','steel wg skydweller'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Sky-Dweller Steel/WG'; return t(
    `**Rolex Sky-Dweller réf. 326934** — Acier & or blanc Rolesor®, 42mm, 2023+. Complication annuelle (calendrier perpétuel). Lunette rotative "Ring Command" innovante, affichage GMT. Mouvement 9001 (72h, perpétuel, Chronometer). Bracelet Oyster 3-mailles Rolesor. Montre à complication horlogère finest, très rare. Prix: 40–60k EUR. Investissement compliqué, prestige absolu.`,
    `**Rolex Sky-Dweller ref. 326934** — Steel & white gold Rolesor®, 42mm, 2023+. Annual complication (perpetual calendar). Innovative "Ring Command" rotatable bezel, GMT display. 9001 movement (72h, perpetual, Chronometer). 3-link Oyster Rolesor bracelet. Horologically complex, very rare. Price: 40–60k EUR. Complicated investment, absolute prestige.`
  );} },

{ id:'rolex_326238', kw:['326238','sky dweller yellow gold','rolex 326238','ref 326238','gold skydweller','yellow gold sky dweller'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Sky-Dweller Yellow Gold'; return t(
    `**Rolex Sky-Dweller réf. 326238** — Or jaune massif, 42mm, 2023+. Complication annuelle (calendrier perpétuel jusqu'à 2100). Lunette Ring Command. Mouvement 9001 (72h). Bracelet President 3-mailles or jaune. Montre présidentielle de haute complication. Extrêmement rare. Prix: 60–90k EUR. Réservée ultra-collectionneurs, rêve de prestige.`,
    `**Rolex Sky-Dweller ref. 326238** — Solid yellow gold, 42mm, 2023+. Annual complication (perpetual calendar through 2100). Ring Command bezel. 9001 movement (72h). President 3-link yellow gold bracelet. Presidential ultra-complicated watch. Extremely rare. Price: 60–90k EUR. Reserved for ultra-collectors, prestige dream.`
  );} },

// YACHT-MASTER FAMILY — Sailing sports watch, since 1992
{ id:'rolex_226659', kw:['226659','yacht master 42 white gold oysterflex','rolex 226659','ref 226659','luxury yacht master','wg yacht master'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 42 White Gold'; return t(
    `**Rolex Yacht-Master réf. 226659** — Or blanc massif, 42mm, bracelet Oysterflex noir, 2023+. Lunette rotative unidirectionnelle, cadran bleu ou noir. Mouvement 3235 (70h, Chronometer). Rare combinaison or blanc + caoutchouc sport. Très élégant, sailing prestige. Prix: 30–45k EUR. Investissement luxe naval.`,
    `**Rolex Yacht-Master ref. 226659** — Solid white gold, 42mm, black Oysterflex bracelet, 2023+. Unidirectional rotating bezel, blue or black dial. 3235 movement (70h, Chronometer). Rare combo: white gold + sports rubber. Very elegant, sailing prestige. Price: 30–45k EUR. Luxury naval investment.`
  );} },

{ id:'rolex_126655', kw:['126655','yacht master 40 everose oysterflex','rolex 126655','ref 126655','rose gold yacht master','everose sailing'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 40 Everose'; return t(
    `**Rolex Yacht-Master réf. 126655** — Or rose Everose massif, 40mm, Oysterflex noir, 2023+. Lunette unidirectionnelle, cadran bleu. Mouvement 3235 (70h). Très tendance rose, sailing sportif. Prix: 28–40k EUR. Montre élégante, investissement moderne prestige.`,
    `**Rolex Yacht-Master ref. 126655** — Solid Everose gold, 40mm, black Oysterflex, 2023+. Unidirectional bezel, blue dial. 3235 movement (70h). Trendy rose, sports sailing. Price: 28–40k EUR. Elegant watch, modern prestige investment.`
  );} },

{ id:'rolex_268655', kw:['268655','yacht master 37 everose','rolex 268655','ref 268655','rose gold yacht master 37','dame yacht master'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 37 Everose'; return t(
    `**Rolex Yacht-Master réf. 268655** — Or rose Everose, 37mm dame, Oysterflex noir, 2023+. Lunette rotative, cadran bleu. Mouvement 2236 (55h). Excellent taille pour femmes, très féminin. Prix: 25–35k EUR. Prestige sailing élégant pour dames.`,
    `**Rolex Yacht-Master ref. 268655** — Everose gold, 37mm lady, black Oysterflex, 2023+. Rotating bezel, blue dial. 2236 movement (55h). Excellent ladies' size, very feminine. Price: 25–35k EUR. Elegant sailing prestige for women.`
  );} },

// OTHER REFERENCES
{ id:'rolex_126000', kw:['126000','oyster perpetual 36','rolex 126000','ref 126000','2023 oyster perpetual','basic rolex entry'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Oyster Perpetual 36mm'; return t(
    `**Rolex Oyster Perpetual réf. 126000** — Acier Oystersteel, 36mm, pas de date, 2023+. Cadran coloré (rouge, bleu, turquoise). Mouvement 3230 (70h, Chronometer). Bracelet Oyster 3-mailles. Entrée Rolex authentique, couleurs vives modernes. Excellent accessibilité. Prix: 6–7k EUR. Premier Rolex idéal.`,
    `**Rolex Oyster Perpetual ref. 126000** — Oystersteel, 36mm, no date, 2023+. Colored dial (red, blue, turquoise). 3230 movement (70h, Chronometer). 3-link Oyster bracelet. Authentic Rolex entry, vibrant modern colors. Excellent accessibility. Price: 6–7k EUR. Ideal first Rolex.`
  );} },

{ id:'rolex_124300', kw:['124300','oyster perpetual 41 tiffany','rolex 124300','ref 124300','2020 oyster perpetual','41mm entry rolex'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Oyster Perpetual 41mm'; return t(
    `**Rolex Oyster Perpetual réf. 124300** — Acier, 41mm, 2020+. Taille moderne, cadrans colorés y compris "Tiffany blue" édition spéciale. Mouvement 3230 (70h). Très populaire, couleurs exclusives créent demande. Prix: 6.5–8k EUR selon couleur. Premier moderne élémentaire Rolex, très collectionné.`,
    `**Rolex Oyster Perpetual ref. 124300** — Steel, 41mm, 2020+. Modern size, colored dials including special "Tiffany blue" edition. 3230 movement (70h). Very popular—exclusive colors drive demand. Price: 6.5–8k EUR depending on color. Modern elementary first Rolex, heavily collected.`
  );} },

{ id:'rolex_116400gv', kw:['116400gv','milgauss green crystal','rolex 116400gv','ref 116400gv','green sapphire milgauss','vintage milgauss'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Milgauss Green Sapphire'; return t(
    `**Rolex Milgauss réf. 116400GV** — Acier, 40mm, cristal saphir VERT unique, 2007–2014. Lunette unie noire, cadran blanc ou noir. Mouvement 3131 (48h, antimagnetique jusqu'à 1000 gauss). Protection blindée magnétique. Très collectée pour cristal vert rare. Prix: 8–12k EUR. Excellent rapport qualité-prix vintage Rolex. Investissement intéressant.`,
    `**Rolex Milgauss ref. 116400GV** — Steel, 40mm, unique GREEN sapphire crystal, 2007–2014. Black unified bezel, white or black dial. 3131 movement (48h, antimagnetic to 1000 gauss). Magnetic shielding. Heavily collected for rare green crystal. Price: 8–12k EUR. Excellent value vintage Rolex. Interesting investment.`
  );} },

{ id:'rolex_50535', kw:['50535','cellini moonphase','rolex 50535','ref 50535','cellini dress watch','moonphase elegance'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Cellini Moonphase'; return t(
    `**Rolex Cellini réf. 50535** — Or blanc massif, 42mm, montre de soirée avec phase lune, 2023+. Mouvement 3195 (72h, perpétuel, complication lune). Très élégante. Bracelet cuir noisette ou maille or blanc. Montre prestige pure, non sportive. Très rare. Prix: 30–45k EUR. Réservée aux collectionneurs elegance.`,
    `**Rolex Cellini ref. 50535** — Solid white gold, 42mm, evening watch with moonphase, 2023+. 3195 movement (72h, perpetual, moon complication). Very elegant. Hazelnut leather or white gold mesh bracelet. Pure prestige, non-sport watch. Very rare. Price: 30–45k EUR. Reserved for elegance collectors.`
  );} },

{ id:'rolex_50505', kw:['50505','cellini time 39mm','rolex 50505','ref 50505','cellini dress','white gold elegance'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Cellini Time 39mm'; return t(
    `**Rolex Cellini réf. 50505** — Or blanc massif, 39mm, montre d'elegance pure, 2023+. Mouvement 3001 (48h, automatique). Cadran blanc ou noir très sobre. Bracelet cuir ou maille. Montre dressy intemporelle. Très rarement vue. Prix: 18–28k EUR. Graal prestige discret.`,
    `**Rolex Cellini ref. 50505** — Solid white gold, 39mm, pure elegance watch, 2023+. 3001 movement (48h, automatic). Very simple white or black dial. Leather or mesh bracelet. Timeless dressy watch. Rarely seen. Price: 18–28k EUR. Holy grail of discrete prestige.`
  );} },

// ═══ ROLEX PRECIOUS METALS EXPANDED ═══════════════════════════════════

// SUBMARINER PRECIOUS METALS
{ id:'rolex_126613lb', kw:['126613lb','submariner two tone','submariner blue 41','two tone submariner','submariner oystersteel gold','submariner everose','submariner gold blue','rolex blue dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Two-Tone 41mm'; return t(
    `**Rolex Submariner réf. 126613LB** — Boîtier 41mm bi-matière Oystersteel & or Everose 18K, cadran bleu sunburst, lunette céramique bleue Cerachrom, bracelet Oyster à système Glidelock. Mouvement Cal. 3235 (70h puissance, chronométrie COSC). Étanche 300m. Production 2020+. Marché : 22 000–28 000€. Très demandé, liste d'attente Rolex significative.`,
    `**Rolex Submariner ref. 126613LB** — 41mm two-tone Oystersteel & 18K Everose gold case, sunburst blue dial, blue Cerachrom ceramic bezel, Oyster bracelet with Glidelock system. Cal. 3235 movement (70h power reserve, COSC). 300m water-resistant. Made 2020+. Market: €22,000–28,000. Highly sought after with long Rolex waitlists.`
  );} },

{ id:'rolex_126613ln', kw:['126613ln','submariner two tone black','submariner black dial two tone','submariner oystersteel gold','two tone black submariner','submariner everose black','41mm two tone'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Two-Tone Black 41mm'; return t(
    `**Rolex Submariner réf. 126613LN** — Boîtier 41mm Oystersteel & or Everose, cadran noir, lunette céramique noire Cerachrom, bracelet Oyster intégré Glidelock. Cal. 3235 (70h, COSC chronométré). Étanche 300m. Production 2020+. L'alternative classique au 126613LB. Marché : 20 000–26 000€. Discrétion élégante.`,
    `**Rolex Submariner ref. 126613LN** — 41mm Oystersteel & 18K Everose gold case, black dial, black Cerachrom ceramic bezel, Oyster bracelet with Glidelock. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Classic alternative to the blue. Market: €20,000–26,000. Elegant restraint.`
  );} },

{ id:'rolex_126618lb', kw:['126618lb','submariner yellow gold','submariner oro giallo','submariner gold blue','yellow gold submariner','submariner 18k oro','full gold blue'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Yellow Gold 41mm'; return t(
    `**Rolex Submariner réf. 126618LB** — Boîtier 41mm or jaune massif 18K, cadran bleu sunburst, lunette céramique bleue, bracelet Oyster or. Mouvement Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Montre de prestige absolu en or massif. Très rare en stock. Marché : 45 000–65 000€. Pour collectionneurs or/bleu.`,
    `**Rolex Submariner ref. 126618LB** — 41mm solid 18K yellow gold case, sunburst blue dial, blue Cerachrom ceramic bezel, yellow gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Absolute prestige in solid gold. Rarely stocked. Market: €45,000–65,000. For yellow gold & blue collectors.`
  );} },

{ id:'rolex_126618ln', kw:['126618ln','submariner yellow gold black','submariner oro giallo nero','yellow gold submariner black','oro giallo submariner','full yellow gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Yellow Gold Black 41mm'; return t(
    `**Rolex Submariner réf. 126618LN** — Boîtier 41mm or jaune massif 18K, cadran noir, lunette céramique noire, bracelet Oyster or massif. Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Reference classique en or complet. Ultra-tradition horlogère. Marché : 42 000–62 000€. Le symbole de la réussite discrète.`,
    `**Rolex Submariner ref. 126618LN** — 41mm solid 18K yellow gold case, black dial, black Cerachrom ceramic bezel, solid gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Classic reference in full gold. Pure watchmaking tradition. Market: €42,000–62,000. Symbol of understated success.`
  );} },

{ id:'rolex_126619lb', kw:['126619lb','submariner white gold','submariner platine','submariner or blanc','white gold submariner blue','platine submariner','pt950','full white gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner White Gold 41mm'; return t(
    `**Rolex Submariner réf. 126619LB** — Boîtier 41mm or blanc massif 18K, cadran bleu sunburst, lunette céramique bleue, bracelet Oyster or blanc. Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Montre royale en or blanc & bleu. Très prestigieuse. Marché : 48 000–68 000€. Pour les collectionneurs de prestige maximal.`,
    `**Rolex Submariner ref. 126619LB** — 41mm solid 18K white gold case, sunburst blue dial, blue Cerachrom ceramic bezel, white gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Royal watch in white gold & blue. Highly prestigious. Market: €48,000–68,000. For maximum prestige collectors.`
  );} },

// DAYTONA PRECIOUS METALS
{ id:'rolex_116503', kw:['116503','daytona two tone','daytona gold steel','daytona oro acciaio','two tone daytona','daytona everose','daytona bicolore'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Two-Tone'; return t(
    `**Rolex Daytona réf. 116503** — Chronographe 40mm bi-matière Acier & or Everose, lunette aluminium peinte blanche, cadran noir, mouvement Zenith El Primero. Référence précédente très classique, 2000–2023. Marché : 16 000–22 000€. Moins cher que le moderne 116500LN mais très appréciée des amateurs.`,
    `**Rolex Daytona ref. 116503** — 40mm two-tone steel & Everose chronograph, white painted aluminum bezel, black dial, Zenith El Primero movement. Classic reference 2000–2023. Market: €16,000–22,000. Less expensive than the modern 116500LN but highly valued by enthusiasts.`
  );} },

{ id:'rolex_116518ln', kw:['116518ln','daytona yellow gold','daytona oysterflex','daytona oro','daytona elastomer','rubber daytona','yellow gold chronograph'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Yellow Gold Oysterflex'; return t(
    `**Rolex Daytona réf. 116518LN** — Chronographe 40mm or jaune massif 18K, lunette aluminium peinte noire, cadran noir, bracelet Oysterflex (caoutchouc haute tech) noir. Mouvement Cal. 4130 (interne Rolex). Production 2015–2020 environ. Très moderne et sportive. Marché : 35 000–50 000€. Amateurs or & caoutchouc technique.`,
    `**Rolex Daytona ref. 116518LN** — 40mm solid 18K yellow gold chronograph, black painted aluminum bezel, black dial, black Oysterflex bracelet (high-tech elastomer). Cal. 4130 movement (in-house Rolex). Made circa 2015–2020. Very modern and sporty. Market: €35,000–50,000. For gold & technical elastomer fans.`
  );} },

{ id:'rolex_126506', kw:['126506','daytona platinum','daytona platine','daytona ice blue','platinum daytona','pt950 daytona','daytona white','ultra prestige'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Platinum Ice Blue'; return t(
    `**Rolex Daytona réf. 126506** — Chronographe 40mm platine massif PT950, cadran gris glace unique, lunette céramique noire Cerachrom, bracelet Oyster platine. Cal. 4130 (70h puissance). Étanche 100m (chronographes moins résistants). Production 2021+. Montre hyperministérielle ultra-rare. Marché : 90 000–140 000€. Collection de légende.`,
    `**Rolex Daytona ref. 126506** — 40mm solid PT950 platinum chronograph, unique ice gray dial, black Cerachrom ceramic bezel, platinum Oyster bracelet. Cal. 4130 (70h power reserve). 100m WR. Made 2021+. Ultra-rare ministerial watch. Market: €90,000–140,000. Legendary collection piece.`
  );} },

// GMT-MASTER PRECIOUS METALS
{ id:'rolex_126711chnr', kw:['126711chnr','gmt root beer','gmt oro','gmt two tone','gmt everose','root beer daytona','two tone gmt','gmt gold steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II Root Beer Two-Tone'; return t(
    `**Rolex GMT-Master II réf. 126711CHNR "Root Beer"** — Boîtier 40mm bi-matière Acier & or Everose, lunette Cerachrom noire-or-noire (Root Beer), cadran noir, mouvement Cal. 3285 (70h, COSC). Étanche 100m. Production 2019+. Combinaison prestigieuse très demandée. Marché : 18 000–24 000€. Liste d'attente longue Rolex.`,
    `**Rolex GMT-Master II ref. 126711CHNR "Root Beer"** — 40mm two-tone steel & Everose case, black-gold-black Cerachrom bezel (Root Beer), black dial, Cal. 3285 movement (70h, COSC). 100m WR. Made 2019+. Highly coveted prestige combination. Market: €18,000–24,000. Long Rolex waitlists.`
  );} },

{ id:'rolex_126715chnr', kw:['126715chnr','gmt everose','gmt full gold','gmt gold only','gmt rose gold','root beer full oro','gmt oro rosa','burgundy bezel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II Everose Root Beer'; return t(
    `**Rolex GMT-Master II réf. 126715CHNR "Root Beer"** — Boîtier 40mm or Everose massif 18K, lunette Cerachrom or-noir-or (Root Beer rose), cadran noir, bracelet Oyster or Everose. Cal. 3285 (70h, COSC). Étanche 100m. Production 2019+. Prestige maximal en or rose. Très rare. Marché : 55 000–80 000€. Pour amateurs or Everose signature Rolex.`,
    `**Rolex GMT-Master II ref. 126715CHNR "Root Beer"** — 40mm solid 18K Everose gold case, rose-gold-black Cerachrom bezel (Root Beer rose), black dial, Everose Oyster bracelet. Cal. 3285 (70h, COSC). 100m WR. Made 2019+. Maximum prestige in rose gold. Very rare. Market: €55,000–80,000. For Rolex Everose signature gold fans.`
  );} },

// DATEJUST PRECIOUS METALS
{ id:'rolex_126331', kw:['126331','datejust 41','dj41 two tone','datejust everose','datejust chocolate','two tone dj','dj41 oro','dj chocolate'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Two-Tone Everose'; return t(
    `**Rolex Datejust réf. 126331** — Boîtier 41mm bi-matière Acier & or Everose, cadran chocolat sunburst signature, lunette lisse or Everose, bracelet Jubilée bi-matière. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Datejust moderne & sophistiqué, cadran ultra-demandé. Marché : 14 000–18 000€. Classique intemporel.`,
    `**Rolex Datejust ref. 126331** — 41mm two-tone steel & Everose case, signature chocolate sunburst dial, smooth Everose bezel, two-tone Jubilée bracelet. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Modern & sophisticated Datejust, ultra-sought dial. Market: €14,000–18,000. Timeless classic.`
  );} },

{ id:'rolex_126333', kw:['126333','datejust 41 yellow gold','dj41 oro','datejust oro giallo','yellow gold datejust','dj41 full gold','oro completo'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Yellow Gold'; return t(
    `**Rolex Datejust réf. 126333** — Boîtier 41mm or jaune massif 18K, cadran at choix (arabe, index, sunburst), lunette lisse or, bracelet Jubilée or. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Montre dressy prestigieuse en or classique. Très portée par cadres/entrepreneurs. Marché : 28 000–38 000€. Pour amateurs or jaune traditionnel.`,
    `**Rolex Datejust ref. 126333** — 41mm solid 18K yellow gold case, choice of dials (Arabic, indices, sunburst), smooth gold bezel, Jubilée bracelet in gold. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Prestige dress watch in classic gold. Worn by executives/entrepreneurs. Market: €28,000–38,000. For traditional yellow gold lovers.`
  );} },

{ id:'rolex_278278', kw:['278278','datejust 31','dj31 yellow gold','datejust 31 oro','small datejust gold','dj 31 giallo','ladies gold dj'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 31 Yellow Gold'; return t(
    `**Rolex Datejust réf. 278278** — Boîtier 31mm or jaune massif 18K, cadran champagne ou bleu, lunette lisse or, bracelet Jubilée or. Cal. 2235 (automatique 55h). Étanche 100m. Production 2020+. Datejust compact & très féminim en or. Alternative aux dames Datejust plus grandes. Marché : 18 000–24 000€. Pour femmes executive prestige.`,
    `**Rolex Datejust ref. 278278** — 31mm solid 18K yellow gold case, champagne or blue dial, smooth gold bezel, Jubilée bracelet in gold. Cal. 2235 movement (automatic, 55h). 100m WR. Made 2020+. Compact & highly feminine Datejust in gold. Alternative to larger ladies Datejust. Market: €18,000–24,000. For prestige executive women.`
  );} },

{ id:'rolex_126300', kw:['126300','datejust 41 steel','dj 41 smooth','datejust acier lisse','smooth dj','steel datejust','dj 41 current','modern dj steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Steel Smooth'; return t(
    `**Rolex Datejust réf. 126300** — Boîtier 41mm Oystersteel, cadran gris sunburst, lunette lisse acier, bracelet Oyster acier Glidelock. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Le Datejust acier moderne & pur, sans relief. Très classique. Marché : 9 000–12 000€. Entrée de gamme DJ prestige.`,
    `**Rolex Datejust ref. 126300** — 41mm Oystersteel case, gray sunburst dial, smooth steel bezel, steel Oyster bracelet with Glidelock. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Modern & pure steel Datejust, smooth finish. Very classic. Market: €9,000–12,000. Entry-level DJ prestige.`
  );} },

// DAY-DATE PRECIOUS METALS
{ id:'rolex_228206', kw:['228206','day date 40','day date platinum','platine day date','platinum president','pt950 day date','ice blue day date'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 40 Platinum'; return t(
    `**Rolex Day-Date réf. 228206** — Boîtier 40mm platine massif PT950, cadran gris glace unique, lunette lisse platine, bracelet President platine. Cal. 3255 (70h, COSC). Étanche 100m. Production 2021+. La montre présidentielle ultime en platine. Extrêmement rare. Marché : 95 000–150 000€. Pour collection hyperministérielle.`,
    `**Rolex Day-Date ref. 228206** — 40mm solid PT950 platinum case, unique ice gray dial, smooth platinum bezel, platinum President bracelet. Cal. 3255 (70h, COSC). 100m WR. Made 2021+. The ultimate presidential watch in platinum. Extremely rare. Market: €95,000–150,000. For top-level collection.`
  );} },

{ id:'rolex_128238', kw:['128238','day date 36','day date yellow gold','day date oro giallo','president 36','small day date','daj 36 oro'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 36 Yellow Gold'; return t(
    `**Rolex Day-Date réf. 128238** — Boîtier 36mm or jaune massif 18K, cadran or/champagne, lunette lisse or, bracelet President or. Cal. 3255 (70h, COSC). Étanche 100m. Production 2020+. La Day-Date classique en petit format or. Très élégante & compacte. Marché : 32 000–45 000€. Pour femmes/hommes aux poignets fins prestige.`,
    `**Rolex Day-Date ref. 128238** — 36mm solid 18K yellow gold case, champagne gold dial, smooth gold bezel, gold President bracelet. Cal. 3255 (70h, COSC). 100m WR. Made 2020+. The classic Day-Date in smaller gold format. Very elegant & compact. Market: €32,000–45,000. For prestige ladies/men with slender wrists.`
  );} },

// YACHT-MASTER PRECIOUS METALS & SPECIAL
{ id:'rolex_226627', kw:['226627','yacht master 42','yacht master titanium','rlx titanium','yacht master grey','yacht master modern','sport tool watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 42 Titanium RLX'; return t(
    `**Rolex Yacht-Master réf. 226627** — Boîtier 42mm RLX Titanium™ (alliage Rolex), cadran gris, lunette Cerachrom grise bidirectionnelle, bracelet Oyster RLX. Cal. 3235 (70h, COSC). Étanche 300m. Production 2023+. Matériau ultra-moderne RLX pour montre sport nautique. Très technique. Marché : 12 000–16 000€. Futur classique.`,
    `**Rolex Yacht-Master ref. 226627** — 42mm RLX Titanium™ (Rolex alloy) case, gray dial, gray bidirectional Cerachrom bezel, RLX Oyster bracelet. Cal. 3235 (70h, COSC). 300m WR. Made 2023+. Ultra-modern RLX material for nautical sport watch. Highly technical. Market: €12,000–16,000. Future classic.`
  );} },

{ id:'rolex_116680', kw:['116680','yacht master ii','yacht master regatta','chronographe yacht','chronograph regatta','yacht master countdown'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master II Regatta'; return t(
    `**Rolex Yacht-Master II réf. 116680** — Chronographe 44mm acier, cadran bleu, compte à rebours mécanique intégré pour régates, lunette Cerachrom bleu, mouvement Cal. 4161 (72h). Étanche 100m (chronographe moins WR). Production 2007–2019. Montre de régate absolue, ultra-spécialisée. Marché : 16 000–22 000€. Pour skipper passionné.`,
    `**Rolex Yacht-Master II ref. 116680** — 44mm steel chronograph, blue dial, integrated mechanical regatta countdown bezel, blue Cerachrom, Cal. 4161 movement (72h). 100m WR. Made 2007–2019. Absolute regatta watch, ultra-specialized. Market: €16,000–22,000. For passionate skippers.`
  );} },

// COSMOGRAPH DAYTONA SPECIAL EDITIONS
{ id:'rolex_116595rbow', kw:['116595rbow','daytona rainbow','daytona gemset','bezel sertis','daytona everose','rainbow bezel','precious stones'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Rainbow Everose Gemset'; return t(
    `**Rolex Daytona réf. 116595RBOW** — Chronographe 40mm or Everose massif, lunette Cerachrom sertie de saphirs/rubis arc-en-ciel (gemset bezel), cadran noir/platine, bracelet Oyster or Everose. Cal. 4130 (70h). Étanche 100m. Production rare/limité 2015+. Montre joaillerie d'exception Rolex. Marché : 80 000–130 000€. Pièce de collection unique.`,
    `**Rolex Daytona ref. 116595RBOW** — 40mm solid Everose gold chronograph, Cerachrom bezel set with rainbow sapphires/rubies (gemset), black/platinum dial, Everose Oyster bracelet. Cal. 4130 (70h). 100m WR. Rare/limited production 2015+. Rolex's exceptional jewellery chronograph. Market: €80,000–130,000. Unique collection piece.`
  );} },

{ id:'rolex_116505', kw:['116505','daytona everose','daytona rose gold','daytona oro rosa','full rose gold daytona','daytona chocolate','everose sportive'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Everose Chocolate'; return t(
    `**Rolex Daytona réf. 116505** — Chronographe 40mm or Everose massif 18K, cadran chocolat sunburst, lunette aluminium peinte (ancien style), bracelet Oyster or Everose. Mouvement Cal. 4130. Étanche 100m. Production 2004–2023. Très appréciée pour ses proportions classiques & couleur or rose chaud. Marché : 28 000–42 000€. Favorite des collectionneurs or.`,
    `**Rolex Daytona ref. 116505** — 40mm solid 18K Everose gold chronograph, chocolate sunburst dial, painted aluminum bezel (classic style), Everose Oyster bracelet. Cal. 4130 movement. 100m WR. Made 2004–2023. Highly appreciated for classic proportions & warm rose gold. Market: €28,000–42,000. Favourite of gold collectors.`
  );} },

// VINTAGE ICONS
{ id:'rolex_1655', kw:['1655','explorer ii','steve mcqueen','vintage explorer','modern explorer','gmt explorer','orange hand'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II Steve McQueen'; return t(
    `**Rolex Explorer II réf. 1655 "Steve McQueen"** — Montre vintage 40mm acier, cadran orange sunburst signature, lunette GMT (deux fuseaux), mouvement cal. 1575 ou 1625 (27 000 tph). Étanche 100m. Production 1971–1980. Portée par l'acteur/pilote Steve McQueen. Montre de légende absolue. Marché : 35 000–65 000€ selon état. Très rare & très demandée.`,
    `**Rolex Explorer II ref. 1655 "Steve McQueen"** — Vintage 40mm steel watch, signature orange sunburst dial, GMT bezel (dual time), cal. 1575 or 1625 movement (27,000 tph). 100m WR. Made 1971–1980. Worn by actor/driver Steve McQueen. Absolute legend watch. Market: €35,000–65,000 depending on condition. Very rare & highly sought.`
  );} },

{ id:'rolex_6542', kw:['6542','gmt original','bakelite bezel','original gmt','bakelite vintage','vintage bakelite','gmt bakelite','first gmt'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT Original Bakelite'; return t(
    `**Rolex GMT-Master réf. 6542** — Montre vintage 40mm acier, cadran noir, lunette bakelite marron iconique (première génération GMT 1955–1959), mouvement cal. 1016 (27 000 tph). Étanche 100m. Production rares années 1950s. Montre génératrice de gamme. Bakelite très fragile (beaucoup détériorés). Marché : 50 000–100 000€ si bakelite intacte. Graal collectionneurs.`,
    `**Rolex GMT-Master ref. 6542** — Vintage 40mm steel watch, black dial, iconic brown bakelite bezel (first GMT generation 1955–1959), cal. 1016 movement (27,000 tph). 100m WR. Rare production in 1950s. Generation-defining watch. Bakelite very fragile (many deteriorated). Market: €50,000–100,000 if bakelite intact. Holy grail for collectors.`
  );} },

{ id:'rolex_1680', kw:['1680','red submariner','submariner rouge','vintage submarine','red dial submariner','ultra rare','maxi dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Red Dial'; return t(
    `**Rolex Submariner réf. 1680** — Montre vintage 40mm acier, cadran ROUGE texturé (extrêmement rare), lunette aluminium peinte noire (pré-céramique), mouvement cal. 1575 (27 000 tph). Étanche 100m. Production années 1960s-early 70s seulement. Très peu fabriquées en rouge. Marché : 80 000–150 000€ selon authenticité. Ultra-rare, presque impossible à trouver.`,
    `**Rolex Submariner ref. 1680** — Vintage 40mm steel watch, RED textured dial (extremely rare), black painted aluminum bezel (pre-ceramic), cal. 1575 movement (27,000 tph). 100m WR. Made 1960s–early 1970s only. Very few produced in red. Market: €80,000–150,000 depending on authentication. Ultra-rare, nearly impossible to find.`
  );} },

{ id:'rolex_6265', kw:['6265','daytona big red','big red daytona','red daytona vintage','cosmograph big red','daytona rouge','daytona paul newman era'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Big Red Vintage'; return t(
    `**Rolex Daytona réf. 6265 "Big Red"** — Chronographe vintage 37mm acier, inscriptions "BIG RED" sur le cadran (années 1978–1982), lunette aluminium peinte, mouvement cal. 727 (19 800 tph, Valjoux). Étanche 100m (chronographe moins WR). Production limitée. Marché : 40 000–80 000€. Très demandée des fans vintage Daytona. Référence culte pré-Paul Newman.`,
    `**Rolex Daytona ref. 6265 "Big Red"** — Vintage 37mm steel chronograph, "BIG RED" dial inscriptions (1978–1982), painted aluminum bezel, cal. 727 movement (19,800 tph, Valjoux). 100m WR. Limited production. Market: €40,000–80,000. Highly sought by vintage Daytona fans. Cult reference pre-Paul Newman era.`
  );} },




{ id:'rolex_126710blro_oyster', kw:['GMT-Master II','Pepsi Oyster','ceramic bezel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II 126710BLRO'; return t(
    `FR: La GMT-Master II 126710BLRO est la version 2023 du legendaire chronographe bizone de Rolex, montee sur bracelet Oyster acier au lieu du Jubilee habituel. Equipee du calibre 3285 de derniere generation (70h reserve de marche, remontage automatique), cette montre 40mm propose la celebre lunette ceramique Pepsi (rouge et bleu) - symbole iconique du modele depuis 1960. L'etanche 100m WR convient aux activites nautiques. Le cadran gris avec aiguille GMT orange offre une lisibilite exceptionnelle pour les voyageurs internationaux. Production limitee, liste d'attente importante. Prix catalogue: €15,950. Successeur de l'ancienne ref 16710 avec mouvements vintage plus lents (48h). Cette version Oyster (vs Jubilee) cible les porteurs preferant un style plus sportif et viril. Collecteurs: modele de transition pendant l'ere CEL/non-CEL du mouvement 3285.`,
    `EN: The 2023 Rolex GMT-Master II reference 126710BLRO is the steel sports watch icon worn by pilots and traders globally, now offered on Oyster bracelet instead of the standard Jubilee. Housing the brand-new caliber 3285 (automatic, 70-hour power reserve, anti-magnetic, certified chronometer), this 40mm wristwatch features the legendary ceramic Pepsi bezel—red and blue—unchanged since 1960. Water-resistant to 100m (330 feet), suitable for recreational diving and water sports. The grey sunburst dial with orange GMT hand enables precise timekeeping across two time zones. Waiting lists at Rolex ADs stretch 2-4 years. Retail price: USD 14,800. This Oyster configuration delivers a sportier aesthetic compared to the traditional Jubilee, preferred by tool-watch enthusiasts. The 3285 movement represents a major upgrade from the 3186/3187 in vintage references—better chronometry, extended longevity, and improved anti-magnetism. Investment grade: consistent secondary market appreciation.`
  );} },

{ id:'rolex_m126234', kw:['Datejust 36','Fluted Jubilee','steel gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 36 M126234'; return t(
    `FR: Le Datejust 36 M126234 est le champion toutes categories pour la premiere montre Rolex classique, combinant elegance intemporelle et polyvalence. Cette montre 36mm en acier ou or blanc avec lunette cannele et bracelet Jubilee represente le summum du design horloger conservateur. Le mouvement calibre 3235 (70h reserve, chronometer certifie) offre fiabilite absolue. Les cadrans disponibles - bleu, gris, noir, blanc - conviennent a tous les environnements professionnels. L'etanche 100m WR suffit pour l'usage quotidien intensif. Ref M (non-Ref A) introduite en 2020 avec amortisseurs suspendus ameliores du garde-temps. Prix: €7,800 acier; €16,950 or blanc. Configuration la plus demandee par les collecteurs novices - equilibre parfait entre prix, style, et desirabilite.`,
    `EN: The Rolex Datejust 36 reference M126234 is the quintessential first luxury watch for discerning collectors, pairing timeless classical design with outstanding versatility. Available in steel or white gold with fluted bezel and Jubilee bracelet, this 36mm dress-sports piece suits boardroom and casual environments equally. The caliber 3235 (70-hour PR, COSC chronometer-certified) delivers exceptional accuracy and reliability—typical 5-8 second/month deviation. Dial choices span slate, blue, black, and champagne—each appropriate for formal occasions and daily wear. Water resistance: 100m (330 feet), adequate for all non-diving activities. The M-series (post-2020) features improved damping and refined dial printing. Retail: USD 7,400 steel; USD 15,450 white gold. Most recommended entry point into Rolex collecting; waitlist 1-2 years at authorized dealers.`
  );} },

{ id:'rolex_126621', kw:['Yacht-Master 40','Everose','two tone'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 40 126621'; return t(
    `FR: Le Yacht-Master 40 126621 conjugue acier Oystersteel et or Everose Rolex en 40mm, offrant un equilibre luxueux entre robustesse et elegance. La lunette tournante unidirectionnelle balistique facilite les calculs de temps de course aux regattas. Le calibre 3235 garantit 70h de reserve de marche et une chronometrie certifiee. Le cadran chocolat caracteristique avec aiguilles Chromalight offre un rendu classique et haut de gamme. Etanche 100m, appropriee pour la navigation et les sports nautiques. Production fine: les deux-tons Rolex sont manufactures avec une precision d'ajustement superieure aux montres monocouleur. Prix: €10,450. Statut de collecteur: moins populaire que Submariner/GMT mais apprecie des aficionados de design minimaliste et de sports nautiques.`,
    `EN: The Rolex Yacht-Master 40 reference 126621 combines Oystersteel and rose gold (Everose) in a 40mm case, balancing sporty durability with refined luxury aesthetics. The unidirectional rotatable bezel with race-timing minute markers simplifies regatta countdown calculations. Powered by the caliber 3235 (automatic, 70-hour power reserve, chronometer-certified), this watch delivers reliability expected of professional maritime instruments. The chocolate dial with Chromalight luminosity coating evokes luxury instrument watches favored by yacht captains. Water-resistant to 100m (330 feet), suitable for recreational sailing and water activities. Two-tone manufacturing demands tighter tolerances than mono-metal cases—visible in superior fit/finish. Retail: USD 9,500. Collecting perspective: less iconic than Submariner/GMT-Master II, but cherished by minimalist collectors and nautical enthusiasts for understated elegance.`
  );} },

{ id:'rolex_226570_white', kw:['Explorer II','White Dial','42mm'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II 226570 White'; return t(
    `FR: Le nouvel Explorer II 226570 cadran blanc (2021) marque la renaissance d'une legende Rolex, offrant une montre d'expedition authentique en 42mm acier. Equipee du calibre 3285 derniere generation (70h reserve, remontage chronometer), cette montre incarne l'heritage Steve McQueen et des expeditions polaires. Le cadran blanc pur avec aiguille GMT orange et index appliques confere une lisiblite polaire absolue. La fonction 24h aide les explorateurs a mesurer jours et nuits aux latitudes extremes. L'etanche 100m suffit pour l'expedition en montagne et forages arktiques. Prix: €6,200. Successeur du 216570, cette version 3285 beneficie d'une chronometrie superieure et d'une anti-magnetisme amelioree (precision montre de poche). Tres demandee par les collecteurs sport-modernes.`,
    `EN: The 2021 Explorer II reference 226570 with white dial resurrects Rolex's expedition-watch heritage in a robust 42mm steel case. Powered by the caliber 3285 (automatic, 70-hour power reserve, COSC chronometer-certified), this tool watch honors the legacy of polar expeditions and Steve McQueen's legendary adventures. The pure white dial with orange 24-hour GMT hand and applied indices provides exceptional readability in snow-glare conditions. The 24-hour hand assists arctic explorers in tracking day/night cycles at extreme latitudes. Water-resistant 100m (330 feet), adequate for mountaineering and polar expeditions. Retail: USD 5,625. Successor to the 216570; this 3285-powered generation achieves superior chronometric performance and enhanced magnetism resistance. Highly sought by modern sport-watch collectors.`
  );} },

{ id:'rolex_226570_black', kw:['Explorer II','Black Dial','tool watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II 226570 Black'; return t(
    `FR: La version cadran noir du meme Explorer II 226570 (2021) perpetue l'aesthetic intemporelle des montres de terrain Rolex, avec meme precision 3285 et etanche 100m WR. Le contraste entre cadran noir mate et aiguille GMT orange accentue la lisibilite dans les conditions extremes. Configuration preferee par les collecteurs apprisant une esthetique plutot militaire et tool-watch. Moins demandee que la version blanche polaire, mais appreciee des amateurs de style classique intemporel. Prix identique a la version blanche: €6,200. Authentique instrument d'expedition moderne.`,
    `EN: The black dial variant of the 2021 Explorer II 226570 maintains Rolex's timeless tool-watch aesthetic, retaining the same caliber 3285 movement and 100m water resistance. The contrast between matte black dial and orange 24-hour GMT hand enhances legibility in harsh field conditions. Preferred by collectors embracing military minimalism and pure tool-watch philosophy. Less pursued than the white Polar variant but appreciated by classicists valuing understated durability. Retail price identical: USD 5,625. A genuine modern expedition instrument without compromise.`
  );} },

{ id:'rolex_326235', kw:['326235','sky dweller everose','rolex sky dweller','sky dweller rose','rolex annual calendar'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Sky-Dweller 326235'; return t(
    `FR: Le Sky-Dweller 326235 en or Everose 42mm est le chef-d'oeuvre ultra-complexe de Rolex pour les pilotes et voyageurs perpetuels. Le calibre 9001 (remontage automatique, 72h reserve, 13 complications) integre un calendrier annuel ne necessitant correction qu'une fois par an. La lunette Command reglee par corone segmentee permet reglages precis du fuso horaire local et heure secondaire. Verre acrylique bombé avec cyclope retro offre charisme vintage. Etanche 100m. Prix: €39,600. Montre la plus techniquement sophistiquee de Rolex - reserve des collecteurs ultra-experts et cadres d'entreprise volant internationalement. Edition limitee annuellement.`,
    `EN: The Rolex Sky-Dweller reference 326235 in 42mm rose gold (Everose) represents Rolex's pinnacle horological complexity, engineered for international pilots and perpetual travelers. The in-house caliber 9001 (automatic, 72-hour power reserve, 13 complications) features an annual calendar requiring only one correction per calendar year. The Command bezel with segmented crown crown allows precise local-time and secondary-time adjustments. The domed acrylic crystal with cyclope magnifier delivers vintage charisma alongside modern legibility. Water-resistant to 100m (330 feet). Retail: USD 36,000. Rolex's most technically sophisticated production watch—reserved for expert collectors and international executives. Annual limited production.`
  );} },

{ id:'rolex_50509', kw:['50509','cellini date','cellini white gold','rolex cellini date','rolex dress watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Cellini Date 50509'; return t(
    `FR: Le Cellini Date 50509 39mm en or blanc Rolex incarne le summum de la montre de ceremonie moderne, avec chaste lunette cannele doublee et boitier lisse reminiscent des montres anciennes. Le calibre 3165 (remontage automatique, 48h reserve) assure precision et fiabilite. Double couronne (une pour date, une pour remontage) offre interface sophistiquee. Etanche 50m - une limite deliberee affirm ant son role comme montre de salon exclusif plutot que quotidienne. Cadran blanc ou noir argent. Prix: €17,500. Rarity absolue dans les portfolios collecteurs Rolex - moins de 2% des montres Rolex vendues. Appreciation historique exceptionnelle.`,
    `EN: The Rolex Cellini Date reference 50509 in 39mm white gold exemplifies modern dress-watch supremacy, with its chaste fluted bezel and polished case echoing vintage timepieces. The caliber 3165 (automatic, 48-hour power reserve) ensures reliable accuracy for formal occasions. Twin crown design (one for date-setting, one for winding) provides sophisticated operational interface. Water-resistant to 50m (164 feet)—deliberately limited to reinforce its exclusive salon-watch positioning rather than daily sports utility. Dial choices: white or silver. Retail: USD 15,950. Absolute rarity within Rolex collector portfolios—fewer than 2% of Rolex annual production. Exceptional historical appreciation trajectory.`
  );} },

{ id:'rolex_m126710blnr_oyster', kw:['GMT-Master II','Batman','Oyster bracelet'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II M126710BLNR'; return t(
    `FR: Le GMT-Master II M126710BLNR sur bracelet Oyster (2023) est la version sportive du mythique Batman noir-bleu, offrant meme calibre 3285 et ceramique lunette mais avec cadran noir plutot que gris. Montee sur bracelet Oyster acier (au lieu du Jubilee standard), cette montre 40mm offre esthetique more robuste et masculine. Reserve 70h, etanche 100m WR. Configuration moins demandee que la version 126710BLRO grise mais appriciee des amateurs de "tool watch" trop purs. Prix: €15,950. Meme famille de references que le Pepsi mais avec colorimetrie inverse pour des collecteurs priorisant une presentation noir-sportive.`,
    `EN: The 2023 GMT-Master II reference M126710BLNR on Oyster bracelet delivers the iconic Batman black-and-blue ceramic bezel in a sportier presentation. Identical caliber 3285 (70-hour power reserve, chronometer-certified) and same 100m water resistance as the Pepsi variant, but with a contrasting black dial. Mounted on Oyster bracelet (rather than standard Jubilee), this 40mm sports watch conveys heightened masculinity and tool-watch ruggedness. Less pursued than the grey-dial Pepsi but favored by pure-sport collectors prioritizing sinister aesthetics. Retail: USD 14,800. Sibling to the Pepsi within the contemporary GMT lineage—preferred by collectors seeking inverted colorimetry.`
  );} },
{ id:'ap_general', kw:['audemars piguet','ap','audemars','piguet','ap watch','montre ap','ap paris','achat ap','vente ap','ap occasion','ap secondhand','ap pre-owned','ap luxe','ap histoire','founded ap','1875 ap','le brassus','vallée de joux','manufacture ap','ap watches','ap models','what ap','which ap','ap available','ap in stock','ap you have','avez vous des ap','got any ap','ap brand','the ap','a ap','ap dealer','revendeur ap','buy ap','acheter ap','ap collection','audemars watches','audemars collection','audemars models','audemars available','piguet watch','AP watch','AP brand'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `AP fondée en 1875 au Brassus, Suisse. Nous avons ${STOCK.filter(w=>w.brand==='Audemars Piguet').length} AP en stock (Royal Oak, Offshore). Quel modèle vous intéresse ?`,
        `AP founded 1875 in Le Brassus, Switzerland. We have ${STOCK.filter(w=>w.brand==='Audemars Piguet').length} AP in stock (Royal Oak, Offshore). Which model interests you?`
      );} },

    { id:'ap_royal_oak', kw:['royal oak','15500','15202','15400','15300','26240','royal oak chronographe','royal oak chrono','royal oak 41','royal oak 37','royal oak tapisserie','tapisserie','grande tapisserie','petite tapisserie','royal oak acier','royal oak bleu','royal oak gris','royal oak cadran','royal oak 39mm','royal oak 41mm','gerald genta','royal oak design','octogonale','8 vis','royal oak grande date'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('royal oak')&&!w.model.toLowerCase().includes('offshore')); return t(
        `Nos Royal Oak :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDesigné par Gérald Genta en 1972. Boîtier octogonal, 8 vis apparentes, bracelet intégré. Cal. 4302 (41mm actuel).`,
        `Our Royal Oaks:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDesigned by Gérald Genta in 1972. Octagonal case, 8 exposed screws, integrated bracelet. Cal. 4302 (current 41mm).`
      );} },

    { id:'ap_offshore', kw:['offshore','royal oak offshore','offshore chronographe','offshore tapisserie','offshore 44','offshore 42','26325','25940','26048','ap offshore acier','ap offshore céramique','offshore lady','offshore titanium','offshore rubber','caoutchouc','offshore code','juan pablo','ap offshore prix','offshore occasion'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('offshore')); return t(
        `Nos Royal Oak Offshore :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nVersion XL du Royal Oak (44mm). Plus sportive, audacieuse, boîtier épais. Chrono cal. 2385.`,
        `Our Royal Oak Offshores:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nOversized Royal Oak (44mm). More bold and sporty, thick case. Chrono cal. 2385.`
      );} },

    { id:'ap_jumbo', kw:['jumbo','15202','39mm ap','ultra thin ap','ultra-thin','extra plat','plat ap','royal oak 39','royal oak jumbo','jumbo ap','jumbo royal oak','5402','5402st','jumbo acier','jumbo or','ap slim','ap mince','original royal oak'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Le Jumbo (réf. 15202ST, 39mm, ultra-plat 8.1mm) est le Royal Oak original de 1972. Marché : 60 000–100 000€ selon état. Pièce collector, nous pouvons sourcer.`,
        `The Jumbo (ref. 15202ST, 39mm, ultra-thin 8.1mm) is the original 1972 Royal Oak. Market: €60,000–100,000 depending on condition. Collector piece, we can source it.`
      );} },

    { id:'ap_code_1159', kw:['code 11.59','code11','1159','code 11','audemars code','code 1159','nouvelle collection ap','new ap','ap 2019','40mm ap','al ehsan','code acier','code or'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Le Code 11.59 (lancé 2019, 40mm) est la nouvelle ligne sport/dress AP. Marché acier ~25 000–35 000€. Nous pouvons en sourcer selon votre configuration.`,
        `Code 11.59 (launched 2019, 40mm) is AP's new sport/dress line. Steel market ~€25,000–35,000. We can source one depending on your configuration.`
      );} },

    { id:'ap_millenary', kw:['millenary','millénaire','ap millenary','millenary ap','77247','77302','15350','millenary ovale','millenary oval','millenary openworked','millenary squelette','millenary femme','millenary women','millenary off-center','millenary dead beat','deadbeat seconds','ap ovale','oval ap'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `La Millenary est la ligne ovale d'AP, cadran décentré, mécanique visible. Femmes (réf. 77247, 77302) et hommes (réf. 15350). Marché 15 000–35 000€. Contactez-nous pour sourcing.`,
        `The Millenary is AP's oval collection, off-center dial, visible mechanics. Ladies (ref. 77247, 77302) and men's (ref. 15350). Market €15,000–35,000. Contact us to source.`
      );} },

    { id:'ap_jules_audemars', kw:['jules audemars','jules ap','ap jules','ap classique','ap dress','ap habillée','15180','15170','26153','26320','minute repeater ap','ap minute repeater','ap tourbillon','ap grande complication','ap sonnerie','ap chiming','ap cathedral','Jules Audemars'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Jules Audemars : la ligne classique/haute horlogerie d'AP. Tourbillons, répétitions minutes, calendriers perpétuels. Boîtier rond, or. Marché 20 000€ à 500 000€+. Contactez-nous.`,
        `Jules Audemars: AP's classic/haute horlogerie line. Tourbillons, minute repeaters, perpetual calendars. Round gold case. Market €20,000 to €500,000+. Contact us.`
      );} },

    { id:'ap_royal_oak_perpetual', kw:['royal oak perpetual calendar','royal oak perpétuel','26574','26574st','26574or','royal oak calendrier','ap perpetual calendar','ap calendrier perpétuel','26586','royal oak 41 calendar','ro perpetual','ro calendar'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Royal Oak Calendrier Perpétuel (réf. 26574, 41mm). Jour, date, mois, phase de lune, cycle bissextile. Marché acier ~90 000–120 000€. Pièce d'exception — contactez-nous.`,
        `Royal Oak Perpetual Calendar (ref. 26574, 41mm). Day, date, month, moon phase, leap year. Steel market ~€90,000–120,000. Exceptional piece — contact us.`
      );} },

    { id:'ap_royal_oak_tourbillon', kw:['royal oak tourbillon','ap tourbillon royal oak','26530','26522','26510','26516','tourbillon ap acier','tourbillon ap or','royal oak flying tourbillon','royal oak skeleton tourbillon','ap squelette tourbillon','ap skeleton tourbillon'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Royal Oak Tourbillon (réf. 26530, 26522). Tourbillon volant, 41mm. Acier ~120 000€+, or ~180 000€+. Savoir-faire haute horlogerie AP au design sportif. Contactez-nous.`,
        `Royal Oak Tourbillon (ref. 26530, 26522). Flying tourbillon, 41mm. Steel ~€120,000+, gold ~€180,000+. AP haute horlogerie in a sporty design. Contact us.`
      );} },

    { id:'ap_royal_oak_concept', kw:['royal oak concept','ap concept','26265','26589','concept ap','concept gmt','concept tourbillon','concept flying tourbillon','concept lab','concept carbone','concept carbon','concept forged carbon','ap futuriste','ap futuristic','ap high tech'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Royal Oak Concept : la ligne avant-gardiste d'AP. Matériaux innovants (carbone forgé, céramique, titane), tourbillons volants, designs futuristes. Marché 100 000€ à 500 000€+. Contactez-nous.`,
        `Royal Oak Concept: AP's avant-garde line. Innovative materials (forged carbon, ceramic, titanium), flying tourbillons, futuristic designs. Market €100,000 to €500,000+. Contact us.`
      );} },

    { id:'ap_royal_oak_selfwinding', kw:['royal oak selfwinding','royal oak automatique','26331','26315','15450','royal oak 37mm','royal oak bleu 41','royal oak noir 41','royal oak argent','26331st','26315st','15450st','royal oak bracelet','royal oak date','royal oak 3 aiguilles','royal oak three hand'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Royal Oak Selfwinding : Chronographe (réf. 26331, 41mm) ou 3 aiguilles (réf. 15450, 37mm). Cadrans bleu, noir, argent. Marché chrono acier ~30 000–45 000€, 3h acier ~25 000–35 000€. Contactez-nous.`,
        `Royal Oak Selfwinding: Chronograph (ref. 26331, 41mm) or 3-hand (ref. 15450, 37mm). Blue, black, silver dials. Chrono steel market ~€30,000–45,000, 3h steel ~€25,000–35,000. Contact us.`
      );} },

    { id:'ap_royal_oak_double_balance', kw:['double balance','double balancier','ap double balance','15416','15407','openworked','openwork ap','squelette royal oak','skeleton royal oak','royal oak openworked','royal oak squelette','ap ajouré','ap openwork'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        `Royal Oak Double Balancier Openworked (réf. 15416, 15407). Mouvement squelette visible, double balancier. Marché or ~60 000–90 000€. Haute horlogerie sport-chic. Contactez-nous.`,
        `Royal Oak Double Balance Openworked (ref. 15416, 15407). Visible skeleton movement, double balance wheel. Gold market ~€60,000–90,000. Sport-chic haute horlogerie. Contact us.`
      );} },




    // ── PATEK PHILIPPE ──────────────────────────────────────────────────────────
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AP EXPANDED REFERENCES (Royal Oak, Royal Oak Offshore, Code 11.59, Millenary)
    // ═══════════════════════════════════════════════════════════════════════════

    { id:'ap_15500st', kw:['15500st','15500','royal oak 41 blue','royal oak bleu','royal oak 41mm','royal oak steel','royal oak acier','blue dial','four digit ref','cal 4302','4302 movement'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Steel'; return t(
        `Royal Oak réf. 15500ST (41mm, acier, cal. 4302, 70h). Le 15500 (2019-présent) est le cœur actuel de la gamme Royal Oak, remplaçant le 15400 depuis 2019. Trois principales variantes de cadran : bleu tropical (le plus demandé), gris ardoise, et noir. Boîtier acier massif avec Grand Tapisserie, bracelet Oyster, fond transparent. Marché : 35 000–48 000€ selon cadran et condition.`,
        `Royal Oak ref. 15500ST (41mm, steel, cal. 4302, 70h). The 15500 (2019-present) is the current heart of the Royal Oak line, replacing the 15400 since 2019. Three main dial variants: tropical blue (most sought), slate grey, black. Solid steel case with Grand Tapisserie, Oyster bracelet, transparent caseback. Market: €35,000–48,000 depending on dial and condition.`
      );} },

    { id:'ap_15510st', kw:['15510st','15510','royal oak gen 2','new generation','generation 2','2022 royal oak','2022 model','cal 4302 new','updated 15500'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Generation 2'; return t(
        `Royal Oak réf. 15510ST (41mm, acier, cal. 4302, 2022+). Version "Gen 2" du 15500 avec trois améliorations clés : nouveau calibre 4302 Plus (vs 4302), bracelet Oyster refondu avec maillon fermé au centre, et finitions boîtier légèrement affinées. Launched 2022, remplace graduellement le 15500. Marché acier : 38 000–50 000€.`,
        `Royal Oak ref. 15510ST (41mm, steel, cal. 4302, 2022+). "Gen 2" version of 15500 with three key upgrades: new 4302 Plus calibre (vs 4302), redesigned Oyster bracelet with solid center link, refined case finishes. Launched 2022, gradually replacing 15500. Market steel: €38,000–50,000.`
      );} },

    { id:'ap_15550st', kw:['15550st','15550','ap selfwinding','royal oak selfwinding 2024','ap 2024','royal oak new 2024','cal 4309','4309'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Selfwinding'; return t(
        `Royal Oak réf. 15550ST (41mm, acier, cal. 4309, 2024+, 70h). Nouvel arrivage 2024 : version "Selfwinding" pure du Royal Oak, mouvement automatique à remontage naturel uniquement (no hand-winding). Calibre 4309 est conçu spécifiquement pour cette ligne. Marché : 40 000–52 000€ (estimé).`,
        `Royal Oak ref. 15550ST (41mm, steel, cal. 4309, 2024+, 70h). New 2024 arrival: pure "Selfwinding" version of Royal Oak, automatic movement with natural winding only (no hand-winding). Calibre 4309 designed specifically for this line. Market: €40,000–52,000 (estimated).`
      );} },

    { id:'ap_16202st', kw:['16202st','16202','jumbo 39mm','extra thin','ultra thin','jumbo replacement','39mm jumbo','2022 jumbo','2022 replacement','newer jumbo'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak "Jumbo" Extra-Thin 39mm'; return t(
        `Royal Oak réf. 16202ST (39mm, acier, 8.1mm épaisseur, cal. 3120, 2022+). Le 16202 est le successeur direct du 15202ST (Jumbo classique). Même boîtier ultra-plat légendaire, même mouvement cal. 3120, mais finitions légèrement modernisées (lunette, bracelet). Remplace le 15202 depuis 2022. Marché : 65 000–95 000€ selon condition.`,
        `Royal Oak ref. 16202ST (39mm, steel, 8.1mm thickness, cal. 3120, 2022+). Direct successor to 15202ST (classic Jumbo). Same legendary ultra-thin case, same 3120 calibre, but refined finishes (bezel, bracelet). Replaces 15202 since 2022. Market: €65,000–95,000 depending on condition.`
      );} },

    { id:'ap_15300st', kw:['15300st','15300','39mm royal oak','39mm','2005 2012','older 39','vintage 39','cal 3120','previous generation','early 2000s'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 39mm (2005–2012)'; return t(
        `Royal Oak réf. 15300ST (39mm, acier, cal. 3120, 2005–2012). Version précédente de Royal Oak 39mm, avant le 15400. Calibre 3120 (le même que le Jumbo 15202). Boîtier légèrement différent du 15400 (finitions, petit Tapisserie vs Grand Tapisserie débattue). Modèle très recherché en marché secondaire. Marché : 35 000–50 000€ selon état.`,
        `Royal Oak ref. 15300ST (39mm, steel, cal. 3120, 2005–2012). Earlier 39mm Royal Oak before 15400. 3120 calibre (same as Jumbo 15202). Case slightly different from 15400 (finishes, dial tapisserie). Highly sought in secondary market. Market: €35,000–50,000 depending on condition.`
      );} },

    { id:'ap_15400st', kw:['15400st','15400','15400st','41mm 2012 2021','older 41mm','previous 41mm','2012 2021 model','before 15500','cal 3120 41mm'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm (2012–2021)'; return t(
        `Royal Oak réf. 15400ST (41mm, acier, cal. 3120, 2012–2021). Version précédente du 41mm Royal Oak, avant le 15500 (2019). Mouvement cal. 3120. Remplacé par le 15500 à partir de 2019, puis le 15510 en 2022. Marché secondaire : 32 000–45 000€ selon condition et cadran.`,
        `Royal Oak ref. 15400ST (41mm, steel, cal. 3120, 2012–2021). Earlier 41mm Royal Oak before 15500 (2019). 3120 calibre. Replaced by 15500 starting 2019, then 15510 in 2022. Secondary market: €32,000–45,000 depending on condition and dial.`
      );} },

    { id:'ap_15450st', kw:['15450st','15450','37mm','small','smaller','37mm steel','ladies size','dress','dress code','mini royal oak'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 37mm Steel'; return t(
        `Royal Oak réf. 15450ST (37mm, acier, cal. 4302, 2022+). Version 37mm du Royal Oak, positionnée comme "petite" ou "dress" Royal Oak. Parfois portée par femmes et hommes ayant un poignet fin. Cadrans disponibles : bleu, noir, gris. Marché : 30 000–40 000€.`,
        `Royal Oak ref. 15450ST (37mm, steel, cal. 4302, 2022+). 37mm version of Royal Oak, positioned as "small" or "dress" Royal Oak. Sometimes worn by women and thin-wrist men. Available dials: blue, black, grey. Market: €30,000–40,000.`
      );} },

    { id:'ap_15500or', kw:['15500or','15500 rose gold','rose gold 41mm','or rose','royal oak or','pink gold','yellow gold','gold royal oak'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Rose Gold'; return t(
        `Royal Oak réf. 15500OR (41mm, or rose 18k, cal. 4302, 70h). Version or rose du 15500 actuel. Boîtier massif or rose 18 carats avec Grand Tapisserie, bracelet or rose Oyster. Trois cadrans : bleu, gris, noir. Marché : 85 000–120 000€ selon cadran et condition.`,
        `Royal Oak ref. 15500OR (41mm, 18k rose gold, cal. 4302, 70h). Rose gold version of current 15500. Solid 18k rose gold case with Grand Tapisserie, rose gold Oyster bracelet. Three dials: blue, grey, black. Market: €85,000–120,000 depending on dial and condition.`
      );} },

    { id:'ap_26574st', kw:['26574st','26574','ap perpetual calendar','perpetual calendar ap','perpetuel 41','royal oak perpetual calendar','4100 calibre','cal 4100','ap calendrier perpetuel'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Perpetual Calendar 41mm'; return t(
        `Royal Oak réf. 26574ST (41mm, acier, cal. 4100, perpétuel, 41mm, 40h). L'une des complications phares d'AP : jour, date, mois, phase de lune, cycle bissextile. Calibre 4100 visible via fond transparent (squelette partiel). Remontage manuel, 40h. Marché : 180 000–250 000€.`,
        `Royal Oak ref. 26574ST (41mm, steel, cal. 4100, perpetual, 40h). One of AP's flagship complications: day, date, month, moon phase, leap year. 4100 calibre visible via transparent caseback (partial skeletonization). Manual winding, 40h. Market: €180,000–250,000.`
      );} },

    { id:'ap_26574or', kw:['26574or','26574 rose gold','perpetual or','perpetual rose gold','perpetual calendar gold','or rose perpetuel','gold calendar'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Perpetual Calendar Rose Gold'; return t(
        `Royal Oak réf. 26574OR (41mm, or rose 18k, cal. 4100, perpétuel, 40h). Version or rose de la perpétuelle calendrier. Boîtier massif or rose, mêmes complications (jour, date, mois, phase lune, cycle bissextile), cal. 4100. Très rare. Marché : 280 000–380 000€.`,
        `Royal Oak ref. 26574OR (41mm, 18k rose gold, cal. 4100, perpetual, 40h). Rose gold version of perpetual calendar. Solid rose gold case, same complications (day, date, month, moon phase, leap year), 4100 calibre. Very rare. Market: €280,000–380,000.`
      );} },

    { id:'ap_26315st', kw:['26315st','26315','chronograph 38mm','38mm chrono','vintage chronograph','2015 2020','small chrono','cal 2385','2385 movement','flyback'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph 38mm'; return t(
        `Royal Oak réf. 26315ST (38mm, acier, cal. 2385 (flyback), 2015–2020). Version compacte du chronographe Royal Oak. Calibre 2385 automatique avec chronographe flyback. Discontinued environ 2020, remplacé par le 26510 (41mm). Marché secondaire : 55 000–75 000€.`,
        `Royal Oak ref. 26315ST (38mm, steel, cal. 2385 flyback, 2015–2020). Compact version of Royal Oak Chronograph. 2385 automatic calibre with flyback chronograph. Discontinued around 2020, replaced by 26510 (41mm). Secondary market: €55,000–75,000.`
      );} },

    { id:'ap_26510st', kw:['26510st','26510','chronograph 41mm','41mm chrono','current chrono','2022','new chrono','flyback chrono','cal 2385','2385','integrated chronograph'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph 41mm (2022+)'; return t(
        `Royal Oak réf. 26510ST (41mm, acier, cal. 2385 (flyback), 2022+). Le chronographe Royal Oak actuel, nouveau design 2022. Mouvement automatique 2385 avec chrono flyback intégré (non-modular). Boîtier 41mm Grand Tapisserie, lunette tachymétrique, bracelet Oyster. Marché : 60 000–85 000€.`,
        `Royal Oak ref. 26510ST (41mm, steel, cal. 2385 flyback, 2022+). Current Royal Oak Chronograph, new 2022 design. 2385 automatic with integrated flyback chrono (non-modular). 41mm case with Grand Tapisserie, tachymetric bezel, Oyster bracelet. Market: €60,000–85,000.`
      );} },

    { id:'ap_26230st', kw:['26230st','26230','older chronograph','vintage chrono','2000s chrono','previous chrono','retro chrono','cal 2225','2225 movement'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph 41mm (Vintage)'; return t(
        `Royal Oak réf. 26230ST (41mm, acier, cal. 2225, 2000–2015 env.). Version plus ancienne du Royal Oak chronographe. Calibre 2225. Discontinued et remplacé par des nouveaux modèles. Marché secondaire : 45 000–65 000€ selon condition et patine.`,
        `Royal Oak ref. 26230ST (41mm, steel, cal. 2225, circa 2000–2015). Older version of Royal Oak Chronograph. 2225 calibre. Discontinued and replaced by newer models. Secondary market: €45,000–65,000 depending on condition and patina.`
      );} },

    { id:'ap_26331st', kw:['26331st','26331','two tone','white gold steel','chronograph two tone','bi-metal','40mm bi metal','cal 2385'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph 41mm Two-Tone'; return t(
        `Royal Oak réf. 26331ST (41mm, acier + or blanc 18k, cal. 2385, 2010–2020 env.). Chronographe bi-métal : lunette and bracelet or blanc, boîtier acier. Très équilibré. Cal. 2385 automatique flyback. Marché : 75 000–105 000€.`,
        `Royal Oak ref. 26331ST (41mm, steel + 18k white gold, cal. 2385, circa 2010–2020). Bi-metal chronograph: white gold bezel and bracelet, steel case. Highly balanced. 2385 automatic flyback. Market: €75,000–105,000.`
      );} },

    { id:'ap_15407st', kw:['15407st','15407','double balance','double balancier','ap openworked','ap skeleton','royal oak skeleton','visible mouvement','open work','balance wheel visible','cal 3109'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Double Balance Openworked'; return t(
        `Royal Oak réf. 15407ST (41mm, acier, cal. 3109 double-balancier, squelette/openworked, 40h). Ligne "horloger" du Royal Oak : mouvement double balancier visible au cadran et au dos. Remontage manuel. Très technique, très rare. Marché : 120 000–170 000€.`,
        `Royal Oak ref. 15407ST (41mm, steel, cal. 3109 double-balance, skeletonized/openworked, 40h). "Master watchmaker" line of Royal Oak: double-balance movement visible front and back. Manual winding. Highly technical, very rare. Market: €120,000–170,000.`
      );} },

    { id:'ap_15416ce', kw:['15416ce','15416','ceramic','perpetual ceramic','perpetual calendar ceramic','ceramic case','white ceramic','cal 4100'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Perpetual Calendar Ceramic'; return t(
        `Royal Oak réf. 15416CE (41mm, céramique blanche, cal. 4100, perpétuel). Une des rares AP en céramique : boîtier blanc céramique. Perpétuelle calendrier complète (jour, date, mois, phase lune, bissextile), cal. 4100. Extrêmement rare. Marché : 250 000–350 000€+.`,
        `Royal Oak ref. 15416CE (41mm, white ceramic, cal. 4100, perpetual). One of the rare AP in ceramic: white ceramic case. Full perpetual calendar (day, date, month, moon phase, leap year), 4100 calibre. Extremely rare. Market: €250,000–350,000+.`
      );} },

    { id:'ap_15202ip', kw:['15202ip','15202','titanium platinum','50th anniversary','anniversary jumbo','ti pt','ti platinum','special edition','jubilee'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Jumbo 50th Anniversary'; return t(
        `Royal Oak réf. 15202IP (39mm, titane + platine, 8.1mm ultra-thin, cal. 3120, 2022). Édition 50e anniversaire du Jumbo original (1972–2022). Boîtier composé : lunette/bracelet en titane, bezel en platine. Ultra limité. Marché : 120 000–180 000€.`,
        `Royal Oak ref. 15202IP (39mm, titanium + platinum, 8.1mm ultra-thin, cal. 3120, 2022). 50th anniversary edition of original Jumbo (1972–2022). Composite case: titanium bezel/bracelet, platinum crown. Ultra-limited. Market: €120,000–180,000.`
      );} },

    // ─── OFFSHORE FAMILY ───

    { id:'ap_26470st', kw:['26470st','26470','offshore chronograph 42','offshore 42 chrono','current offshore','2022 offshore','42mm offshore','cal 2385 offshore','integrated flyback'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Chronograph 42mm'; return t(
        `Royal Oak Offshore réf. 26470ST (42mm, acier, cal. 2385 flyback, 2022+). Le chronographe Offshore actuel. Boîtier 42mm massif acier avec Grande Tapisserie (plus épais que la Royal Oak). Lunette tachymétrique, cadrans sportifs (noir, bleu tropical, gris). Marché : 75 000–105 000€.`,
        `Royal Oak Offshore ref. 26470ST (42mm, steel, cal. 2385 flyback, 2022+). Current Offshore Chronograph. Solid 42mm steel case with Grande Tapisserie (thicker than Royal Oak). Tachymetric bezel, sporty dials (black, tropical blue, grey). Market: €75,000–105,000.`
      );} },

    { id:'ap_26238or', kw:['26238or','26238','offshore 42mm rose gold','offshore rose gold','or rose offshore','gold offshore','42mm or'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore 42mm Rose Gold'; return t(
        `Royal Oak Offshore réf. 26238OR (42mm, or rose 18k, cal. 3120 auto, 2010–2020 env.). Version or rose du Offshore. Boîtier massif or rose 42mm avec Grande Tapisserie plus prononcée, bracelet or rose. Cadrans noir ou bleu tropical. Marché : 150 000–220 000€.`,
        `Royal Oak Offshore ref. 26238OR (42mm, 18k rose gold, cal. 3120 auto, circa 2010–2020). Rose gold version of Offshore. Solid 42mm rose gold case with pronounced Grande Tapisserie, rose gold bracelet. Black or tropical blue dials. Market: €150,000–220,000.`
      );} },

    { id:'ap_15720st', kw:['15720st','15720','offshore diver','diver 42mm','diving watch','diver offshore','rubber strap','diver steel','cal 4161'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Diver 42mm'; return t(
        `Royal Oak Offshore réf. 15720ST (42mm, acier, cal. 4161, 300m water resistance, 2019+). Montre de plongée intégrée à la gamme Offshore. Calibre 4161 automatique. Chronographe intégré, bracelet caoutchouc. 300m étanche. Marché : 65 000–90 000€.`,
        `Royal Oak Offshore ref. 15720ST (42mm, steel, cal. 4161, 300m water resistance, 2019+). Diving watch integrated in Offshore line. 4161 automatic calibre. Integrated chronograph, rubber bracelet. 300m water resistant. Market: €65,000–90,000.`
      );} },

    { id:'ap_26400io', kw:['26400io','26400','rubberclad ceramic','ceramic offshore','black ceramic','rubberclad','integrated rubber','ceramic case','special coating'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore "Rubberclad" Ceramic'; return t(
        `Royal Oak Offshore réf. 26400IO (42mm, céramique noire + "rubberclad", 2018+). Matériau exclusif AP : boîtier céramique noir avec revêtement caoutchouc tendre intégré. Aspect mat/sportif extrême. Marché : 180 000–280 000€.`,
        `Royal Oak Offshore ref. 26400IO (42mm, black ceramic + "rubberclad", 2018+). Exclusive AP material: black ceramic case with integrated soft rubber coating. Extreme matte/sporty look. Market: €180,000–280,000.`
      );} },

    { id:'ap_26405ce', kw:['26405ce','26405','ceramic camouflage','camo','camouflage offshore','offshore camo','black ceramic camo','sporty camo'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Chronograph Ceramic Camo'; return t(
        `Royal Oak Offshore réf. 26405CE (42mm, céramique noire avec motif camouflage, 2016–2020 env.). Édition Offshore avec cadran camouflage imprimé et boîtier/lunette céramique noire. Aspect très agressif. Marché : 160 000–240 000€.`,
        `Royal Oak Offshore ref. 26405CE (42mm, black ceramic with camouflage dial, circa 2016–2020). Offshore edition with printed camo dial and black ceramic case/bezel. Very aggressive look. Market: €160,000–240,000.`
      );} },

    { id:'ap_26170st', kw:['26170st','26170','offshore chronograph previous','older offshore chrono','vintage offshore','2005 2015','cal 2225 offshore'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Chronograph (Previous Gen)'; return t(
        `Royal Oak Offshore réf. 26170ST (42mm, acier, cal. 2225, 2005–2015 env.). Version antérieure du chronographe Offshore. Calibre 2225. Discontinued. Marché secondaire : 50 000–75 000€ selon état.`,
        `Royal Oak Offshore ref. 26170ST (42mm, steel, cal. 2225, circa 2005–2015). Earlier Offshore Chronograph. 2225 calibre. Discontinued. Secondary market: €50,000–75,000 depending on condition.`
      );} },

    { id:'ap_26231st', kw:['26231st','26231','chronograph glass back','offshore glass back','exhibition caseback','display back','vintage display'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Chronograph Glass Back'; return t(
        `Royal Oak Offshore réf. 26231ST (42mm, acier, cal. 2225, exhibition caseback, 2000–2010 env.). Variante rare Offshore avec boîtier verre arrière transparent (monvement visible). Discontinued. Marché : 60 000–90 000€.`,
        `Royal Oak Offshore ref. 26231ST (42mm, steel, cal. 2225, exhibition caseback, circa 2000–2010). Rare Offshore variant with transparent glass caseback (visible movement). Discontinued. Market: €60,000–90,000.`
      );} },

    // ─── CODE 11.59 FAMILY ───

    { id:'ap_26393or', kw:['26393or','26393','code 11.59 chronograph','code 11.59 chrono','code 11.59 rose gold','code chrono or','integrated chronograph code'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Chronograph Rose Gold'; return t(
        `Code 11.59 réf. 26393OR (41mm, or rose 18k, cal. 4401 intégré, 2019+). La ligne CODE 11.59 ("11:59", dernière minute) est la nouvelle collection sport/dress d'AP (lancée 2019). Boîtier octogonal inédit avec chronographe intégré au mouvement. Marché : 180 000–260 000€.`,
        `Code 11.59 ref. 26393OR (41mm, 18k rose gold, cal. 4401 integrated, 2019+). CODE 11.59 line ("11:59", last minute) is AP's new sport/dress collection (launched 2019). Unique octagonal case with integrated chronograph. Market: €180,000–260,000.`
      );} },

    { id:'ap_15210cr', kw:['15210cr','15210','code 11.59 selfwinding','code selfwinding','code 11.59 auto','code rose gold','white gold code','41mm code selfwinding'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Selfwinding Rose Gold'; return t(
        `Code 11.59 réf. 15210CR (41mm, or rose 18k, cal. 4202 auto, 2019+). Montre 3-aiguilles pure de la ligne CODE 11.59. Boîtier octogonal signature avec cadrans variés. Calibre 4202 automatique, 70h. Marché : 140 000–190 000€.`,
        `Code 11.59 ref. 15210CR (41mm, 18k rose gold, cal. 4202 auto, 2019+). Pure 3-hand version of CODE 11.59 line. Signature octagonal case with varied dials. 4202 automatic, 70h. Market: €140,000–190,000.`
      );} },

    { id:'ap_26396or', kw:['26396or','26396','code 11.59 perpetual calendar','code perpétuelle','code calendar','code 4400','annual calendar code'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Perpetual Calendar'; return t(
        `Code 11.59 réf. 26396OR (41mm, or rose 18k, cal. 4400 perpétuel, 2019+). Calendrier perpétuel intégré à la gamme CODE 11.59. Jour, date, mois, phase lune, cycle bissextile. Très complex. Marché : 250 000–360 000€.`,
        `Code 11.59 ref. 26396OR (41mm, 18k rose gold, cal. 4400 perpetual, 2019+). Perpetual calendar integrated into CODE 11.59 line. Day, date, month, moon phase, leap year. Highly complex. Market: €250,000–360,000.`
      );} },

    { id:'ap_26397or', kw:['26397or','26397','code 11.59 minute repeater','code repeater','code minute repeater','code sonerie','minute repeater code','haute complication'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Minute Repeater'; return t(
        `Code 11.59 réf. 26397OR (41mm, or rose 18k, cal. 4403 répétition minutes, 2019+). L'une des complications ultimes : répétition minutes (sonnerie heures-quarts-minutes). Pièce de manufacture, ultra-limitée. Marché : 380 000–520 000€+.`,
        `Code 11.59 ref. 26397OR (41mm, 18k rose gold, cal. 4403 minute repeater, 2019+). One of the ultimate complications: minute repeater (hour-quarter-minute chime). Manufacture piece, ultra-limited. Market: €380,000–520,000+.`
      );} },

    // ─── OTHER COLLECTIONS ───

    { id:'ap_77244or', kw:['77244or','77244','royal oak mini 34mm','royal oak mini','royal oak ladies','34mm','petit royal oak','mini','compact royal oak','cal 2671'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Mini 34mm Ladies'; return t(
        `Royal Oak réf. 77244OR (34mm, or rose 18k, cal. 2671 auto, 2019+). La Royal Oak compacte (parfois appelée "Mini" bien qu'officiellement "mini" ne soit pas le nom). 34mm, mouvement automatique 2671. Très demandée. Marché : 75 000–110 000€.`,
        `Royal Oak ref. 77244OR (34mm, 18k rose gold, cal. 2671 auto, 2019+). The compact Royal Oak (sometimes called "Mini" though officially not). 34mm, automatic 2671 movement. Highly sought. Market: €75,000–110,000.`
      );} },

    { id:'ap_67651st', kw:['67651st','67651','royal oak quartz 33mm','royal oak quartz','quartz ladies','33mm quartz','battery royal oak','affordable royal oak'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Quartz 33mm Ladies'; return t(
        `Royal Oak réf. 67651ST (33mm, acier, quartz, 2010–2020 env.). Montre quartz AP : Royal Oak compacte avec mouvement à quartz (batterie, non mécanique). Moins chère. Marché secondaire : 20 000–30 000€.`,
        `Royal Oak ref. 67651ST (33mm, steel, quartz, circa 2010–2020). AP quartz watch: compact Royal Oak with battery-powered quartz movement (non-mechanical). More affordable. Secondary market: €20,000–30,000.`
      );} },

    { id:'ap_26600ce', kw:['26600ce','26600','offshore flyback chronograph','offshore flyback','ceramic offshore chronograph','special edition offshore','44mm offshore'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Flyback Chronograph'; return t(
        `Royal Oak Offshore réf. 26600CE (44mm, céramique noire, cal. 2385 flyback, 2020+). Version ultime Offshore : 44mm céramique (plus grand que la standard 42mm), chronographe flyback intégré. Très imposant et rare. Marché : 200 000–300 000€.`,
        `Royal Oak Offshore ref. 26600CE (44mm, black ceramic, cal. 2385 flyback, 2020+). Ultimate Offshore: 44mm ceramic (larger than standard 42mm), integrated flyback chronograph. Very imposing and rare. Market: €200,000–300,000.`
      );} },

    { id:'ap_millenary_4101', kw:['4101','millenary 4101','millenary open work','open work','skeleton millenary','oval millenary','movement visible','décentré'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Millenary 4101 Openworked'; return t(
        `Millenary réf. 15350 (cal. 4101 openworked, 47mm ovale, 2017+). Ligne Millenary : boîtier ovale signature AP avec mouvement visible au cadran décentré. Calibre 4101 squelette. Très technique et très rare. Marché : 150 000–220 000€.`,
        `Millenary ref. 15350 (cal. 4101 openworked, 47mm oval, 2017+). Millenary line: AP's signature oval case with off-center movement visible on dial. Skeletonized 4101 calibre. Highly technical and rare. Market: €150,000–220,000.`
      );} },

// ═══ AUDEMARS PIGUET EXPANDED REFERENCES ═══════════════════════════════════

// ROYAL OAK ADVANCED REFERENCES
{ id:'ap_15500ti', kw:['15500ti','royal oak titanium','royal oak titane','ro titanium','ap titanium','lightweight royal oak','titanium sports'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Titanium'; return t(
    `**Audemars Piguet Royal Oak réf. 15500ST (Titanium)** — Boîtier 41mm titane ultra-léger (seulement quelques références), cadran bleu ou gris, lunette intégrée titane, bracelet Royal Oak titane. Cal. 4302 (70h, chronométrie COSC). Étanche 100m. Production très limitée 2021+. Montre sport-technique en matériau ultra-premium. Marché : 65 000–95 000€. Pour amateurs titane prestige.`,
    `**Audemars Piguet Royal Oak ref. 15500ST (Titanium)** — 41mm ultra-lightweight titanium case (only select references), blue or gray dial, integrated titanium bezel, titanium Royal Oak bracelet. Cal. 4302 (70h, COSC). 100m WR. Very limited production 2021+. Sport-technical watch in ultra-premium material. Market: €65,000–95,000. For prestige titanium enthusiasts.`
  );} },

{ id:'ap_26591ti', kw:['26591ti','royal oak chronograph','royal oak chrono titanium','ro chrono','ap titanium chrono','integrated chronograph','sports chronograph'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph Titanium'; return t(
    `**Audemars Piguet Royal Oak Chronograph réf. 26591TI** — Chronographe 41mm titane, cadran bleu ou noir, compteurs intégrés, lunette octogonale titane, bracelet Royal Oak titane. Cal. 4401 (70h, chronométrie COSC). Étanche 100m. Production 2023+. Chronographe sport prestigieux ultra-moderne. Très rare. Marché : 120 000–180 000€. Pièce technique ultime.`,
    `**Audemars Piguet Royal Oak Chronograph ref. 26591TI** — 41mm titanium chronograph, blue or black dial, integrated chronograph counters, octagonal titanium bezel, titanium Royal Oak bracelet. Cal. 4401 (70h, COSC). 100m WR. Made 2023+. Ultra-modern prestige sports chronograph. Very rare. Market: €120,000–180,000. Ultimate technical piece.`
  );} },

{ id:'ap_15202xt', kw:['15202xt','royal oak jumbo','royal oak titanium gold','50th anniversary','limited edition','two tone oak'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Jumbo 50th Anniversary'; return t(
    `**Audemars Piguet Royal Oak Jumbo réf. 15202XT (50th Anniversaire)** — Boîtier 39mm bi-matière titane & or blanc (édition spéciale 50 ans), cadran bleu, lunette intégrée, bracelet mixte. Cal. 3132 (automatique, 54h). Étanche 100m. Production édition limitée 2022. Montre commémorative prestigieuse. Marché : 85 000–130 000€. Collectionneurs anniversaire.`,
    `**Audemars Piguet Royal Oak Jumbo ref. 15202XT (50th Anniversary)** — 39mm two-tone titanium & white gold case (special 50-year edition), blue dial, integrated bezel, mixed bracelet. Cal. 3132 movement (automatic, 54h). 100m WR. Limited edition production 2022. Prestigious commemorative watch. Market: €85,000–130,000. Anniversary collectors.`
  );} },

{ id:'ap_77350sr', kw:['77350sr','royal oak ladies','royal oak 34','small royal oak','womens royal oak','rose gold oak','ladies prestige'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 34mm Ladies Rose Gold'; return t(
    `**Audemars Piguet Royal Oak réf. 77350SR** — Boîtier 34mm or rose massif 18K, cadran bleu, lunette intégrée or rose, bracelet Royal Oak or rose. Cal. 3120 (55h). Étanche 100m. Production 2020+. Montre féminine prestige signature AP. Très élégante & compacte. Marché : 55 000–80 000€. Pour femmes executives prestige.`,
    `**Audemars Piguet Royal Oak ref. 77350SR** — 34mm solid 18K rose gold case, blue dial, integrated rose gold bezel, rose gold Royal Oak bracelet. Cal. 3120 movement (55h). 100m WR. Made 2020+. Signature AP prestige ladies watch. Very elegant & compact. Market: €55,000–80,000. For prestige executive women.`
  );} },

// OFFSHORE EXPANDED
{ id:'ap_26420so', kw:['26420so','offshore 43','offshore steel','offshore ceramic','modern offshore','offshore chronograph','sport offshore'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore 43mm Steel/Ceramic'; return t(
    `**Audemars Piguet Offshore réf. 26420SO** — Chronographe 43mm acier & céramique noire, cadran noir, lunette Cerachrom noire bidirectionnelle, bracelet intégré acier. Cal. 4401 (70h, COSC). Étanche 300m. Production 2023+. Montre ultra-sportive & aquatique moderne. Très technique. Marché : 75 000–110 000€. Pour passionnés offshore sport.`,
    `**Audemars Piguet Offshore ref. 26420SO** — 43mm steel & black ceramic chronograph, black dial, black bidirectional Cerachrom bezel, integrated steel bracelet. Cal. 4401 (70h, COSC). 300m WR. Made 2023+. Ultra-modern sporty & aquatic watch. Highly technical. Market: €75,000–110,000. For offshore sport enthusiasts.`
  );} },

{ id:'ap_26420ti', kw:['26420ti','offshore titanium','offshore vert','offshore green','titanium offshore','lightweight offshore','sports titanium'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Titanium Green'; return t(
    `**Audemars Piguet Offshore réf. 26420TI** — Chronographe 43mm titane ultra-léger, cadran vert distinctif, lunette Cerachrom verte, bracelet Offshore titane intégré. Cal. 4401 (70h, COSC). Étanche 300m. Production 2021+. Montre sport ultra-premium en titane avec couleur contemporaine. Marché : 95 000–140 000€. Amateurs titane & couleur.`,
    `**Audemars Piguet Offshore ref. 26420TI** — 43mm ultra-lightweight titanium chronograph, distinctive green dial, green Cerachrom bezel, integrated titanium Offshore bracelet. Cal. 4401 (70h, COSC). 300m WR. Made 2021+. Ultra-premium sport watch in titanium with contemporary color. Market: €95,000–140,000. Titanium & color enthusiasts.`
  );} },

{ id:'ap_15710st', kw:['15710st','offshore diver','offshore 42mm','diving offshore','underwater offshore','previous generation','discontinued offshore'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Diver 42mm Previous Gen'; return t(
    `**Audemars Piguet Offshore Diver réf. 15710ST** — Chronographe 42mm acier, cadran noir, lunette Cerachrom noire, bracelet intégré acier. Cal. 3125 ou 4401 selon année. Étanche 300m. Production 2016–2023. Montre de plongée/sport signature Offshore. Très portée. Marché : 45 000–65 000€ (ancien modèle moins cher). Excellent rapport qualité-prix.`,
    `**Audemars Piguet Offshore Diver ref. 15710ST** — 42mm steel chronograph, black dial, black Cerachrom bezel, integrated steel bracelet. Cal. 3125 or 4401 depending on year. 300m WR. Made 2016–2023. Signature Offshore diving/sport watch. Widely worn. Market: €45,000–65,000 (older model less expensive). Excellent value-to-quality ratio.`
  );} },

// CODE 11.59 SPECIAL
{ id:'ap_26395bc', kw:['26395bc','code 11.59 starwheel','code starwheel','white gold code','ap starwheel','code 11.59 blanc'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Starwheel White Gold'; return t(
    `**Audemars Piguet Code 11.59 Starwheel réf. 26395BC** — Montre haute complication 41mm or blanc massif 18K, cadran très complexe avec roue Starwheel étoilée, mouvement perpétuel perpétuel. Cal. 4600 ultra-complexe. Étanche 100m. Production très rare 2020+. Montre horlogère d'exception AP. Marché : 200 000–350 000€. Pour collectionneurs haute complication.`,
    `**Audemars Piguet Code 11.59 Starwheel ref. 26395BC** — 41mm solid 18K white gold haute complication watch, highly complex dial with iconic Starwheel design, perpetual calendar movement. Ultra-complex Cal. 4600. 100m WR. Very rare production 2020+. Exceptional AP watchmaking. Market: €200,000–350,000. For haute complication collectors.`
  );} },

{ id:'ap_26398or', kw:['26398or','code 11.59 tourbillon','flying tourbillon ap','ap tourbillon','or rose code','rose gold code','code 11.59 flying'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Flying Tourbillon'; return t(
    `**Audemars Piguet Code 11.59 Flying Tourbillon réf. 26398OR** — Montre ultra-complication 41mm or rose massif 18K, tourbillon volant visible au-dessus du cadran, mécanisme haute horlogerie. Cal. 4603 (ultra-complexe, 72h). Étanche 100m. Production très limitée 2018+. Montre de génie horloger pur. Marché : 180 000–300 000€. Pièce d'art pour collectionneurs élite.`,
    `**Audemars Piguet Code 11.59 Flying Tourbillon ref. 26398OR** — 41mm solid 18K rose gold ultra-complication watch, flying tourbillon visible above dial, haute horlogerie mechanism. Ultra-complex Cal. 4603 (72h). 100m WR. Very limited production 2018+. Pure horological genius. Market: €180,000–300,000. Art piece for elite collectors.`
  );} },

// RARE & SPECIAL EDITIONS
{ id:'ap_26610oi', kw:['26610oi','offshore music','selfwinding music','offshore special','art watch','specialized offshore','limited edition art'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Selfwinding Music Edition'; return t(
    `**Audemars Piguet Offshore Selfwinding Music Edition réf. 26610OI** — Chronographe 42mm acier, cadran spécialisé avec motifs musicaux gravés, mouvement automate musical intégré (très rare). Cal. 3186 modifié. Étanche 300m. Production ultra-limitée 2010+. Montre d'art horloger exceptionnelle. Marché : 120 000–220 000€. Amateurs art/musique horlogère.`,
    `**Audemars Piguet Offshore Selfwinding Music Edition ref. 26610OI** — 42mm steel chronograph, specialized dial with engraved musical motifs, integrated musical automaton movement (very rare). Modified Cal. 3186. 300m WR. Ultra-limited production 2010+. Exceptional horological art watch. Market: €120,000–220,000. Art/horological music enthusiasts.`
  );} },

{ id:'ap_26579ce', kw:['26579ce','royal oak perpetual openworked','ap perpetual openworked','ap calendar openworked','ap skeleton calendar','ap ceramic perpetual'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Perpetual Calendar Openworked'; return t(
    `**Audemars Piguet Royal Oak Perpetual Calendar Openworked réf. 26579CE** — Montre calendrier perpétuel 41mm céramique noire, squelettisée (mouvement visible), affichage perpétuel complet (jour/date/mois/année). Cal. 4601 extrêmement complexe. Étanche 100m. Production rare 2019+. Montre d'exception technique & artistique. Marché : 380 000–550 000€. Graal de la haute horlogerie AP.`,
    `**Audemars Piguet Royal Oak Perpetual Calendar Openworked ref. 26579CE** — 41mm black ceramic perpetual calendar watch, skeletonized (movement visible), full perpetual display (day/date/month/year). Extremely complex Cal. 4601. 100m WR. Rare production 2019+. Exception in technical & artistic watchmaking. Market: €380,000–550,000. Holy grail of AP haute horlogerie.`
  );} },

{ id:'ap_26470io', kw:['Offshore 42mm','ceramic titanium','dive watch'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore 26470IO'; return t(
    `FR: L'Offshore 26470IO 2024 conjugue ceramique noire et titane ultra-legers en 42mm pour une montre de plongee sport-luxe absolue. Le calibre 2385 (remontage automatique, 40h reserve) offre une precision acceptable. Le design futuriste avec boitier ceramique/titane et lunette tournante unidirectionnelle rappelle l'heritage Offshore depuis 1993. Etanche 300m pour la plongee recreational et professionnelle. Avec cassette "Chronograph" - complications additionnelles mesures pour expeditions. La riche palette ceramique /titane (poids leger) attire les collecteurs modernes cherchant techno-materialite. Prix: €32,000. Production limitee annuellement.`,
    `EN: The 2024 Audemars Piguet Offshore reference 26470IO unites black ceramic and ultra-light titanium in a 42mm sports-diving package combining functionality with avant-garde aesthetics. The caliber 2385 (automatic, 40-hour power reserve, chronometer-certified) delivers solid chronometric performance. The futuristic case design—ceramic/titanium—and unidirectional rotating bezel echo the Offshore legacy since 1993. Water-resistant to 300m (984 feet) for recreational and professional diving. Available with integrated chronograph complication for expedition timing. The ceramic/titanium palette appeals to contemporary collectors valuing material innovation and reduced weight. Retail: USD 29,000. Annual limited production.`
  );} },

{ id:'ap_15530st', kw:['Royal Oak 41mm','self-winding','newest generation'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 15530ST'; return t(
    `FR: Le Royal Oak 15530ST acier 41mm est la montre de prestige absolute d'AP, combinant design octagonale avant-gardiste (depuis 1972) avec precision horlogere contemporaine. Le calibre 4302/4309 (remontage automatique, 70h reserve, chronometer) offre chronometrie exceptionnelle et resistance magnetique renforcee. Le bracelet integre fond taper est iconique - reconnaissable instantanement. Etanche 50m pour usage quotidien raffiné. Cadrans options: bleu, noir, blanc, gris gradient. Prix: €26,500. Montre de retraite pour collecteurs avertis - symbol absolu du luxury sports-watch. Liste d'attente 3-5 ans chez revendeurs authorises.`,
    `EN: The Audemars Piguet Royal Oak 15530ST in 41mm steel is the ultimate prestige sports watch, melding the avant-garde octagonal case (since 1972) with contemporary watchmaking precision. The caliber 4302/4309 (automatic, 70-hour power reserve, chronometer-certified) achieves exceptional accuracy and reinforced magnetic resistance. The integrated tapered bracelet is instantly iconic—recognized globally as a status symbol. Water-resistant 50m (164 feet) for refined daily wear. Dial options: blue, black, white, grey gradient. Retail: USD 24,000. The retirement watch for expert collectors—absolute symbol of luxury sports-watch supremacy. Waiting lists: 3-5 years at authorized dealers.`
  );} },

{ id:'ap_26231st_glass', kw:['Offshore Chronograph','sapphire caseback','exhibition'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Chronograph 26231ST'; return t(
    `FR: L'Offshore Chronograph 26231ST 42mm avec fond saphir expose le calibre 3126/3840 (chronographe integre) a travers le verre, offrant theatre horloger pour collecteurs techno-curieux. Acier massif, lunette tournante unidirectionnelle ceramique noire, compteurs de chronographe visibles cadran. L'exhibition caseback revele balancier oscillant et ressorts en spirale - element essentiel pour appreciateurs du mecanisme. Etanche 300m pour plongee professionnelle. Remontage automatique, 50h reserve. Prix: €29,500. Moins demandee que la version à fond lisse (plus cher en fabrication) mais appriciee des collecteurs horlogers sinceres.`,
    `EN: The Audemars Piguet Offshore Chronograph reference 26231ST in 42mm steel with exhibition caseback exposes the integrated chronograph caliber 3126/3840 through sapphire crystal, offering horological theatre for technically curious collectors. Solid steel case, ceramic unidirectional rotating bezel, chronograph counters integrated on dial. The exhibition case-back reveals the oscillating balance wheel and spiral springs—essential for mechanism aficionados. Water-resistant to 300m (984 feet) for professional diving. Automatic winding, 50-hour power reserve. Retail: USD 26,800. Less pursued than closed case-back variants (more costly fabrication) but valued by serious horological collectors.`
  );} },

{ id:'ap_77351or', kw:['Royal Oak Ladies','34mm rose gold','pave diamond'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Ladies 77351OR'; return t(
    `FR: Le Royal Oak Dames 77351OR 34mm or rose avec lunette pavee de diamants offre luxe feminin intemporel a travers l'iconic octagon. Calibre 2061 (remontage manuel, 40h reserve) assure mouvement visible et traditionnel. Cadran blanc ou gris. Etanche 50m. La pavage diamant lunette cible collectrices nantis cherchant elegance sportive avec prestige gemologique. Production tres limitee. Prix: €42,000+. Apprieciation constante due a l'acier or rose et diamants naturels.`,
    `EN: The Audemars Piguet Royal Oak Ladies reference 77351OR in 34mm rose gold with pave diamond-set bezel delivers timeless feminine luxury through the iconic octagonal case. The caliber 2061 (manual winding, 40-hour power reserve) offers visible traditional mechanism—appealing to purists valuing craftsmanship transparency. Dial options: white or grey. Water-resistant 50m (164 feet). The diamond pavé bezel targets affluent collectors seeking sports-watch elegance combined with gemological prestige. Very limited production. Retail: USD 38,000+. Consistent appreciation driven by rose gold and natural diamond scarcity.`
  );} },

{ id:'ap_15500st_grey', kw:['Royal Oak 41mm','grey dial','modern classic'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 15500ST Grey'; return t(
    `FR: Le Royal Oak 15500ST 41mm cadran gris gradient est la configuration la plus demandee actuellement, combinant subtilité colorimetrique avec esthétique moderne. Meme calibre 4302 (70h reserve, chronometer certifie) et bracelet integré taper. Le cadran gris gradient offre transitions subtiles du gris clair au fonce, revelant la qualité de finition AP supreme. Etanche 50m. Prix: €26,500. Configuration reine pour collecteurs novices cherchant Royal Oak authentic mais avec presentation contemporaine. Moins de liste d'attente que le noir mais toujours 2-3 ans chez revendeurs.`,
    `EN: The Audemars Piguet Royal Oak 15500ST in 41mm with grey gradient dial is currently the most sought configuration, pairing subtle colorimetry with contemporary aesthetics. Same caliber 4302 (70-hour power reserve, chronometer-certified) and integrated tapered bracelet. The grey gradient dial reveals subtle light-to-dark transitions—showcasing AP's supreme finishing quality. Water-resistant 50m (164 feet). Retail: USD 24,000. The gold-standard entry configuration for novice collectors seeking authentic Royal Oak with modern presentation. Shorter waiting lists than black dial but still 2-3 years at authorized dealers.`
  );} },

{ id:'ap_26574or_blue', kw:['Perpetual Calendar rose gold','blue dial','collector holy grail'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Perpetual Calendar 26574OR'; return t(
    `FR: Le Perpetual Calendar 26574OR 41mm or rose cadran bleu laque est le graal des collecteurs AP, conjuguant 6 complications horlogeres majeures (perpetuel calendar, chronographe flyback, GMT, reserve de marche) en un seul mecanisme. Le calibre 2120/2800 (remontage automatique, 68h reserve) integre balancier a couronne et spiral Parachrom pour chrononmetrie exceptionnelle. Cadran bleu laque lisse confere elegance intemporelle. Etanche 50m. Production extremement limitee - moins de 50 pieces par an. Prix: €325,000. Appreciation rare > 100% a la revente. Montre d'exception pour collecteurs multi-milliardaires.`,
    `EN: The Audemars Piguet Perpetual Calendar reference 26574OR in 41mm rose gold with lacquered blue dial is the holy grail for AP collectors, integrating six major horological complications (perpetual calendar, flyback chronograph, GMT, moonphase, power-reserve, date) into a unified mechanism. The caliber 2120/2800 (automatic, 68-hour power reserve) features crown balance and Parachrom spiral for exceptional chronometry resistant to gravity and magnetism. The smooth lacquered blue dial conveys timeless elegance. Water-resistant 50m (164 feet). Extremely limited production—fewer than 50 pieces annually worldwide. Retail: USD 295,000. Rare secondary-market appreciation exceeds 100%. Exceptional timepiece for ultra-high-net-worth collectors only.`
  );} },
{ id:'patek_general', kw:['patek philippe','patek','pp','patek genève','patek paris','achat patek','vente patek','patek occasion','patek pre-owned','patek histoire','calatrava patek','patek suisse','genève manufacture','patek fondé','1839 patek','stern patek','patek collection','patek watches','patek models','what patek','which patek','patek available','patek in stock','patek you have','avez vous des patek','got any patek','patek brand','patek dealer','buy patek','acheter patek','patek philippe watch','patek philippe collection','patek philippe available','patek philippe models','patek most expensive','most expensive patek','patek best','best patek','patek worth it','is patek worth it'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Patek Philippe fondée en 1839 à Genève. Manufacture indépendante. Nous avons ${STOCK.filter(w=>w.brand==='Patek Philippe').length} Patek en stock (Nautilus, Annual Calendar, Complications). Quel modèle ?`,
        `Patek Philippe founded 1839 in Geneva. Independent manufacture. We have ${STOCK.filter(w=>w.brand==='Patek Philippe').length} Patek in stock (Nautilus, Annual Calendar, Complications). Which model?`
      );} },

    { id:'patek_nautilus', kw:['nautilus','patek nautilus','5711','5712','5726','5980','5990','nautilus 5711','5711 acier','5711 or','nautilus bleu','nautilus vert','nautilus blanc','5711 discontinué','nautilus discontinué','5726 nautilus','nautilus travel time','nautilus chronographe','ref 5980','ref 5990','nautilus 40mm','nautilus bracelet','nautilus dial'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus'; const s=STOCK.filter(w=>w.brand==='Patek Philippe'&&w.model.toLowerCase().includes('nautilus')); return t(
        `Nos Nautilus :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nIcone sport-chic dessinée par Gérald Genta en 1976. Le 5711 acier (discontinué 2021) cote >80 000€ marché.`,
        `Our Nautilus:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nSport-chic icon designed by Gérald Genta in 1976. The steel 5711 (discontinued 2021) trades >€80,000 on market.`
      );} },

    { id:'patek_aquanaut', kw:['aquanaut','5167','5968','5164','aquanaut acier','aquanaut or','aquanaut travel time','aquanaut chrono','aquanaut 40mm','aquanaut trop dial','bracelet composit','aquanaut luce','aquanaut femme'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `L'Aquanaut (réf. 5167A, bracelet composite) est le sport moderne de Patek. Marché ~50 000–70 000€ (acier). Pas en stock actuellement — contactez-nous pour sourcing.`,
        `The Aquanaut (ref. 5167A, composite bracelet) is Patek's modern sports watch. Market ~€50,000–70,000 (steel). Not in stock now — contact us to source.`
      );} },

    { id:'patek_calatrava', kw:['calatrava','5196','5227','5296','5119','calatrava acier','calatrava or','calatrava dress','robe patek','patek classique','patek rond','calatrava 38mm','calatrava 39mm','habillé patek','patek formel'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `La Calatrava est la montre habillée par excellence de Patek. Marché acier ~18 000–30 000€ selon réf. Nous pouvons sourcer — dites-nous votre budget et référence souhaitée.`,
        `The Calatrava is Patek's quintessential dress watch. Steel market ~€18,000–30,000 depending on ref. We can source — tell us your budget and desired reference.`
      );} },

    { id:'patek_complications', kw:['annual calendar','calendrier annuel','5726','7010','complications patek','patek complication','minute repeater','tourbillon patek','perpetual calendar','calendrier perpétuel','5270','5320','grand complication','5216','5531','5235','patek moonphase','moonphase','lune patek'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Complications'; const s=STOCK.filter(w=>w.brand==='Patek Philippe'&&(w.model.includes('Calendar')||w.model.includes('Complications'))); return t(
        `Nos Patek complications :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nCalendriers annuels et complications mécaniques. Savoir-faire horlodger parmi les plus élevés au monde.`,
        `Our Patek complications:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nAnnual calendars and mechanical complications. Among the highest watchmaking know-how in the world.`
      );} },

    { id:'patek_twenty4', kw:['twenty 4','twenty~4','twenty four','twenty4','patek femme','patek ladies','patek women','patek lady','4910','4910/10a','7300','7300/1200a','twenty4 automatic','twenty 4 automatique','rectangulaire patek','patek rectangulaire','patek quartz','twenty4 or','twenty4 acier','twenty4 diamonds','twenty4 diamants'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Twenty~4 : la montre féminine iconique de Patek. Quartz rectangle (réf. 4910, ~12 000–18 000€) ou automatique ronde (réf. 7300, ~25 000–35 000€). Acier ou or, avec ou sans diamants. Contactez-nous.`,
        `Twenty~4: Patek's iconic ladies' watch. Quartz rectangle (ref. 4910, ~€12,000–18,000) or automatic round (ref. 7300, ~€25,000–35,000). Steel or gold, with or without diamonds. Contact us.`
      );} },

    { id:'patek_gondolo', kw:['gondolo','patek gondolo','5098','5124','5200','7099','gondolo art deco','gondolo rectangulaire','rectangular patek','patek rectangle','tonneau patek','patek tonneau','art deco patek','gondolo or','gondolo gold'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Gondolo : la ligne Art Déco de Patek. Boîtiers rectangulaires et tonneau, or. Réf. 5124 (rectangle), 5098 (tonneau), 5200 (8 jours). Marché 20 000–40 000€. Contactez-nous.`,
        `Gondolo: Patek's Art Deco line. Rectangular and tonneau cases, gold. Ref. 5124 (rectangle), 5098 (tonneau), 5200 (8-day). Market €20,000–40,000. Contact us.`
      );} },

    { id:'patek_golden_ellipse', kw:['golden ellipse','ellipse','patek ellipse','5738','3738','3748','ellipse or','ellipse gold','patek ovale','ellipse vintage','golden ellipse patek','ellipse bleu','ellipse blue','nombre d or','golden ratio'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Golden Ellipse : créée 1968, proportions du nombre d'or. Boîtier ovale, cadran bleu soleil, or jaune (réf. 5738). Ultra-mince. Marché 25 000–40 000€. Pièce discrète et raffinée. Contactez-nous.`,
        `Golden Ellipse: created 1968, golden ratio proportions. Oval case, sunburst blue dial, yellow gold (ref. 5738). Ultra-thin. Market €25,000–40,000. Discreet and refined. Contact us.`
      );} },

    { id:'patek_world_time', kw:['world time','heure universelle','5230','5231','5131','5110','5130','patek world time','patek heure universelle','world time patek','carte monde','world map','cloisonné','émail','enamel dial','fuseaux horaires','time zones','24 fuseaux','world time or','world time rose gold'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `World Time : affichage 24 fuseaux horaires. Réf. 5230 (cadran guilloché), 5231 (émail cloisonné). Or blanc ou rose, 38.5mm. Marché 40 000–80 000€+. Haute horlogerie voyageur. Contactez-nous.`,
        `World Time: displays 24 time zones. Ref. 5230 (guilloché dial), 5231 (cloisonné enamel). White or rose gold, 38.5mm. Market €40,000–80,000+. Travel haute horlogerie. Contact us.`
      );} },

    { id:'patek_perpetual_calendar', kw:['patek perpetual calendar','patek calendrier perpétuel','5320','5327','5140','5139','5940','3940','patek perpétuel','patek perpetual','perpetual patek','calendrier perpétuel patek','5320g','grand complication patek','patek qp'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Calendrier Perpétuel Patek : ne nécessite aucun ajustement jusqu'en 2100. Réf. 5320G (or gris, ~80 000€+), 5327 (or rose), 5940 (coussin). Parmi les plus beaux QP au monde. Contactez-nous.`,
        `Patek Perpetual Calendar: needs no adjustment until 2100. Ref. 5320G (white gold, ~€80,000+), 5327 (rose gold), 5940 (cushion). Among the finest QPs in the world. Contact us.`
      );} },

    { id:'patek_minute_repeater', kw:['patek minute repeater','répétition minutes patek','patek sonnerie','5078','5178','5539','patek chiming','sonnerie patek','carillon patek','cathedral gong','gong cathédrale','patek 5078','patek 5539','minute repeater 5078'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Répétition Minutes Patek : sonnerie mécanique des heures, quarts et minutes. Réf. 5078 (or, ~350 000€+), 5539 (tourbillon + répétition). Parmi les plus hautes complications horlogères. Contactez-nous.`,
        `Patek Minute Repeater: mechanical chiming of hours, quarters and minutes. Ref. 5078 (gold, ~€350,000+), 5539 (tourbillon + repeater). Among the highest horological complications. Contact us.`
      );} },

    { id:'patek_grand_complications', kw:['patek grand complication','grande complication patek','sky moon','sky moon tourbillon','6002','6300','5016','5002','5175','grandmaster chime','celestial','patek celestial','6104','patek étoiles','patek stars','ciel étoilé','starry sky','patek astronomique','astronomical patek','most complicated watch','patek million','patek enchères','patek auction'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Grandes Complications Patek : les montres les plus complexes au monde. Sky Moon Tourbillon (réf. 6002, ~1.5M€+), Grandmaster Chime (réf. 6300, 20 complications). Celestial (réf. 6104). Pièces muséales. Contactez-nous.`,
        `Patek Grand Complications: the world's most complex watches. Sky Moon Tourbillon (ref. 6002, ~€1.5M+), Grandmaster Chime (ref. 6300, 20 complications). Celestial (ref. 6104). Museum pieces. Contact us.`
      );} },

    { id:'patek_chronograph', kw:['patek chronograph','patek chronographe','5172','5170','5070','5204','chronographe patek','chrono patek','patek chrono acier','patek chrono or','split seconds patek','rattrapante patek','5172g','5204r','5370'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Chronographes Patek : Réf. 5172G (mono-poussoir, or gris, ~60 000€+), 5204R (rattrapante calendrier perpétuel, ~400 000€+). Mouvements manufacture CH 29-535. Contactez-nous.`,
        `Patek Chronographs: Ref. 5172G (mono-pusher, white gold, ~€60,000+), 5204R (split-second perpetual calendar, ~€400,000+). Manufacture movements CH 29-535. Contact us.`
      );} },



    // ── RICHARD MILLE ───────────────────────────────────────────────────────────
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PATEK PHILIPPE EXPANDED REFERENCES — Comprehensive Model Coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // ──────────────────────────────────────────────────────────────────────────
    // NAUTILUS COLLECTION (40mm Sport Icon)
    // ──────────────────────────────────────────────────────────────────────────
    
    { id:'patek_5711', kw:['5711','5711 1a','5711a','nautilus 5711','patek nautilus 5711','5711 steel','5711 bleu','nautilus blue steel','nautilus discontinued','5711 gérald genta'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5711'; return t(
        `Nautilus réf. 5711A-001 (40mm acier, cadran bleu Sunburst). Calibre 26-330 SC (45h réserve). Bracelet intégré trois mailles. Icône sport-chic par Gérald Genta (1976). Discontinué août 2021 après 45 ans — le plus recherché de tous les Patek. Cote marché 85 000–120 000€ selon état.`,
        `Nautilus ref. 5711A-001 (40mm steel, Sunburst blue dial). Calibre 26-330 SC (45h power reserve). Integrated three-link bracelet. Sport-chic icon by Gérald Genta (1976). Discontinued August 2021 after 45 years — the most sought Patek ever. Market: €85,000–120,000 depending on condition.`
      );} },

    { id:'patek_5711_tiffany', kw:['5711 tiffany','tiffany co patek','5711 tiffany blue','patek tiffany nautilus','5711 turquoise','tiffany collaboration','limited 170','patek tiffany','nautilus tiffany','ref 5711'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5711 Tiffany & Co'; return t(
        `Nautilus réf. 5711/1A-018 Tiffany & Co (40mm acier, cadran bleu Tiffany exclusif). Calibre 26-330 SC. Édition limitée à 170 pièces (2022). Collaboration Patek Philippe × Tiffany New York. Ultra-rare. Marché 200 000€+. La plus désirée au-delà du prix.`,
        `Nautilus ref. 5711/1A-018 Tiffany & Co (40mm steel, exclusive Tiffany blue dial). Calibre 26-330 SC. Limited to 170 pieces (2022). Patek Philippe × Tiffany New York collaboration. Ultra-rare. Market €200,000+. The most desired beyond price.`
      );} },

    { id:'patek_5712', kw:['5712','5712a','nautilus 5712','nautilus power reserve','nautilus moonphase','5712 lune','5712 réserve','moonphase nautilus','patek nautilus calendar'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5712'; return t(
        `Nautilus réf. 5712A-001 (40mm acier, cadran noir). Calibre 240 PS IRM C LU : réserve de marche (jour/nuit) + indication lune. Produit depuis 2006. Plus robuste que le 5711, complication bonus. Marché acier 65 000–80 000€.`,
        `Nautilus ref. 5712A-001 (40mm steel, black dial). Calibre 240 PS IRM C LU: power reserve (day/night) + moon phase. In production since 2006. More robust than the 5711, bonus complication. Market: €65,000–80,000.`
      );} },

    { id:'patek_5740', kw:['5740','5740g','5740/1g','perpetual calendar nautilus','nautilus perpetual','perpetual nautilus','white gold nautilus','5740 or blanc'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Perpetual Calendar 5740'; return t(
        `Nautilus réf. 5740/1G-001 (40mm or blanc, cadran argenté). Calibre 240 Q (complication perpétuelle manufacture). Calendrier perpétuel Nautilus : extrêmement rare. Lancé 2010. Marché 120 000–180 000€ selon année/état.`,
        `Nautilus ref. 5740/1G-001 (40mm white gold, silver dial). Calibre 240 Q (manufacture perpetual complication). Perpetual Calendar Nautilus: extremely rare. Launched 2010. Market: €120,000–180,000 depending on year/condition.`
      );} },

    { id:'patek_5811', kw:['5811','5811a','5811/1a','nautilus white gold','nautilus 41mm','nautilus or blanc','5811 replacement','nautilus successor','new nautilus'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5811'; return t(
        `Nautilus réf. 5811/1A-001 (41mm or blanc, cadran bleu fumé). Calibre 26-330 SC. Remplacant du légendaire 5711 acier. Lancé 2021. Boîtier plus imposant, finition affinée, or blanc exclut des acheteurs spéculatifs. Marché 60 000–85 000€.`,
        `Nautilus ref. 5811/1A-001 (41mm white gold, smoked blue dial). Calibre 26-330 SC. Successor to legendary steel 5711. Launched 2021. Larger case, refined finishing, white gold excludes speculative buyers. Market: €60,000–85,000.`
      );} },

    { id:'patek_5819', kw:['5819','5819g','5819/1g','nautilus travel time','travel time nautilus','world time nautilus','dual time nautilus','patek 5819','5819 world'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Travel Time 5819'; return t(
        `Nautilus réf. 5819/1G-001 (40mm or blanc, cadran bleu). Calibre 324 S C FUS. Indication GMT/Travel Time. Calendrier annuel. 2023 collection. Rarement produit — Nautilus compliqué. Marché 75 000–95 000€.`,
        `Nautilus ref. 5819/1G-001 (40mm white gold, blue dial). Calibre 324 S C FUS. GMT/Travel Time indication. Annual calendar. 2023 collection. Rarely produced — complicated Nautilus. Market: €75,000–95,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // AQUANAUT COLLECTION (42mm Modern Sports Watch)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5167', kw:['5167','5167a','5167a-001','aquanaut 5167','aquanaut steel','aquanaut acier','5167 bracelet composite','aquanaut composite','5167 cadran'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5167'; return t(
        `Aquanaut réf. 5167A-001 (40mm acier, cadran bleu tropical). Calibre 324 S C (45h). Bracelet composite « caoutchouc sport » signature. Ceinture de sécurité sous-marine textile. Design moderne 1997, toujours en production. Marché 50 000–70 000€ acier.`,
        `Aquanaut ref. 5167A-001 (40mm steel, tropical blue dial). Calibre 324 S C (45h). Signature composite « sport rubber » bracelet. Textile underwater safety belt. Modern design 1997, still in production. Market: €50,000–70,000 steel.`
      );} },

    { id:'patek_5168', kw:['5168','5168g','5168g-001','aquanaut white gold','aquanaut 42mm','aquanaut or blanc','5168 bleu','aquanaut larger'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5168'; return t(
        `Aquanaut réf. 5168G-001 (42mm or blanc, cadran bleu). Calibre 26-330 SC. Mouvement Nautilus monté dans l'Aquanaut. Case de 42mm plus imposante. Collection 2020. Marché 65 000–90 000€.`,
        `Aquanaut ref. 5168G-001 (42mm white gold, blue dial). Calibre 26-330 SC. Nautilus movement mounted in Aquanaut. Larger 42mm case. 2020 collection. Market: €65,000–90,000.`
      );} },

    { id:'patek_5164', kw:['5164','5164a','5164a-001','aquanaut travel time','aquanaut world time','5164 gmt','aquanaut dual time','patek 5164'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Travel Time 5164'; return t(
        `Aquanaut réf. 5164A-001 (40mm acier, cadran gris fumé). Calibre 324 S C FUS (Travel Time). Indication GMT, calendrier annuel. Bracelet composite. 2021 introduction. Montre sportive avec complication. Marché 60 000–80 000€.`,
        `Aquanaut ref. 5164A-001 (40mm steel, smoked gray dial). Calibre 324 S C FUS (Travel Time). GMT indication, annual calendar. Composite bracelet. 2021 introduction. Sports watch with complication. Market: €60,000–80,000.`
      );} },

    { id:'patek_5968', kw:['5968','5968a','5968a-001','aquanaut chronograph','aquanaut chrono','aquanaut flyback','5968 steel','aquanaut rattrapante'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Chronograph 5968'; return t(
        `Aquanaut réf. 5968A-001 (42mm acier, cadran bleu). Calibre CH 28-520 C (flyback rattrapante intégrée). Chronographe sports-chic Aquanaut. Bracelet composite. Lancé 2021. Ultra-rare. Marché 80 000–120 000€.`,
        `Aquanaut ref. 5968A-001 (42mm steel, blue dial). Calibre CH 28-520 C (integrated flyback split-seconds). Sports-chic Aquanaut chronograph. Composite bracelet. Launched 2021. Ultra-rare. Market: €80,000–120,000.`
      );} },

    { id:'patek_5269', kw:['5269','5269r','5269r-001','aquanaut ladies','patek ladies','luce aquanaut','5269 rose gold','aquanaut femme','aquanaut rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Luce 5269'; return t(
        `Aquanaut Luce réf. 5269/1R-001 (35.2mm or rose, cadran rose). Calibre 324 S C. Montre féminine Aquanaut. Bracelet composite rose-gold tissé. Collection 2020. Marché 55 000–75 000€.`,
        `Aquanaut Luce ref. 5269/1R-001 (35.2mm rose gold, rose dial). Calibre 324 S C. Ladies' Aquanaut watch. Rose-gold woven composite bracelet. 2020 collection. Market: €55,000–75,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // CALATRAVA COLLECTION (37–40mm Dress Classics)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5196', kw:['5196','5196j','5196j-001','calatrava rose gold','calatrava 37mm','calatrava classic','5196 or rose','calatrava eternal'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava 5196'; return t(
        `Calatrava réf. 5196/1R-001 (37mm or rose, cadran champagne). Calibre 324 S C. Montre d'habillé par excellence — le classique Patek. Bracelet cuir Patek. Lancé 2010. Linéale épurée. Marché 30 000–45 000€.`,
        `Calatrava ref. 5196/1R-001 (37mm rose gold, champagne dial). Calibre 324 S C. The quintessential dress watch — classic Patek. Patek leather strap. Launched 2010. Pure linear design. Market: €30,000–45,000.`
      );} },

    { id:'patek_5227', kw:['5227','5227j','5227j-001','calatrava officer','calatrava 39mm','calatrava case officier','5227 white gold','calatrava modern'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Officer 5227'; return t(
        `Calatrava réf. 5227/1J-001 (39mm or blanc, cadran argenté). Calibre 26-330 SC. Caîtier carré/officier vintage, 40mm reconnu, moderne. Bracelet intégré or blanc. 2019 reintroduction. Marché 35 000–55 000€.`,
        `Calatrava ref. 5227/1J-001 (39mm white gold, silver dial). Calibre 26-330 SC. Officer's square/vintage case, recognized 40mm proportions, modern. Integrated white gold bracelet. 2019 reintroduction. Market: €35,000–55,000.`
      );} },

    { id:'patek_6119', kw:['6119','6119j','6119j-001','calatrava laque','calatrava lacquer','calatrava 39mm','patek 6119','calatrava asian art'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Lacquer 6119'; return t(
        `Calatrava réf. 6119/1J-001 (39mm or blanc, cadran laque noire + motif asiatique guilloché). Calibre 215 (manuel, ultra-mince 1.95mm). Art asiatique — laque traditionnelle Main d'œuvre extrême. 2020 introduction. Marché 25 000–35 000€.`,
        `Calatrava ref. 6119/1J-001 (39mm white gold, black lacquer dial + guilloché Asian motif). Calibre 215 (manual, ultra-thin 1.95mm). Asian art — traditional lacquer. Extreme craftsmanship. 2020 introduction. Market: €25,000–35,000.`
      );} },

    { id:'patek_5226', kw:['5226','5226j','5226j-001','calatrava clous de paris','calatrava 40mm','calatrava white gold','5226 diamond set','calatrava clous'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Clous de Paris 5226'; return t(
        `Calatrava réf. 5226/1J-001 (40mm or blanc, cadran bleu Sunburst, lunette Clous de Paris). Calibre 26-330 SC. Symbole Patek : motifs Clous de Paris (pois en relief). Bracelet or blanc intégré. 2021 collection. Marché 40 000–60 000€.`,
        `Calatrava ref. 5226/1J-001 (40mm white gold, Sunburst blue dial, Clous de Paris bezel). Calibre 26-330 SC. Patek symbol: Clous de Paris motifs (raised studs). Integrated white gold bracelet. 2021 collection. Market: €40,000–60,000.`
      );} },

    { id:'patek_6007', kw:['6007','6007a','6007a-001','calatrava steel','calatrava acier','calatrava limited','6007 limited edition','calatrava anniversary'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Steel 6007'; return t(
        `Calatrava réf. 6007A-001 (40mm acier, cadran bleu). Calibre 26-330 SC. Edição limitada acier — ultra-rare (Patek préfère l'or). Caiatrava moderne de Patek, acier exclusif. 2021 introduction. Marché 50 000–75 000€.`,
        `Calatrava ref. 6007A-001 (40mm steel, blue dial). Calibre 26-330 SC. Limited edition steel — ultra-rare (Patek prefers gold). Modern Patek Calatrava, exclusive steel. 2021 introduction. Market: €50,000–75,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // COMPLICATIONS COLLECTION (Annual Calendars, World Times, Advanced)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5205', kw:['5205','5205r','5205r-001','annual calendar patek','patek annual calendar','5205 rose gold','calendrier annuel patek','patek 5205'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar 5205'; return t(
        `Calendrier Annuel réf. 5205/1R-001 (40mm or rose, cadran bleu). Calibre 324 S C FUS. Complication : calendrier ne demande ajustement qu'une fois par an (fin février). Marque de fabrique Patek. Marché 50 000–75 000€.`,
        `Annual Calendar ref. 5205/1R-001 (40mm rose gold, blue dial). Calibre 324 S C FUS. Complication: calendar needs adjustment only once per year (late February). Patek hallmark. Market: €50,000–75,000.`
      );} },

    { id:'patek_5230', kw:['5230','5230r','5230r-001','world time patek','patek world time','5230 rose gold','heure universelle patek','carte monde patek'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time 5230'; return t(
        `World Time réf. 5230/1R-001 (38.5mm or rose, cadran guilloché). Calibre 324 S C. Affichage 24 fuseaux horaires — cadran tournant, index ville. Complication voyageur signature. Marché 50 000–75 000€.`,
        `World Time ref. 5230/1R-001 (38.5mm rose gold, guilloché dial). Calibre 324 S C. 24-hour time zone display — rotating dial, city indices. Signature traveler complication. Market: €50,000–75,000.`
      );} },

    { id:'patek_5270', kw:['5270','5270p','5270p-001','perpetual calendar chronograph','patek 5270','perpetual chrono','platinum 5270','split seconds perpetual'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar Chronograph 5270'; return t(
        `Perpetual Calendar Chronograph réf. 5270/1P-001 (41mm platine, cadran bleu). Calibre CH 29-535 (manufacture). Complication ultime : calendrier perpétuel + chronographe split-second. Pièce rare, ~700 000€+. Monumentale.`,
        `Perpetual Calendar Chronograph ref. 5270/1P-001 (41mm platinum, blue dial). Calibre CH 29-535 (manufacture). Ultimate complication: perpetual calendar + split-second chronograph. Rare piece, ~€700,000+. Monumental.`
      );} },

    { id:'patek_5320', kw:['5320','5320g','5320g-001','perpetual calendar patek','patek 5320','calendrier perpétuel','white gold perpetual','patek qp','5320g white gold'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar 5320'; return t(
        `Calendrier Perpétuel réf. 5320/1G-001 (40mm or blanc, cadran bleu). Calibre 240 Q. Ne demande aucun ajustement jusqu'en 2100. Complication mécaniste suprême. Parmi les plus beaux QP du monde. Marché 80 000–130 000€.`,
        `Perpetual Calendar ref. 5320/1G-001 (40mm white gold, blue dial). Calibre 240 Q. Needs no adjustment until 2100. Supreme mechanical complication. Among the finest QPs in the world. Market: €80,000–130,000.`
      );} },

    { id:'patek_5370', kw:['5370','5370p','5370p-001','split seconds patek','patek 5370','rattrapante patek','chronograph split second','platinum split second','patek 5370 chronograph'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Split-Seconds Chronograph 5370'; return t(
        `Split-Seconds Chronograph réf. 5370/1P-001 (41mm platine, cadran bleu). Calibre CH 29-535 (mono-poussoir rattrapante intégrale). Chronographe mécanique classique. Marché 180 000–280 000€. Ultra-sophistiqué.`,
        `Split-Seconds Chronograph ref. 5370/1P-001 (41mm platinum, blue dial). Calibre CH 29-535 (mono-pusher integrated split-seconds). Classic mechanical chronograph. Market: €180,000–280,000. Ultra-sophisticated.`
      );} },

    { id:'patek_5172', kw:['5172','5172g','5172g-001','chronograph patek','patek chronograph','5172 white gold','patek mono pusher','mono poussoir patek'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Chronograph 5172'; return t(
        `Chronographe réf. 5172/1G-001 (40mm or blanc, cadran bleu). Calibre CH 29-535 PS (mono-poussoir). Chronographe à rattrapante intégrale — ultramoderne manufacture. Marché 70 000–100 000€. Montre complexe.`,
        `Chronograph ref. 5172/1G-001 (40mm white gold, blue dial). Calibre CH 29-535 PS (mono-pusher). Chronograph with integrated split-seconds — ultramodern manufacture. Market: €70,000–100,000. Complex watch.`
      );} },

    { id:'patek_5960', kw:['5960','5960p','5960p-001','annual calendar flyback','patek 5960','flyback chronograph','platinum annual calendar','5960 platinum'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar Flyback 5960'; return t(
        `Annual Calendar Flyback Chronographe réf. 5960/1P-001 (41mm platine, cadran noir). Calibre CH 29-535 PS (mono-poussoir flyback intégral). Calendrier annuel + chronographe. Haute complication sport. Marché 300 000€+.`,
        `Annual Calendar Flyback Chronograph ref. 5960/1P-001 (41mm platinum, black dial). Calibre CH 29-535 PS (mono-pusher integrated flyback). Annual calendar + chronograph. High-tech sports complication. Market: €300,000+.`
      );} },

    { id:'patek_5930', kw:['5930','5930p','5930p-001','world time flyback','patek 5930','world time chronograph','platinum world time','5930 world time'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time Flyback Chronograph 5930'; return t(
        `World Time Flyback Chronographe réf. 5930/1P-001 (41mm platine, cadran noir). Calibre CH 29-535 PS. Monde entier + chronographe flyback — montre voyageur-sport ultime. Très rare. Marché 280 000–380 000€.`,
        `World Time Flyback Chronograph ref. 5930/1P-001 (41mm platinum, black dial). Calibre CH 29-535 PS. Full world + flyback chronograph — ultimate traveler-sport watch. Very rare. Market: €280,000–380,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // GRAND COMPLICATIONS (Minute Repeaters, Tourbillons, Ultra-Haute Horlogerie)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5531', kw:['5531','5531p','5531p-001','minute repeater world time','patek 5531','sonnerie world time','patek chiming world time','repeater world time'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater World Time 5531'; return t(
        `Répétition Minutes World Time réf. 5531/1P-001 (42mm platine, cadran noir). Calibre 300 Soneria (sonnerie intégrale). Combine deux ultimes complications : répétition minutes + heure universelle. Pièce muséale. Marché 800 000€+.`,
        `Minute Repeater World Time ref. 5531/1P-001 (42mm platinum, black dial). Calibre 300 Soneria (integrated chiming). Combines two ultimate complications: minute repeater + world time. Museum piece. Market: €800,000+.`
      );} },

    { id:'patek_6300', kw:['6300','grandmaster chime','patek 6300','6300p','patek most expensive','reference 6300','chiming watch','20 complications'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Grandmaster Chime 6300'; return t(
        `Grandmaster Chime réf. 6300P-001 (42.2mm platine, cadran bleu). Calibre 300 GC (20 complications, 1328 composants). Montre la plus complexe ET la plus chère jamais produite par Patek : enchères 31M$ (2019). Objet purement artistique.`,
        `Grandmaster Chime ref. 6300P-001 (42.2mm platinum, blue dial). Calibre 300 GC (20 complications, 1328 components). Most complex AND most expensive watch ever produced by Patek: auctioned $31M (2019). Pure art object.`
      );} },

    { id:'patek_5539', kw:['5539','5539p','5539p-001','tourbillon minute repeater','patek 5539','repeater tourbillon','patek sonnerie tourbillon','platinum repeater'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Tourbillon Minute Repeater 5539'; return t(
        `Tourbillon Répétition Minutes réf. 5539/1P-001 (42mm platine, cadran bleu). Calibre 300 Sirius. Combine tourbillon visible + sonnerie minutes. Ultra-rare : ~100 pièces fabrication annuelle. Marché 400 000–600 000€.`,
        `Tourbillon Minute Repeater ref. 5539/1P-001 (42mm platinum, blue dial). Calibre 300 Sirius. Combines visible tourbillon + minute chiming. Ultra-rare: ~100 pieces annual production. Market: €400,000–600,000.`
      );} },

    { id:'patek_5208', kw:['5208','5208p','5208p-001','minute repeater chronograph','patek 5208','repeater chronograph perpetual','tonneau case','split second repeater'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater Split-Seconds Perpetual Calendar 5208'; return t(
        `Minute Repeater Chronographe Perpétuel réf. 5208/1P-001 (42mm platine, boîtier tonneau). Calibre 300 SQU (sonnerie monopoussoir + split-second + QP). Trois ultimes complications en une montre. Muséale. Marché 1M€+.`,
        `Minute Repeater Split-Seconds Perpetual Calendar ref. 5208/1P-001 (42mm platinum, tonneau case). Calibre 300 SQU (mono-pusher chiming + split-second + QP). Three ultimate complications in one watch. Museum piece. Market: €1M+.`
      );} },

    { id:'patek_5303', kw:['5303','5303p','5303p-001','minute repeater tourbillon','open face','patek 5303','repeater tourbillon open','sonnerie visable'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater Tourbillon 5303'; return t(
        `Minute Repeater Tourbillon Decimal réf. 5303/1P-001 (42mm platine, boîtier épargne ouvert). Calibre 300 Sirius. Tourbillon central visible dans le style « montre de poche savante ». Répétition sonnerie intégrale. Très rare. Marché 500 000–800 000€.`,
        `Minute Repeater Tourbillon Decimal ref. 5303/1P-001 (42mm platinum, open face épargne case). Calibre 300 Sirius. Central visible tourbillon in « sophisticated pocket watch » style. Integrated chiming repeater. Very rare. Market: €500,000–800,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // LADIES COLLECTION (35–36mm Refined Elegance)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_7118', kw:['7118','7118/1200a','nautilus ladies','nautilus 35','patek ladies','nautilus femme','ladies nautilus 35','patek women watch'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Ladies 7118'; return t(
        `Nautilus Femme réf. 7118/1200A-001 (35.2mm acier, cadran bleu). Calibre 324 S C. Nautilus 38.5mm refondu aux proportions féminines. Bracelet trois mailles acier. Lancé 2021. Marché 40 000–55 000€.`,
        `Nautilus Ladies ref. 7118/1200A-001 (35.2mm steel, blue dial). Calibre 324 S C. The 38.5mm Nautilus resized to feminine proportions. Three-link steel bracelet. Launched 2021. Market: €40,000–55,000.`
      );} },

    { id:'patek_4910', kw:['4910','4910/10a','twenty 4 quartz','twenty4 rectangle','twenty4 femme','patek ladies quartz','rectangle ladies','4910 diamants'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Twenty~4 Rectangle 4910'; return t(
        `Twenty~4 Quartz réf. 4910/10A-011 (25×28mm, cadran bleu, diamants). Mouvement quartz (batterie 42 mois). Montre féminine emblématique Patek — rectangulaire Art Déco. Or blanc bracelet intégré. Marché 15 000–22 000€.`,
        `Twenty~4 Quartz ref. 4910/10A-011 (25×28mm, blue dial, diamonds). Quartz movement (42-month battery). Patek's iconic ladies watch — rectangular Art Deco. White gold integrated bracelet. Market: €15,000–22,000.`
      );} },

    { id:'patek_7300', kw:['7300','7300/1200a','twenty 4 automatic','patek 7300','twenty4 round','ladies automatic','patek ladies round','7300 rose gold'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Twenty~4 Automatic 7300'; return t(
        `Twenty~4 Automatique réf. 7300/1200A-001 (33mm or rose, cadran bleu). Calibre 324 S C (45h). Version moderne ronde : transition quartz → mécanique. Bracelet or rose intégré. Lancé 2021. Marché 28 000–42 000€.`,
        `Twenty~4 Automatic ref. 7300/1200A-001 (33mm rose gold, blue dial). Calibre 324 S C (45h). Modern round version: quartz → mechanical transition. Integrated rose gold bracelet. Launched 2021. Market: €28,000–42,000.`
      );} },

    // ═══════════════════════════════════════════════════════════════════════════
    // Additional Specialized Models
    // ═══════════════════════════════════════════════════════════════════════════

    { id:'patek_5131', kw:['5131','5131r','5131r-001','world time jump','patek 5131','world time rose gold','24 hour indicator'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time Jump Hour 5131'; return t(
        `World Time Jump réf. 5131/1R-001 (38mm or rose, cadran noir). Calibre 324 S C. Variation world time avec saut horaire - index 24 villes. Marché 45 000–65 000€.`,
        `World Time Jump ref. 5131/1R-001 (38mm rose gold, black dial). Calibre 324 S C. World time variant with hour jump - 24 city indices. Market: €45,000–65,000.`
      );} },

    { id:'patek_5172r', kw:['5172r','5172r-001','chronograph rose gold','patek chronograph rose','chronographe 5172 or rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Chronograph 5172 Rose Gold'; return t(
        `Chronographe réf. 5172/1R-001 (40mm or rose, cadran bleu). Calibre CH 29-535 PS (mono-poussoir). Variante or rose du chronographe sport-chic Patek. Marché 65 000–90 000€.`,
        `Chronograph ref. 5172/1R-001 (40mm rose gold, blue dial). Calibre CH 29-535 PS (mono-pusher). Rose gold variant of Patek's sport-chic chronograph. Market: €65,000–90,000.`
      );} },

    { id:'patek_5960r', kw:['5960r','5960r-001','annual calendar flyback rose gold','patek 5960 rose','flyback annual calendar rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar Flyback Rose Gold 5960'; return t(
        `Annual Calendar Flyback réf. 5960/1R-001 (41mm or rose, cadran bleu). Calibre CH 29-535 PS. Variation or rose de l'annual calendar chronographe flyback. Marché 250 000–350 000€.`,
        `Annual Calendar Flyback ref. 5960/1R-001 (41mm rose gold, blue dial). Calibre CH 29-535 PS. Rose gold variant of annual calendar flyback chronograph. Market: €250,000–350,000.`
      );} },


    
    // ──────────────────────────────────────────────────────────────────────────
    // NAUTILUS EXPANDED — Additional Sport Icons & Rare Models
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5990a', kw:['5990a','5990a-001','nautilus travel time chronograph','nautilus chrono gmt','nautilus ch 28-520','5990 steel','nautilus 40th anniversary','chronograph nautilus sports'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Travel Time Chronograph 5990A'; return t(
        `Nautilus réf. 5990/1A-001 (44mm acier, cadran bleu). Calibre CH 28-520 C FUS (chronographe rattrapante intégrée + Travel Time). Lancé 2021 pour le 40e anniversaire Nautilus. Ultra-rare dans la gamme sports. Marché 95 000–140 000€. Demande extrême.`,
        `Nautilus ref. 5990/1A-001 (44mm steel, blue dial). Calibre CH 28-520 C FUS (integrated split-seconds chronograph + Travel Time). Launched 2021 for Nautilus 40th anniversary. Ultra-rare in sports range. Market: €95,000–140,000. Extreme demand.`
      );} },

    { id:'patek_5980r', kw:['5980r','5980r-001','nautilus chronograph rose gold','nautilus flyback rose','5980 chronograph','nautilus rattrapante or rose','chronograph rose gold nautilus','flyback rose nautilus'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Chronograph 5980R'; return t(
        `Nautilus réf. 5980/1R-001 (40mm or rose, cadran champagne tropicalisé). Calibre CH 28-520 C FUS (chronographe flyback rattrapante). Bracelet trois mailles intégré or rose. Complication majeure sur Nautilus. Extrêmement recherché. Marché 110 000–160 000€.`,
        `Nautilus ref. 5980/1R-001 (40mm rose gold, champagne tropicalized dial). Calibre CH 28-520 C FUS (flyback split-seconds chronograph). Integrated three-link rose gold bracelet. Major Nautilus complication. Extremely sought. Market: €110,000–160,000.`
      );} },

    { id:'patek_5724g', kw:['5724g','5724g-001','nautilus annual calendar moonphase','nautilus perpetual gold','annual calendar nautilus white gold','5724 gold moonphase','nautilus lune','nautilus calendar moonphase'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Annual Calendar Moonphase 5724G'; return t(
        `Nautilus réf. 5724/1G-001 (40mm or blanc, cadran bleu). Calibre 240 Q (calendrier annuel + lune). Montre de complication majeure dans le style Nautilus. Extrêmement rare. Lancé 2012. Marché 150 000–220 000€. Collection des passionnés.`,
        `Nautilus ref. 5724/1G-001 (40mm white gold, blue dial). Calibre 240 Q (annual calendar + moon phase). Major complication watch in Nautilus style. Extremely rare. Launched 2012. Market: €150,000–220,000. Enthusiast's collection.`
      );} },

    { id:'patek_5980_60', kw:['5980/60','5980/60-001','nautilus 40th anniversary','nautilus anniversary limited','nautilus 40 years','5980 limited edition','nautilus vintage reissue','anniversary chronograph'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 40th Anniversary Chronograph 5980/60'; return t(
        `Nautilus réf. 5980/60A-001 (40mm acier, cadran bleu Sunburst). Calibre CH 28-520 C FUS. Édition limitée 40e anniversaire (2016). Reissue style vintage des années 1976. Très recherchée des collectionneurs. Marché 85 000–130 000€.`,
        `Nautilus ref. 5980/60A-001 (40mm steel, Sunburst blue dial). Calibre CH 28-520 C FUS. Limited edition 40th anniversary (2016). Vintage-style reissue from 1976. Highly sought by collectors. Market: €85,000–130,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // AQUANAUT EXPANDED — Ladies Models & Vintage Editions
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5267a', kw:['5267a','5267a-001','aquanaut luce ladies','aquanaut 35mm','aquanaut femme steel','5267 ladies','luce aquanaut steel','aquanaut women steel'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Luce 5267A'; return t(
        `Aquanaut Luce réf. 5267/1A-001 (35.6mm acier, cadran bleu). Calibre 324 S C. Montre sportive féminine acier. Bracelet composite intégré. Lancé 2020. Proportion parfaite pour poignet fin. Marché 45 000–65 000€. Portée professionnelle.`,
        `Aquanaut Luce ref. 5267/1A-001 (35.6mm steel, blue dial). Calibre 324 S C. Ladies' steel sports watch. Integrated composite bracelet. Launched 2020. Perfect proportion for slim wrist. Market: €45,000–65,000. Professional wearability.`
      );} },

    { id:'patek_5065a', kw:['5065a','5065a vintage','aquanaut 38mm first generation','aquanaut original 1997','aquanaut vintage','aquanaut 5065','5065 acier original','aquanaut histoire'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5065A Vintage 1997'; return t(
        `Aquanaut réf. 5065/1A (38mm acier, cadran noir). Première génération 1997 — Calibre 28-255 C/S. Design Thierry Stern révolutionnant la montre sport Patek. Très rare vintage. Bracelet composite original signature. Marché 40 000–60 000€ selon état.`,
        `Aquanaut ref. 5065/1A (38mm steel, black dial). First generation 1997 — Calibre 28-255 C/S. Thierry Stern design revolutionizing Patek sports watch. Very rare vintage. Original signature composite bracelet. Market: €40,000–60,000 depending on condition.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // COMPLICATIONS EXPANDED — Annual Calendar & Travel Time Models
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5146g', kw:['5146g','5146g-001','annual calendar moonphase white gold','calatrava annual calendar','5146 gold','calendar moonphase calatrava','patek 5146','annual moonphase'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Annual Calendar Moonphase 5146G'; return t(
        `Calatrava réf. 5146/1G-001 (40mm or blanc, cadran argenté). Calibre 240 Q (calendrier annuel + lune). Complication majeure en boîtier Calatrava classique. Marché 100 000–150 000€. Combinaison élégante sport-habillé.`,
        `Calatrava ref. 5146/1G-001 (40mm white gold, silver dial). Calibre 240 Q (annual calendar + moon phase). Major complication in classic Calatrava case. Market: €100,000–150,000. Elegant dress-sport combination.`
      );} },

    { id:'patek_5396g', kw:['5396g','5396g-001','annual calendar sector dial','calatrava sector dial','5396 gold sector','annual calendar sector','patek 5396','sector dial calendar'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Annual Calendar Sector Dial 5396G'; return t(
        `Calatrava réf. 5396/1G-001 (40mm or blanc, cadran secteur noir vintage). Calibre 240 Q (calendrier annuel). Design années 1930 réévalué. Très élégant, lisibilité rétro. Marché 95 000–140 000€. Collection des puristes.`,
        `Calatrava ref. 5396/1G-001 (40mm white gold, vintage sector black dial). Calibre 240 Q (annual calendar). 1930s design reappraised. Very elegant, retro readability. Market: €95,000–140,000. Purist collection.`
      );} },

    { id:'patek_5524g', kw:['5524g','5524g-001','calatrava pilot travel time','pilot travel time rose gold','5524 travel time','patek 5524','calatrava pilot gmt','travel time rose gold'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Pilot Travel Time 5524G'; return t(
        `Calatrava Pilot réf. 5524/1G-001 (42mm or rose, cadran bronze). Calibre 324 S C FUS (Travel Time GMT). Montre d'aviateur Calatrava combinant élégance or rose + utilité GMT. Marché 75 000–110 000€. Rare fusion collection.`,
        `Calatrava Pilot ref. 5524/1G-001 (42mm rose gold, bronze dial). Calibre 324 S C FUS (Travel Time GMT). Aviator Calatrava combining rose gold elegance + GMT utility. Market: €75,000–110,000. Rare fusion collection.`
      );} },

    { id:'patek_5212a', kw:['5212a','5212a-001','calatrava weekly calendar steel','calatrava week display','5212 steel','weekly calendar calatrava','calatrava semaine','patek 5212'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Weekly Calendar 5212A'; return t(
        `Calatrava réf. 5212/1A-001 (40mm acier, cadran bleu). Calibre 324 S C (indication jour de semaine). Complication pratique dans style Calatrava intemporel. Très rare acier. Lancé 2021. Marché 60 000–85 000€.`,
        `Calatrava ref. 5212/1A-001 (40mm steel, blue dial). Calibre 324 S C (day of week indication). Practical complication in timeless Calatrava style. Very rare steel. Launched 2021. Market: €60,000–85,000.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // GRAND COMPLICATIONS — Haute Horlogerie Summit
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5204p', kw:['5204p','5204p-001','split-seconds chronograph perpetual platinum','grand complication platinum','5204 platinum perpetual','rattrapante perpetual','patek 5204','chronograph perpetual calendar'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Split-Seconds Chronograph Perpetual Calendar 5204P'; return t(
        `Réf. 5204/1P-001 (42mm platine, cadran noir). Calibre CHR 27-525 PS (chronographe rattrapante intégrée + calendrier perpétuel + répétition minutes). Summum de l'horlogerie Patek. Seulement 5 pièces produites par an. Marché 500 000€+. Muséum pièce.`,
        `Ref. 5204/1P-001 (42mm platinum, black dial). Calibre CHR 27-525 PS (integrated split-seconds chronograph + perpetual calendar + minute repeater). Summit of Patek watchmaking. Only 5 pieces produced per year. Market: €500,000+. Museum piece.`
      );} },

    { id:'patek_5316p', kw:['5316p','5316p-001','grand complications tourbillon perpetual platinum','tourbillon minute repeater perpetual','5316 platinum','patek 5316','grand complication perpetual','haute horlogerie summit'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Grand Complications Tourbillon Minute Repeater Perpetual 5316P'; return t(
        `Réf. 5316/1P-001 (42mm platine, cadran noir). Calibre 300 TI M QA (tourbillon équilibrage + répétition minutes + calendrier perpétuel + lune). Montre ultime production limitée. Marché 450 000–600 000€. Très rares placements.`,
        `Ref. 5316/1P-001 (42mm platinum, black dial). Calibre 300 TI M QA (tourbillon regulation + minute repeater + perpetual calendar + moon phase). Ultimate limited production watch. Market: €450,000–600,000. Very rare placements.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // RARE VINTAGE REFERENCES — Investment Grade Horological Classics
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_2499', kw:['2499','2499 vintage','perpetual calendar chronograph vintage','2499 perpetual','patek 2499 chronograph','one of most valuable watches','2499 rare','chronograph perpetual ancien'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar Chronograph 2499'; return t(
        `Réf. 2499 (37mm acier/or, production 1951-1986). Calibre 130 (mouvement manual). Une des montres les plus précieuses jamais créées — seulement 349 pièces acier. Chronographe calendrier perpétuel équilibré à la perfection. Marché 200 000–500 000€+ selon année/état. Trésor de collection.`,
        `Ref. 2499 (37mm steel/gold, production 1951–1986). Calibre 130 (manual movement). One of the most valuable watches ever created — only 349 steel pieces. Perfectly balanced perpetual calendar chronograph. Market: €200,000–500,000+ depending on year/condition. Collection treasure.`
      );} },

    { id:'patek_1518', kw:['1518','1518 vintage','first serial perpetual calendar chronograph','1518 perpetual calendar','patek 1518','1941 chronograph','first perpetual chronograph','serial perpetual calendar'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar Chronograph 1518 (1941)'; return t(
        `Réf. 1518 (37mm acier/or, production 1941-1954). Le PREMIER chronographe de calendrier perpétuel de l'horlogerie — lancé 1941. Seulement 107 pièces acier produites. Calibre 130 S C (mouvement manuel révolutionnaire). Marché 500 000€–2 millions€+ selon état. Pièce historique absolue.`,
        `Ref. 1518 (37mm steel/gold, production 1941–1954). THE FIRST perpetual calendar chronograph in watchmaking — launched 1941. Only 107 steel pieces produced. Calibre 130 S C (revolutionary manual movement). Market: €500,000–2,000,000+ depending on condition. Absolute historic piece.`
      );} },

    
{ id:'patek_5711_1r', kw:['Nautilus rose gold','rare variant','40mm'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5711/1R'; return t(
    `FR: Le Nautilus 5711/1R rose gold 40mm est la variation rarement produite du chef-d'oeuvre 1976, combinant boitier integre iconic avec precious metal prestige. Cadran bleu ou argent. Le calibre 324 SC (remontage automatique, 45h reserve, chronometer) offre fiabilite legendaire. Lunette rotative tournante. Etanche 120m. Production excessivement limitee - moins de 5 pieces par annee. Prix pre-owned €350,000+. Rarite absolue. Appreciation secondaire constante a causa de materialite or rose et limite productivite.`,
    `EN: The Patek Philippe Nautilus reference 5711/1R in 40mm rose gold is the rarely-produced variant of the legendary 1976 integrated sports watch, combining the iconic case geometry with precious metal prestige. Dial options: blue or silver. The caliber 324 SC (automatic, 45-hour power reserve, chronometer-certified) delivers legendary reliability. Rotating bezel, integral bracelet. Water-resistant 120m (394 feet). Excessively limited production—fewer than 5 pieces annually. Pre-owned retail: USD 320,000+. Absolute rarity. Consistent secondary appreciation driven by rose gold scarcity and production constraints.`
  );} },

{ id:'patek_5167r', kw:['Aquanaut rose gold','composite strap','40mm travel'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5167R'; return t(
    `FR: L'Aquanaut 5167R rose gold 40mm with composite leather/rubber strap offre polyvalence luxe pour voyageurs affirmes, combinant boitier unique courbe de Patek avec precious metal. Le calibre 324 SC (remontage automatique, 45h reserve) assure chronometrie fiable. Cadran bleu marine, noir, ou blanc. Etanche 120m pour usage quotidien et snorkeling occasion nel. Lunette tournante unidirectionnelle. Bracelet composite Patek combine elasticite caoutchouc avec elegance cuir - ideale pour voyage global. Prix: €28,500. Moins demandee que Nautilus mais appriciee des voyageurs globaux.`,
    `EN: The Patek Philippe Aquanaut reference 5167R in 40mm rose gold with composite leather/rubber strap delivers luxury versatility for discerning travelers, combining Patek's unique curved case with precious metal dignity. The caliber 324 SC (automatic, 45-hour power reserve, chronometer-certified) ensures reliable chronometry. Dial options: navy, black, or white. Water-resistant 120m (394 feet) for daily use and occasional snorkeling. Unidirectional rotating bezel. The composite Patek strap blends rubber elasticity with leather refinement—ideal for global travel. Retail: USD 26,000. Less iconic than Nautilus but cherished by international travelers.`
  );} },

{ id:'patek_5131j', kw:['World Time cloisonne','enamel dial','yellow gold'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time 5131J'; return t(
    `FR: Le World Time 5131J or jaune 39.5mm with cloisonne enamel cadran peint a main est le chef-d'oeuvre ultime pour collecteurs d'art horloger, affichant 24 fuseaux horaires sur lunette tournante avec cadran enamel cloisonne custom. Chaque cadran unique est oeuvre d'art appliquee - peint a main par artisans enamel Patek specialises. Calibre 240 HU (remontage manuel, 48h reserve). Production unidirectionnelle: UNE SEULE piece par client commande, design custom. Prix: €180,000+. Delai livraison 3-5 ans. Appreciation historique exceptionnelle > 200% post-acquisition. Montre pour collecteurs ultra-passionnes.`,
    `EN: The Patek Philippe World Time reference 5131J in yellow gold with 39.5mm case and hand-painted cloisonné enamel dial is the ultimate horological art-object, displaying 24 time zones on rotating bezel with custom cloisonné enamel dial. Each dial is a unique artwork—hand-painted by Patek's specialized enamel artisans using centuries-old techniques. The caliber 240 HU (manual winding, 48-hour power reserve) powers this masterpiece. Production model: ONE piece per client order with custom design specification. Retail: USD 165,000+. Delivery wait: 3-5 years. Historical appreciation exceeds 200% post-acquisition. Reserved for ultra-passionate collectors only.`
  );} },

{ id:'patek_5327g', kw:['Perpetual Calendar','white gold','lacquered blue'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar 5327G'; return t(
    `FR: Le Perpetual Calendar 5327G or blanc 39.5mm cadran bleu laque is le Perpetual Calendar entry-level supreme de Patek, offrant 6 complications (perpetuel, chronographe, reserve, date, jour, mois) sans chronographe flyback complexe de la ref 5327. Calibre 240 Q (remontage manuel, 48h) integre mecanisme perpetuel ingenieux ne necessitant correction que le 1er mars 2100. Cadran bleu laque lisse avec index appliques offre elegance intemporelle. Etanche 50m. Prix: €110,000. Production limitee a ~100 pieces par annee. Appreciation: 15-25% par annee a causa de specifications perpetuelles.`,
    `EN: The Patek Philippe Perpetual Calendar reference 5327G in 39.5mm white gold with lacquered blue dial is Patek's supreme perpetual-calendar entry point, integrating six complications (perpetual calendar, moonphase, power reserve, date, day, month) without the complex flyback chronograph of higher references. The caliber 240 Q (manual winding, 48-hour power reserve) incorporates Patek's ingenious perpetual mechanism requiring correction only on March 1, 2100. The smooth lacquered blue dial with applied indices conveys timeless elegance. Water-resistant 50m (164 feet). Retail: USD 100,000. Limited production: ~100 pieces annually. Appreciation: 15-25% annually due to perpetual specifications.`
  );} },

{ id:'patek_5935a', kw:['World Time Chronograph','steel latest','flyback'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time Flyback 5935A'; return t(
    `FR: Le World Time Flyback Chronograph 5935A acier 40.8mm est la montre de voyage plus ambitieuse de Patek, combinant chronographe flyback avec 24 fuseaux horaires sur lunette. Le calibre CH 28-520 HU (remontage automatique, 55h reserve) intègre mecanisme chronographe complexe base colonne avec fonction flyback. Deux compteurs chrono cadran offrent lectures temporelle sophistiquees. Boitier acier robust mais luxe. Etanche 100m pour usage maritime. Prix: €42,000. Montre moderne pour cadres internationaux cherchant timing precision globale.`,
    `EN: The Patek Philippe World Time Flyback Chronograph reference 5935A in 40.8mm steel is Patek's most ambitious travel chronograph, combining flyback chronograph with 24-hour time-zone display on rotating bezel. The caliber CH 28-520 HU (automatic, 55-hour power reserve) integrates complex column-wheel chronograph with integrated flyback function. Twin subdial chronograph counters enable sophisticated temporal readings. Steel case balances robustness with refined aesthetic. Water-resistant 100m (330 feet) for maritime use. Retail: USD 38,000. Modern timepiece for international executives seeking global timing precision.`
  );} },

{ id:'patek_5180_1r', kw:['Nautilus Skeleton','rose gold','openworked'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Skeleton 5180/1R'; return t(
    `FR: Le Nautilus Skeleton 5180/1R or rose 40mm expose le calibre 240 SQU (remontage manuel, 48h reserve) a travers le verre bombé, offrant theatre horloger supreme pour collecteurs mecanisme-passionnes. Le boitier integre iconic reste massif or rose. Cadran "open" avec balancier oscillant visible et ressorts spirales creent symphony visuelle. Etanche 120m. Production excessivement limitee - moins de 10 pieces par annee. Prix: €250,000+. Montre showpiece pour collecteurs ultra-haut-filet.`,
    `EN: The Patek Philippe Nautilus Skeleton reference 5180/1R in 40mm rose gold exposes the caliber 240 SQU (manual winding, 48-hour power reserve) through domed sapphire crystal, offering supreme horological theatre for mechanism-passionate collectors. The iconic integrated case remains substantial rose gold. The open dial with visible oscillating balance wheel and spiral springs creates visual symphony. Water-resistant 120m (394 feet). Excessively limited production—fewer than 10 pieces annually. Retail: USD 230,000+. Showpiece timepiece for ultra-high-net-worth collectors.`
  );} },
{ id:'rm_general', kw:['richard mille','rm','richard mille paris','rm montre','rm occasion','rm pre-owned','achat richard mille','vente richard mille','rm suisse','rm prix','richard mille cher','rm combien','rm investment','rm cote','rm watch','rm watches','rm models','what rm','which rm','rm available','rm in stock','rm you have','avez vous des rm','got any rm','rm brand','rm dealer','buy rm','acheter rm','richard mille collection','richard mille available','richard mille models','richard mille price','richard mille worth','most expensive watch','watches over 100k','watches over 200k','six figure watch','six figure watches'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `Richard Mille fondée en 2001. Montres ultra-légères, techniques, prix de 100 000€ à plusieurs millions. Nous avons ${STOCK.filter(w=>w.brand==='Richard Mille').length} RM en stock.`,
        `Richard Mille founded 2001. Ultra-light, technical watches, prices from €100,000 to several million. We have ${STOCK.filter(w=>w.brand==='Richard Mille').length} RM in stock.`
      );} },

    { id:'rm_65', kw:['rm 65','rm65','rm65-01','rm 65-01','rm65 01','chronographe rm','rm split seconds','rm rattrapante','richard mille chronographe','rm acier','rm tigrade'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 65-01'; const s=STOCK.filter(w=>w.brand==='Richard Mille'); return t(
        `Nos Richard Mille :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nRM 65-01 : chronographe flyback à rattrapante. Boîtier titane grade 5, tonneau, mouvement squelette.`,
        `Our Richard Mille:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nRM 65-01: flyback split-second chronograph. Grade 5 titanium tonneau case, skeleton movement.`
      );} },

    { id:'rm_tourbillon', kw:['rm tourbillon','rm 001','rm 008','rm 038','rm 52','rm 56','tourbillon rm','rm carbon','rm tpt','carbon ntpt'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `Les RM Tourbillon (RM 001, RM 027 Nadal, RM 052…) sont les pièces iconiques. Marché 200 000€ à 2M+. Contactez-nous pour sourcing selon référence.`,
        `RM Tourbillons (RM 001, RM 027 Nadal, RM 052…) are the iconic pieces. Market €200,000 to 2M+. Contact us for sourcing by reference.`
      );} },

    { id:'rm_011', kw:['rm 011','rm011','rm 11','rm11','rm 011 felipe massa','felipe massa','rm flyback','rm chronographe flyback','rm 011 titanium','rm 011 or rose','rm 011 rose gold','rm 011 carbone','rm 011 ntpt','rm 011 prix','rm 011 price'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 011 Felipe Massa : chronographe flyback + calendrier annuel. Boîtier tonneau titane/or rose/carbone NTPT, 50mm. Marché 150 000–300 000€ selon matériau. Pièce emblématique RM. Contactez-nous.`,
        `RM 011 Felipe Massa: flyback chronograph + annual calendar. Tonneau case titanium/rose gold/carbon NTPT, 50mm. Market €150,000–300,000 depending on material. Iconic RM piece. Contact us.`
      );} },

    { id:'rm_027', kw:['rm 027','rm027','rm 27','rm27','rm nadal','rafael nadal','nadal watch','rm 27-01','rm 27-02','rm 27-03','rm 27-04','rm nadal tourbillon','montre nadal','nadal rm','rm ultra léger','rm ultralight','rm 20 grammes','rm 20 grams','lightest watch'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 027 Rafael Nadal : tourbillon ultra-léger (~20g avec bracelet). Boîtier carbone NTPT, conçue pour résister aux chocs du tennis. Marché 500 000€ à 1M+. Éditions très limitées. Contactez-nous.`,
        `RM 027 Rafael Nadal: ultra-light tourbillon (~20g with strap). Carbon NTPT case, designed to withstand tennis impacts. Market €500,000 to 1M+. Very limited editions. Contact us.`
      );} },

    { id:'rm_035', kw:['rm 035','rm035','rm 35','rm35','rm 035 americas','rm 35-01','rm 35-02','rm 35-03','rm 035 nadal','rm baby nadal','rm nadal automatique','rm 035 carbone','rm 035 ntpt','rm 035 prix'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 035 "Baby Nadal" : automatique ultra-léger. Boîtier tonneau carbone NTPT/quartz TPT, calibre RMUL3. Marché 150 000–250 000€. Plus accessible que le RM 027. Contactez-nous.`,
        `RM 035 "Baby Nadal": ultra-light automatic. Tonneau carbon NTPT/quartz TPT case, calibre RMUL3. Market €150,000–250,000. More accessible than the RM 027. Contact us.`
      );} },

    { id:'rm_055', kw:['rm 055','rm055','rm 55','rm55','rm 055 bubba watson','bubba watson','rm 055 white','rm 055 ceramic','rm 055 carbone','rm 055 prix','rm golf','rm golfeur'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 055 Bubba Watson : boîtier céramique blanche/carbone, résistant aux chocs du golf. Mouvement squelette, 49.9mm. Marché 150 000–200 000€. Contactez-nous pour sourcing.`,
        `RM 055 Bubba Watson: white ceramic/carbon case, golf-shock resistant. Skeleton movement, 49.9mm. Market €150,000–200,000. Contact us to source.`
      );} },

    { id:'rm_010', kw:['rm 010','rm010','rm 10','rm10','rm 010 automatique','rm 010 automatic','rm 010 titane','rm 010 titanium','rm 010 or rose','rm 010 rose gold','rm 010 acier','rm entry level','rm entrée de gamme'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 010 : automatique avec date, l'une des RM les plus classiques. Boîtier tonneau titane/or rose, 48mm. Marché 100 000–180 000€. Point d'entrée RM historique. Contactez-nous.`,
        `RM 010: automatic with date, one of the most classic RMs. Tonneau titanium/rose gold case, 48mm. Market €100,000–180,000. Historic RM entry point. Contact us.`
      );} },

    { id:'rm_030', kw:['rm 030','rm030','rm 30','rm30','rm 030 americas','rm 030 declutchable rotor','declutchable','rotor débrayable','rm 030 titane','rm 030 carbone','rm 030 ceramique','rm 030 automatic'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 030 : automatique avec rotor débrayable breveté. Boîtier tonneau titane/céramique/carbone. Marché 130 000–200 000€. Innovation mécanique signature RM. Contactez-nous.`,
        `RM 030: automatic with patented declutchable rotor. Tonneau titanium/ceramic/carbon case. Market €130,000–200,000. Signature RM mechanical innovation. Contact us.`
      );} },

    { id:'rm_067', kw:['rm 067','rm067','rm 67','rm67','rm 67-01','rm 67-02','rm extra flat','rm extra plat','rm mince','rm thin','rm slim','rm 067 automatique','rm sportif','rm athlete edition','rm 67 carbone','rm 67 titane','rm everyday','rm quotidien'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 67-01 Extra Flat : la RM la plus fine (7.75mm). Automatique, boîtier tonneau titane/carbone. Marché 100 000–150 000€. RM 67-02 en éditions athlètes (sprint, saut en hauteur). Contactez-nous.`,
        `RM 67-01 Extra Flat: thinnest RM (7.75mm). Automatic, tonneau titanium/carbon case. Market €100,000–150,000. RM 67-02 in athlete editions (sprint, high jump). Contact us.`
      );} },

    { id:'rm_072', kw:['rm 072','rm072','rm 72','rm72','rm 72-01','rm 72-01 lifestyle','rm lifestyle','rm chronographe','rm chrono flyback','rm 072 automatique','rm 072 ceramic','rm 072 céramique'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 72-01 Lifestyle Chronographe : flyback automatique, boîtier tonneau céramique/titane. Design contemporain à double compteur. Marché 180 000–250 000€. Contactez-nous.`,
        `RM 72-01 Lifestyle Chronograph: automatic flyback, tonneau ceramic/titanium case. Contemporary twin-counter design. Market €180,000–250,000. Contact us.`
      );} },

    { id:'rm_005', kw:['rm 005','rm005','rm 5','rm5','rm 005 felipe massa','rm 005 automatique','rm 005 automatic','rm 005 titane','rm 005 titanium','rm premiere','rm first automatic'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 005 Felipe Massa : premier automatique RM (2003). Boîtier tonneau titane, masse oscillante variable. Marché 80 000–120 000€. Pièce historique de la marque. Contactez-nous.`,
        `RM 005 Felipe Massa: first RM automatic (2003). Tonneau titanium case, variable-geometry rotor. Market €80,000–120,000. Historic piece for the brand. Contact us.`
      );} },

    { id:'rm_016', kw:['rm 016','rm016','rm 16','rm16','rm extra plat ancien','rm 016 automatique','rm 016 automatic','rm 016 titane','rm 016 or','rm toro','rm culture'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 016 : automatique extra-plat, la première RM fine. Boîtier tonneau titane/or, réhaut incliné distinctif. Marché 80 000–130 000€. Contactez-nous.`,
        `RM 016: extra-flat automatic, the first thin RM. Tonneau titanium/gold case, distinctive angled flange. Market €80,000–130,000. Contact us.`
      );} },

    { id:'rm_050', kw:['rm 050','rm050','rm 50','rm50','rm 50-03','rm 50-03 mclaren','mclaren rm','rm tourbillon chrono','rm chronographe tourbillon','rm split second tourbillon','rm 056','rm 056 saphir','rm sapphire','rm transparent'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 050 Tourbillon Chronographe : chronographe rattrapante + tourbillon. Pièce haute horlogerie RM. RM 056 en saphir transparent (~2M€). RM 50-03 McLaren (graphène, le plus léger). Contactez-nous.`,
        `RM 050 Tourbillon Chronograph: split-second chronograph + tourbillon. RM haute horlogerie piece. RM 056 in transparent sapphire (~€2M). RM 50-03 McLaren (graphene, lightest). Contact us.`
      );} },

    { id:'rm_069', kw:['rm 069','rm069','rm 69','rm69','rm erotic','rm érotique','rm 069 tourbillon','rm fun','rm playful','rm man'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `RM 69 Erotic Tourbillon : tourbillon avec message rotatif érotique sur le cadran. Pièce ludique et provocatrice, édition très limitée. Marché 500 000€+. Contactez-nous.`,
        `RM 069 Erotic Tourbillon: tourbillon with rotating erotic message on dial. Playful and provocative piece, very limited edition. Market €500,000+. Contact us.`
      );} },



    // ── CARTIER ─────────────────────────────────────────────────────────────────
    { id:'rm_001', kw:['rm 001','rm001','richard mille 001','richard mille first','premier richard mille','rm tourbillon original','first rm','rm premiere','rm genesis','01 tourbillon','rm001 prix','rm001 price'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 001'; return t(
      `RM 001 (2001) : le tourbillon fondateur. Boîtier tonneau titane, 50x38mm, mouvement squelette manuel, 45mm réserve de marche, étanchéité 30m. La montre qui a marqué la naissance de RM : ultra-légère, innovation mécanique pure. Marché 250 000–500 000€. Pièce historique de référence.`,
      `RM 001 (2001): the founding tourbillon. Tonneau titanium case, 50x38mm, skeleton manual movement, 45h power reserve, 30m water resistance. The watch that marked RM's birth: ultra-light, pure mechanical innovation. Market €250,000–500,000. Historic reference piece.`
    );} },

    { id:'rm_003', kw:['rm 003','rm003','rm 3','rm3','rm 003 tourbillon','rm dual time','dual tourbillon','rm 003 prix','fuseaux horaires','dual time zone'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 003'; return t(
      `RM 003 Dual Time Tourbillon : tourbillon avec affichage dual time. Boîtier tonneau titane/or rose, 50mm, mouvement squelette calibre RM sur demande. Réserve 48h. Innovation GMT pour l'époque. Marché 300 000–450 000€. Contactez-nous.`,
      `RM 003 Dual Time Tourbillon: tourbillon with dual time display. Tonneau titanium/rose gold case, 50mm, skeleton movement custom calibre. 48h power reserve. GMT innovation for its era. Market €300,000–450,000. Contact us.`
    );} },

    { id:'rm_004', kw:['rm 004','rm004','rm 4','rm4','rm 004 chronographe','split seconds chronograph','rattrapante','chronographe flyback','rm 004 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 004'; return t(
      `RM 004 Chronographe à Rattrapante : split-seconds chronograph avec roue d'échappement à bascule. Boîtier tonneau titane, 50x40mm, mouvement squelette avec rattrapante mécanique compliquée. Marché 400 000–600 000€. Haute horlogerie RM signature.`,
      `RM 004 Chronographe à Rattrapante: split-seconds chronograph with lever escapement wheel. Tonneau titanium case, 50x40mm, skeleton movement with complex mechanical split-seconds. Market €400,000–600,000. Signature RM haute horlogerie.`
    );} },

    { id:'rm_006', kw:['rm 006','rm006','rm 6','rm6','rm 006 felipe massa','felipe massa 006','rm 006 formula 1','f1 watch','montre formula 1','rm 006 titane','chronographe felipemassa'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 006'; return t(
      `RM 006 Felipe Massa : tourbillon chronographe flyback pour le pilote de F1. Boîtier tonneau titane, 50x38mm, chronographe rattrapante integré, réserve 48h. Pièce sport historique RM. Marché 300 000–450 000€. Contactez-nous.`,
      `RM 006 Felipe Massa: tourbillon flyback chronograph for F1 driver. Tonneau titanium case, 50x38mm, integrated split-seconds chronograph, 48h power reserve. Historic RM sports piece. Market €300,000–450,000. Contact us.`
    );} },

    { id:'rm_007', kw:['rm 007','rm007','rm 7','rm7','rm ladies','rm femme','rm automatique femme','ladies automatic','rm rose','rm rose gold femme','rm 007 prix','montre femme luxe'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 007'; return t(
      `RM 007 Automatique Dame : première RM pour dame. Boîtier tonneau or rose/titane, 42x34mm, mouvement automatique calibre RM, réserve 48h. Design épuré féminin. Marché 120 000–200 000€. Contactez-nous.`,
      `RM 007 Automatique Dame: first RM for ladies. Tonneau rose gold/titanium case, 42x34mm, automatic movement custom calibre, 48h power reserve. Refined feminine design. Market €120,000–200,000. Contact us.`
    );} },

    { id:'rm_008', kw:['rm 008','rm008','rm 8','rm8','rm 008 chronographe','tourbillon split seconds','rattrapante tourbillon','rm 008 titane','rm 008 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 008'; return t(
      `RM 008 Tourbillon Chronographe à Rattrapante : combinaison tourbillon + split-seconds sur mouvement squelette. Boîtier tonneau titane, 50x40mm, la montre la plus complexe des débuts. Marché 500 000–750 000€. Haute horlogerie pure.`,
      `RM 008 Tourbillon Chronographe à Rattrapante: tourbillon + split-seconds on skeleton movement. Tonneau titanium case, 50x40mm, most complex watch from early years. Market €500,000–750,000. Pure haute horlogerie.`
    );} },

    { id:'rm_009', kw:['rm 009','rm009','rm 9','rm9','rm 009 felipe massa','titane felipe','rm masse','f1 titanium','rm 009 prix','sport edition'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 009'; return t(
      `RM 009 Felipe Massa Titane : tourbillon en titane ultra-pur pour le champion F1. Boîtier tonneau titane grade 5, 50mm, mouvement squelette. Pièce d'athlète incontournable. Marché 200 000–350 000€. Contactez-nous.`,
      `RM 009 Felipe Massa Titanium: ultra-pure titanium tourbillon for F1 champion. Tonneau grade 5 titanium case, 50mm, skeleton movement. Essential athlete piece. Market €200,000–350,000. Contact us.`
    );} },

    { id:'rm_012', kw:['rm 012','rm012','rm 12','rm12','rm 012 tourbillon','montre tourbillon','tonneau tourbillon','rm 012 titane','rm 012 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 012'; return t(
      `RM 012 Tourbillon : version classique du tourbillon RM. Boîtier tonneau titane/or rose, 50x38mm, mouvement squelette calibre RM, réserve 45h. Marché 180 000–300 000€. Montre référence RM.`,
      `RM 012 Tourbillon: classic version of RM tourbillon. Tonneau titanium/rose gold case, 50x38mm, skeleton movement custom calibre, 45h power reserve. Market €180,000–300,000. Reference RM watch.`
    );} },

    { id:'rm_015', kw:['rm 015','rm015','rm 15','rm15','rm perini navi','perini navi','rm yacht','nautique','dual time yacht','rm 015 prix','navigation watch'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 015'; return t(
      `RM 015 Perini Navi Dual Time Tourbillon : montre spécialement développée pour le chantier naval Perini Navi. Tourbillon avec fuseaux, étanchéité 100m. Boîtier tonneau titane/carbone NTPT, 50mm. Marché 350 000–500 000€. Unique partenariat.`,
      `RM 015 Perini Navi Dual Time Tourbillon: watch specially developed for Perini Navi yacht builder. Tourbillon with time zones, 100m water resistance. Tonneau titanium/carbon NTPT case, 50mm. Market €350,000–500,000. Unique partnership.`
    );} },

    { id:'rm_017', kw:['rm 017','rm017','rm 17','rm17','rm 017 extra plat','extra flat tourbillon','tourbillon ultra fin','rm mince','thin tourbillon','rm 017 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 017'; return t(
      `RM 017 Extra Flat Tourbillon : tourbillon ultra-plat, épaisseur réduite. Boîtier tonneau titane, 48mm, mouvement squelette ultra-fin. Première exploration RM de la finesse en complication. Marché 250 000–400 000€. Innovation d'épaisseur.`,
      `RM 017 Extra Flat Tourbillon: ultra-flat tourbillon, reduced thickness. Tonneau titanium case, 48mm, ultra-thin skeleton movement. First RM exploration of thinness in complications. Market €250,000–400,000. Thickness innovation.`
    );} },

    { id:'rm_019', kw:['rm 019','rm019','rm 19','rm19','rm 019 tourbillon','tourbillon evolution','rm 019 titane','rm 019 prix','generation 2 tourbillon'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 019'; return t(
      `RM 019 Tourbillon : évolution de la ligne tourbillon classique avec affinements de décoration. Boîtier tonneau titane, 50mm, mouvement squelette raffiné. Réserve 48h. Marché 200 000–320 000€. Montre evolution RM.`,
      `RM 019 Tourbillon: evolution of classic tourbillon line with decoration refinements. Tonneau titanium case, 50mm, refined skeleton movement. 48h power reserve. Market €200,000–320,000. Evolution RM watch.`
    );} },

    { id:'rm_021', kw:['rm 021','rm021','rm 21','rm21','rm aerodyne','aerodynamic','montre aérodynamique','rm 021 prix','aviation inspired','boîtier aviateur'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 021'; return t(
      `RM 021 Tourbillon Aérodyname : forme de fuselage d'avion (case en lozenge). Boîtier titane spécialement formé, 48x42mm, tourbillon, inspiration aéronautique pure. Marché 250 000–400 000€. Design architecture unique.`,
      `RM 021 Tourbillon Aérodyname: fuselage-shaped case (lozenge form). Specially shaped titanium case, 48x42mm, tourbillon, pure aviation inspiration. Market €250,000–400,000. Unique architectural design.`
    );} },

    { id:'rm_025', kw:['rm 025','rm025','rm 25','rm25','rm 025 diver','rm diver chronograph','rm chrono plongée','rm 025 300m','rm 025 carbone','richard mille diver','rm plongée'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 025'; return t(
      `RM 025 Tourbillon Chronographe Plongeur : chronographe flyback + tourbillon pour la plongée. Boîtier tonneau carbone NTPT, 50mm, étanchéité 300m, sandwich dial. Marché 400 000–600 000€. Sport extrême RM.`,
      `RM 025 Tourbillon Chronographe Plongeur: flyback chronograph + tourbillon for diving. Tonneau carbon NTPT case, 50mm, 300m water resistance, sandwich dial. Market €400,000–600,000. RM extreme sport.`
    );} },

    { id:'rm_026', kw:['rm 026','rm026','rm 26','rm26','rm ladies tourbillon','dame tourbillon','gemstone','pierres précieuses','rm 026 diamant','diamante','ladies luxury','montre dame luxe'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 026'; return t(
      `RM 026 Tourbillon Dame Serti : tourbillon pour dame avec sertissage de diamants/rubis/saphirs. Boîtier tonneau or rose, 42x34mm, mouvement squelette or rose. Marché 300 000–500 000€. Joaillerie RM.`,
      `RM 026 Tourbillon Dame Serti: ladies tourbillon with diamond/ruby/sapphire setting. Tonneau rose gold case, 42x34mm, rose gold skeleton movement. Market €300,000–500,000. RM jewellery piece.`
    );} },

    { id:'rm_028', kw:['rm 028','rm028','rm 28','rm28','rm 028 automatique','automatic diver','diver automatic','plongeur automatique','rm 028 300m','rm 028 titane','rm 028 carbone'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 028'; return t(
      `RM 028 Automatique Plongeur : premier automatique RM pour la plongée. Boîtier tonneau titane/carbone, 50mm, étanchéité 300m, mouvement automatique calibre RM. Marché 180 000–280 000€. Plongée accessible RM.`,
      `RM 028 Automatique Plongeur: first RM automatic for diving. Tonneau titanium/carbon case, 50mm, 300m water resistance, automatic movement custom calibre. Market €180,000–280,000. Accessible RM diving.`
    );} },

    { id:'rm_029', kw:['rm 029','rm029','rm 29','rm29','rm 029 automatique','oversize date','grande date','big date','rm 029 titane','rm 029 prix','automatique affichage'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 029'; return t(
      `RM 029 Automatique Grande Date : automatique avec affichage de date surélevé (oversized). Boîtier tonneau titane, 50mm, mouvement squelette calibre RM. Marché 140 000–220 000€. Automatique lisible RM.`,
      `RM 029 Automatique Grande Date: automatic with oversized date display. Tonneau titanium case, 50mm, skeleton movement custom calibre. Market €140,000–220,000. Readable RM automatic.`
    );} },

    { id:'rm_032', kw:['rm 032','rm032','rm 32','rm32','rm 032 chronographe','flyback chronograph diver','chronographe plongeur','rm 032 300m','rm 032 carbone','diver chronograph','plongeur chrono'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 032'; return t(
      `RM 032 Chronographe Flyback Plongeur : chronographe flyback automatique pour plongée. Boîtier tonneau carbone NTPT, 50mm, étanchéité 300m, mouvement squelette automatique. Marché 250 000–380 000€. Sportivité plongée RM.`,
      `RM 032 Chronographe Flyback Plongeur: automatic flyback chronograph for diving. Tonneau carbon NTPT case, 50mm, 300m water resistance, skeleton automatic movement. Market €250,000–380,000. RM diving sportiveness.`
    );} },

    { id:'rm_033', kw:['rm 033','rm033','rm 33','rm33','rm 033 automatique extra plat','extra flat automatic','ultra fin automatique','rm ultra mince','rm mince automatique','rm 033 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 033'; return t(
      `RM 033 Automatique Extra Flat : montre ultra-plate avec mouvement automatique. Boîtier tonneau titane, 48mm, épaisseur réduite, calibre automatique ultra-fin. Marché 120 000–200 000€. Innovation finesse automatique.`,
      `RM 033 Automatique Extra Flat: ultra-thin watch with automatic movement. Tonneau titanium case, 48mm, reduced thickness, ultra-thin automatic calibre. Market €120,000–200,000. Automatic thinness innovation.`
    );} },

    { id:'rm_036', kw:['rm 036','rm036','rm 36','rm36','rm jean todt','todt','g-sensor','accelerometer','rm 036 prix','formula 1 todt','motorsport legend'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 036'; return t(
      `RM 036 Jean Todt Tourbillon G-Sensor : montre avec accéléromètre mécanique pour legend F1 Jean Todt. Boîtier tonneau titane, 50mm, tourbillon + G-sensor calibré pour les forces du pilotage. Marché 300 000–450 000€. Technologie unique.`,
      `RM 036 Jean Todt Tourbillon G-Sensor: watch with mechanical accelerometer for F1 legend Jean Todt. Tonneau titanium case, 50mm, tourbillon + G-sensor calibrated for driving forces. Market €300,000–450,000. Unique technology.`
    );} },

    { id:'rm_037', kw:['rm 037','rm037','rm 37','rm37','rm ladies automatique','dame automatique','rm femme automatique','ladies automatic','rm 037 prix','montre femme automatique'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 037'; return t(
      `RM 037 Automatique Dame : automatique pour femme, design épuré. Boîtier tonneau or rose/titane, 42x34mm, mouvement automatique calibre RM, réserve 48h. Marché 100 000–180 000€. Automatique féminine RM.`,
      `RM 037 Automatique Dame: ladies automatic, refined design. Tonneau rose gold/titanium case, 42x34mm, automatic movement custom calibre, 48h power reserve. Market €100,000–180,000. Feminine RM automatic.`
    );} },

    { id:'rm_038', kw:['rm 038','rm038','rm 38','rm38','rm bubba watson','bubba watson','golf','golfeur champion','rm 038 tourbillon','montre golf','rm sport golf'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 038'; return t(
      `RM 038 Bubba Watson Tourbillon : tourbillon pour champion golfer Bubba Watson. Boîtier tonneau carbone NTPT/titane, 50mm, tourbillon, réserve 48h. Pièce sport emblématique. Marché 280 000–420 000€. Contactez-nous.`,
      `RM 038 Bubba Watson Tourbillon: tourbillon for golfer champion Bubba Watson. Tonneau carbon NTPT/titanium case, 50mm, tourbillon, 48h power reserve. Emblematic sports piece. Market €280,000–420,000. Contact us.`
    );} },

    { id:'rm_039', kw:['rm 039','rm039','rm 39','rm39','rm e6-b','e6b calculator','aviation chronographe','pilot watch','montre pilote','rm 039 chronographe','navigation pilot'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 039'; return t(
      `RM 039 Aviation E6-B Chronographe Flyback : chronographe flyback intégrant calculatrice aéronautique E6-B mécanique. Boîtier tonneau titane, 50mm, cadran spécialisé navigation. Marché 250 000–380 000€. Complexité aéronautique.`,
      `RM 039 Aviation E6-B Chronographe Flyback: flyback chronograph integrating mechanical E6-B aviation calculator. Tonneau titanium case, 50mm, specialized navigation dial. Market €250,000–380,000. Aviation complexity.`
    );} },

    { id:'rm_040', kw:['rm 040','rm040','rm 40','rm40','rm mclaren','mclaren speedtail','rm 040 mclaren','hypercar','supercar','rm 040 prix','automotive partnership'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 040'; return t(
      `RM 040 McLaren Speedtail : montre spécialement conçue pour l'hypercar McLaren Speedtail. Boîtier tonneau carbone NTPT/titane, 50mm, chronographe flyback automatique. Marché 300 000–450 000€. Partenariat automobiles RM.`,
      `RM 040 McLaren Speedtail: watch specially designed for McLaren Speedtail hypercar. Tonneau carbon NTPT/titanium case, 50mm, automatic flyback chronograph. Market €300,000–450,000. RM automotive partnership.`
    );} },

    { id:'rm_052', kw:['rm 052','rm052','rm 52','rm52','rm 052 skull','skull tourbillon','tête de mort','crâne','rm 052 prix','playful','ludique'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 052'; return t(
      `RM 052 Tourbillon Crâne : tourbillon avec cadran gravé crâne (design ludique). Boîtier tonneau titane/céramique/carbone, 50mm, tourbillon visible, réserve 50h. Pièce provoquatrice RM. Marché 250 000–400 000€. Playful complexity.`,
      `RM 052 Tourbillon Skull: tourbillon with skull engraved dial (playful design). Tonneau titanium/ceramic/carbon case, 50mm, visible tourbillon, 50h power reserve. Provocative RM piece. Market €250,000–400,000. Playful complexity.`
    );} },

    { id:'rm_056', kw:['rm 056','rm056','rm 56','rm56','rm sapphire','sapphire transparent','saphir transparent','rm 056 saphir','see through','transparent case','boîtier saphir'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 056'; return t(
      `RM 056 Tourbillon Saphir : boîtier entièrement en saphir transparent (ultra-rare, 2M€+). Tourbillon + chronographe à rattrapante visibles de tous côtés. Mouvement squelette ultra-fin en or rose. Marque d'exception absolue.`,
      `RM 056 Tourbillon Sapphire: entirely sapphire transparent case (ultra-rare, €2M+). Tourbillon + split-seconds chronograph visible from all sides. Ultra-thin skeleton movement in rose gold. Absolute masterpiece.`
    );} },

    { id:'rm_059', kw:['rm 059','rm059','rm 59','rm59','rm yohan blake','yohan blake','sprinter','100m','jamaica','track athlete','sports watch','montre sport'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 059'; return t(
      `RM 059 Yohan Blake Tourbillon : tourbillon pour le sprinteur jamaïcain. Boîtier tonneau carbone NTPT, 50mm, chronographe intégré, réserve 48h. Pièce athlète track-and-field RM. Marché 250 000–380 000€. Contactez-nous.`,
      `RM 059 Yohan Blake Tourbillon: tourbillon for Jamaican sprinter. Tonneau carbon NTPT case, 50mm, integrated chronograph, 48h power reserve. RM track-and-field athlete piece. Market €250,000–380,000. Contact us.`
    );} },

    { id:'rm_061', kw:['rm 061','rm061','rm 61','rm61','rm yohan blake flyback','chronographe blake','flyback yohan','sprinter flyback','rm 061 prix','track chronograph'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 061'; return t(
      `RM 061 Yohan Blake Chronographe Flyback : chronographe flyback pour le sprinter, réglé au centième de seconde. Boîtier tonneau carbone NTPT, 50mm, mouvement chronographe ultra-précis. Marché 280 000–420 000€. Précision athlète.`,
      `RM 061 Yohan Blake Chronographe Flyback: flyback chronograph for sprinter, accurate to hundredths of second. Tonneau carbon NTPT case, 50mm, ultra-precise chronograph movement. Market €280,000–420,000. Athlete precision.`
    );} },

    { id:'rm_062', kw:['rm 062','rm062','rm 62','rm62','rm vibrant alarm','vibrating alarm','alarme vibrante','acj','rm 062 prix','alarm tourbillon','complication alarm'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 062'; return t(
      `RM 062 Tourbillon Alarme Vibrante (ACJ) : tourbillon avec alarme mécanique vibrante. Boîtier tonneau titane, 50mm, mouvement squelette avec système d'alarme breveté, réserve 48h. Pièce mécanique innovante. Marché 350 000–500 000€. Complication rare.`,
      `RM 062 Tourbillon Vibrating Alarm (ACJ): tourbillon with mechanical vibrating alarm. Tonneau titanium case, 50mm, skeleton movement with patented alarm system, 48h power reserve. Innovative mechanical piece. Market €350,000–500,000. Rare complication.`
    );} },

    { id:'rm_068', kw:['rm 068','rm068','rm 68','rm68','rm cyril kongo','cyril kongo','boxer','champion boxer','boxing watch','montre boxeur','rm 068 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 068'; return t(
      `RM 068 Cyril Kongo Tourbillon : tourbillon pour champion boxer Cyril Kongo. Boîtier tonneau carbone NTPT/céramique, 50mm, tourbillon surdiminutif visible, réserve 50h. Pièce athlète combat RM. Marché 260 000–400 000€. Contactez-nous.`,
      `RM 068 Cyril Kongo Tourbillon: tourbillon for boxer champion Cyril Kongo. Tonneau carbon NTPT/ceramic case, 50mm, overdimensioned visible tourbillon, 50h power reserve. RM combat athlete piece. Market €260,000–400,000. Contact us.`
    );} },

    { id:'rm_070', kw:['rm 070','rm070','rm 70','rm70','rm alain prost','alain prost','f1 legend','formula 1','le professeur','rm 070 prix','motorsport icon'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 070'; return t(
      `RM 070 Alain Prost Tourbillon : montre du legend F1 Alain Prost "Le Professeur". Boîtier tonneau titane/or rose, 50mm, tourbillon visible, réserve 48h. Pièce athlète motoriste RM. Marché 280 000–420 000€. Icon F1 partnership.`,
      `RM 070 Alain Prost Tourbillon: watch for F1 legend Alain Prost "Le Professeur". Tonneau titanium/rose gold case, 50mm, visible tourbillon, 48h power reserve. RM motorsport athlete piece. Market €280,000–420,000. Icon F1 partnership.`
    );} },

    { id:'rm_071', kw:['rm 071','rm071','rm 71','rm71','rm dame automatique tourbillon','ladies auto tourbillon','automatique dame','femme automatique','rm 071 prix','lady automatic'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 071'; return t(
      `RM 071 Automatique Tourbillon Dame : automatique avec tourbillon pour femme. Boîtier tonneau or rose, 42x34mm, mouvement automatique avec tourbillon intégré, réserve 48h. Marché 280 000–450 000€. Complication dame RM.`,
      `RM 071 Automatique Tourbillon Dame: automatic with tourbillon for ladies. Tonneau rose gold case, 42x34mm, automatic movement with integrated tourbillon, 48h power reserve. Market €280,000–450,000. RM lady complication.`
    );} },

    { id:'rm_074', kw:['rm 074','rm074','rm 74','rm74','rm dame automatique','ladies tourbillon edition','lady auto','femme tourbillon','rm 074 prix','diamond setting','setting'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 074'; return t(
      `RM 074 Automatique Tourbillon Dame Serti : version sertie de la RM 071 avec diamants/saphirs. Boîtier tonneau or rose, 42x34mm, tourbillon automatique, setting gemme signature. Marché 350 000–550 000€. Joaillerie féminine RM.`,
      `RM 074 Automatique Tourbillon Dame Serti: gemstone-set version of RM 071 with diamonds/sapphires. Tonneau rose gold case, 42x34mm, automatic tourbillon, signature gem setting. Market €350,000–550,000. RM feminine jewellery.`
    );} },

    
    // ──────────────────────────────────────────────────────────────────────────
    // RICHARD MILLE FULL COLLECTION — Ultimate Chronograph & Tourbillon Coverage
    // ──────────────────────────────────────────────────────────────────────────

    { id:'rm_002', kw:['rm002','rm 002','tourbillon early model','richard mille 002','rm002 tourbillon','early tourbillon model','richard mille historic'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 002'; return t(
        `Richard Mille réf. RM 002 (tourbillon). Modèle précoce collection RM. Calibre tourbillon signature Mille. Designs futuristes premiers jours. Très recherché. Marché 500 000–800 000€ selon état/certificats.`,
        `Richard Mille ref. RM 002 (tourbillon). Early collection RM model. Signature Mille tourbillon caliber. Futuristic early-era designs. Highly sought. Market: €500,000–800,000 depending on condition/certificates.`
      );} },

    { id:'rm_014', kw:['rm014','rm 014','perini navi flyback','richard mille perini','rm014 chronograph','flyback chronograph rm','chronograph perini navi'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 014 Perini Navi'; return t(
        `Richard Mille réf. RM 014 Perini Navi (chronographe flyback). Édition limitée partenariat Perini Navi superyachts. Calibre CH 30-01 (chronographe). Marché 450 000–700 000€. Rarement disponible.`,
        `Richard Mille ref. RM 014 Perini Navi (flyback chronograph). Limited edition Perini Navi superyacht partnership. Calibre CH 30-01 (chronograph). Market: €450,000–700,000. Rarely available.`
      );} },

    { id:'rm_018', kw:['rm018','rm 018','tourbillon boucheron hommage','boucheron hommage','richard mille boucheron','rm018 tourbillon','jewelry partnership'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 018 Boucheron Hommage'; return t(
        `Richard Mille réf. RM 018 Boucheron Hommage (tourbillon). Collaboration Richard Mille × Boucheron joaillerie. Boîtier bijoux platine/diamants. Ultra rare. Marché 600 000€+. Fusion haute joaillerie-horlogerie.`,
        `Richard Mille ref. RM 018 Boucheron Hommage (tourbillon). Richard Mille × Boucheron jewelry collaboration. Diamond-set platinum case. Ultra rare. Market: €600,000+. High jewelry-watchmaking fusion.`
      );} },

    { id:'rm_020', kw:['rm020','rm 020','tourbillon pocket watch','pocket watch tourbillon','richard mille pocket','rm020 chronograph','chronograph pocket'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 020 Tourbillon Pocket Watch'; return t(
        `Richard Mille réf. RM 020 (montre de poche tourbillon). Édition spéciale poche chronographe. Calibre tourbillon personnalisé Mille. Très rare collecte. Marché 400 000–600 000€. Format gousset moderne.`,
        `Richard Mille ref. RM 020 (tourbillon pocket watch). Special edition pocket chronograph. Custom Mille tourbillon caliber. Very rare collect. Market: €400,000–600,000. Modern pocket format.`
      );} },

    { id:'rm_023', kw:['rm023','rm 023','ladies automatic','richard mille ladies','rm023 automatic','women tourbillon','ladies richard mille'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 023 Ladies Automatic'; return t(
        `Richard Mille réf. RM 023 (montre automatique dames, 35mm). Calibre automatique Richard Mille. Boîtier or rose/platine. Extrêmement rare. Marché 300 000–500 000€. Montre sportive féminine Richard Mille.`,
        `Richard Mille ref. RM 023 (ladies automatic, 35mm). Richard Mille automatic caliber. Rose gold/platinum case. Extremely rare. Market: €300,000–500,000. Ladies' Richard Mille sports watch.`
      );} },

    { id:'rm_031', kw:['rm031','rm 031','high performance automatic','automatic chronograph','rm031 automatic','high performance tourbillon','chronograph automatic'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 031 High Performance Automatic'; return t(
        `Richard Mille réf. RM 031 (chronographe automatique haute performance). Calibre automatique chronographe Mille. Performances extrêmes. Marché 450 000–700 000€. Montre sportive automatique Mille. Très rare.`,
        `Richard Mille ref. RM 031 (high performance automatic chronograph). Mille automatic chronograph caliber. Extreme performance. Market: €450,000–700,000. Mille automatic sports watch. Very rare.`
      );} },

    { id:'rm_034', kw:['rm034','rm 034','automatic oversize date','oversized date complication','rm034 automatic','date complication','automatic with date'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 034 Automatic Oversize Date'; return t(
        `Richard Mille réf. RM 034 (automatique grand date). Calibre automatique avec indication date surdimensionnée. Design moderne lisibilité. Marché 400 000–600 000€. Montre automatique complication Mille.`,
        `Richard Mille ref. RM 034 (automatic oversize date). Automatic caliber with oversized date display. Modern readable design. Market: €400,000–600,000. Mille automatic complication watch.`
      );} },

    { id:'rm_041', kw:['rm041','rm 041','montre automatique','automatic richard mille','chronograph automatic','rm041 tourbillon','automatique chronographe'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 041 Montre Automatique'; return t(
        `Richard Mille réf. RM 041 (montre automatique tourbillon). Calibre automatique tourbillon équilibrage. Très rare. Marché 500 000–800 000€. Collection automatique Mille prestigieuse.`,
        `Richard Mille ref. RM 041 (automatic tourbillon watch). Automatic tourbillon regulation caliber. Very rare. Market: €500,000–800,000. Prestigious Mille automatic collection.`
      );} },

    { id:'rm_042', kw:['rm042','rm 042','tourbillon bubba watson','bubba watson edition','golf tourbillon','rm042 sports','professional athlete watch'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 042 Tourbillon Bubba Watson'; return t(
        `Richard Mille réf. RM 042 Bubba Watson (tourbillon). Édition limitée golfeur professionnel Bubba Watson. Boîtier titane/or. Ultra-rare. Marché 500 000–750 000€. Montre ambassadeur sports Mille.`,
        `Richard Mille ref. RM 042 Bubba Watson (tourbillon). Limited edition pro golfer Bubba Watson. Titanium/gold case. Ultra-rare. Market: €500,000–750,000. Mille sports ambassador watch.`
      );} },

    { id:'rm_043', kw:['rm043','rm 043','tourbillon breeze','breeze edition','ladies tourbillon','rm043 ladies','women sports watch'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 043 Tourbillon Breeze'; return t(
        `Richard Mille réf. RM 043 Breeze (tourbillon dames). Calibre tourbillon miniaturisé dames. Boîtier or rose/platine 32mm. Extrêmement rare. Marché 400 000–600 000€. Montre féminine sport Richard Mille prestige.`,
        `Richard Mille ref. RM 043 Breeze (ladies tourbillon). Miniaturized ladies tourbillon caliber. Rose gold/platinum 32mm case. Extremely rare. Market: €400,000–600,000. Prestigious Mille ladies sports watch.`
      );} },

    { id:'rm_047', kw:['rm047','rm 047','tourbillon ladies','ladies tourbillon sports','rm047 automatic','women chronograph','ladies sports richard mille'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 047 Ladies Tourbillon'; return t(
        `Richard Mille réf. RM 047 (tourbillon dames automatique, 34mm). Calibre tourbillon dames sports haute performance. Marché 450 000–700 000€. Montre dames collection Mille ultime. Très rare.`,
        `Richard Mille ref. RM 047 (ladies automatic tourbillon, 34mm). Ladies sports tourbillon high performance caliber. Market: €450,000–700,000. Ultimate Mille ladies collection watch. Very rare.`
      );} },

    { id:'rm_048', kw:['rm048','rm 048','tourbillon regulator','regulator dial','tourbillon with regulator','rm048 regulator','dial regulateur'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 048 Tourbillon Regulator'; return t(
        `Richard Mille réf. RM 048 (tourbillon régulateur). Calibre tourbillon avec cadran régulateur heures/minutes séparées. Très rare. Marché 500 000–800 000€. Complication horlogère classique modernisée Mille.`,
        `Richard Mille ref. RM 048 (tourbillon regulator). Tourbillon caliber with regulator dial separate hours/minutes. Very rare. Market: €500,000–800,000. Classic watchmaking complication modernized by Mille.`
      );} },

    { id:'rm_051', kw:['rm051','rm 051','tourbillon tiger','wildlife edition','animal sports watch','rm051 chronograph','nature inspiration'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 051 Tourbillon Tiger'; return t(
        `Richard Mille réf. RM 051 Tiger (tourbillon). Édition limitée animaux sauvages tigre. Boîtier titane noir/or. Très rare. Marché 450 000–650 000€. Collection sportive nature Mille.`,
        `Richard Mille ref. RM 051 Tiger (tourbillon). Limited wildlife edition tiger. Black titanium/gold case. Very rare. Market: €450,000–650,000. Mille nature sports collection.`
      );} },

    { id:'rm_053', kw:['rm053','rm 053','tourbillon pablo mac donough','polo player edition','polo tourbillon','sports personality watch','rm053 sports'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 053 Tourbillon Pablo Mac Donough'; return t(
        `Richard Mille réf. RM 053 Pablo Mac Donough (tourbillon). Édition limitée champion polo argentin. Boîtier or/titane personnalisé. Ultra-rare. Marché 500 000–750 000€. Partenaire sports Richard Mille.`,
        `Richard Mille ref. RM 053 Pablo Mac Donough (tourbillon). Limited edition Argentine polo champion. Custom gold/titanium case. Ultra-rare. Market: €500,000–750,000. Richard Mille sports partner.`
      );} },

    { id:'rm_057', kw:['rm057','rm 057','tourbillon dragon','mythology edition','asian design','rm057 chronograph','dragon watch'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 057 Tourbillon Dragon'; return t(
        `Richard Mille réf. RM 057 Dragon (tourbillon). Édition limitée mythologie dragon asiatique. Boîtier or rose/platine gravure. Très rare. Marché 550 000–800 000€. Collection culturelle Mille.`,
        `Richard Mille ref. RM 057 Dragon (tourbillon). Limited mythology Asian dragon edition. Engraved rose gold/platinum case. Very rare. Market: €550,000–800,000. Mille cultural collection.`
      );} },

    { id:'rm_058', kw:['rm058','rm 058','tourbillon world timer','world time complication','world timer','travel complication','rm058 gmt'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 058 Tourbillon World Timer'; return t(
        `Richard Mille réf. RM 058 (tourbillon World Timer). Calibre tourbillon indication GMT 24 fuseaux. Complication voyage Mille. Très rare. Marché 500 000–800 000€. Montre aventure prestige.`,
        `Richard Mille ref. RM 058 (tourbillon World Timer). Tourbillon caliber with GMT 24-hour world time indication. Mille travel complication. Very rare. Market: €500,000–800,000. Prestige adventure watch.`
      );} },

    { id:'rm_060', kw:['rm060','rm 060','flyback chronograph regatta','sailing chronograph','nautical sports watch','rm060 chronograph','yacht regatta'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 060 Flyback Chronograph Regatta'; return t(
        `Richard Mille réf. RM 060 (chronographe flyback régate). Calibre chronographe rattrapante voile. Spécifique sports nautiques. Très rare. Marché 450 000–700 000€. Montre régate prestige.`,
        `Richard Mille ref. RM 060 (flyback chronograph regatta). Sailing split-seconds chronograph caliber. Specific water sports. Very rare. Market: €450,000–700,000. Prestige regatta watch.`
      );} },

    { id:'rm_063', kw:['rm063','rm 063','automatic dizzy hands','playful automatic','whimsical watch','rm063 chronograph','artistic watch design'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 063 Automatic Dizzy Hands'; return t(
        `Richard Mille réf. RM 063 (automatique mains amusantes « dizzy »). Calibre automatique aiguilles décalées ludiques. Design artiste Mille. Très rare. Marché 400 000–600 000€. Montre jeune collection Mille.`,
        `Richard Mille ref. RM 063 (automatic dizzy hands). Automatic caliber with playful offset hands. Artist Mille design. Very rare. Market: €400,000–600,000. Young Mille collection watch.`
      );} },

    { id:'rm_066', kw:['rm066','rm 066','automatic extra flat','ultra thin automatic','flat tourbillon','slim sports watch','rm066 chronograph'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 066 Automatic Extra Flat'; return t(
        `Richard Mille réf. RM 066 (automatique ultra-plate). Calibre automatique ultra-fin 4mm. Prouesse mécanique Mille. Très rare. Marché 500 000–750 000€. Montre extra-mince sport Mille.`,
        `Richard Mille ref. RM 066 (automatic extra flat). Ultra-thin 4mm automatic caliber. Mille mechanical feat. Very rare. Market: €500,000–750,000. Mille ultra-slim sports watch.`
      );} },

    { id:'rm_073', kw:['rm073','rm 073','automatic tourbillon','tourbillon automatic hybrid','hybrid complication','rm073 chronograph','dual complication watch'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 073 Automatic Tourbillon'; return t(
        `Richard Mille réf. RM 073 (automatique avec tourbillon). Calibre hybride automatique + tourbillon. Complications duales. Très rare innovation. Marché 550 000–850 000€. Montre technologie Mille prestige.`,
        `Richard Mille ref. RM 073 (automatic tourbillon). Hybrid automatic + tourbillon caliber. Dual complications. Very rare innovation. Market: €550,000–850,000. Prestigious Mille technology watch.`
      );} },

    { id:'cartier_general', kw:['cartier','cartier montre','cartier paris','achat cartier','vente cartier','cartier occasion','cartier pre-owned','cartier histoire','cartier jewellery','cartier bijouterie','cartier joaillier','panthere cartier','cartier femme','cartier homme','cartier watch','cartier watches','cartier models','what cartier','which cartier','cartier available','cartier in stock','cartier you have','avez vous des cartier','got any cartier','cartier brand','cartier dealer','buy cartier','acheter cartier','cartier collection','cartier available','cartier models','cartier price','cartier worth','cartier luxury','cartier jewel','cartier iconic','cartier love','cartier panthère','cartier panthere'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Cartier fondée à Paris en 1847. Maison de joaillerie et horlogerie. Nous avons ${STOCK.filter(w=>w.brand==='Cartier').length} Cartier en stock (Juste un Clou…). Quel modèle vous intéresse ?`,
        `Cartier founded in Paris in 1847. Jewellery and watchmaking house. We have ${STOCK.filter(w=>w.brand==='Cartier').length} Cartier in stock (Juste un Clou…). Which model interests you?`
      );} },

    { id:'cartier_santos', kw:['santos','santos cartier','santos 100','santos medium','santos large','santos dumont','santos acier','santos or','santos bracelet','wssa0018','wssa0009','santos flyback','santos chronographe','alberto santos dumont','aviation watch','montre aviateur'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos'; return t(
        `Santos : première montre bracelet pour homme (1904). Boîtier carré vissé, bracelet intégré interchangeable. Marché Santos Medium acier ~7 000–9 000€. Contactez-nous pour disponibilité.`,
        `Santos: the first men's wristwatch (1904). Square screwed case, interchangeable integrated bracelet. Steel Santos Medium market ~€7,000–9,000. Contact us for availability.`
      );} },

    { id:'cartier_tank', kw:['tank cartier','tank louis','tank must','tank solo','tank américaine','tank anglaise','tank française','w5200014','w5200003','wsta0039','tank solo','cartier tank homme','cartier tank femme','tank vintage','tank 1917','wwi tank'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank'; return t(
        `Tank Cartier créée en 1917 inspirée des chars WWI. Must de Cartier (~1 800–5 000€), Tank Louis Cartier or (~8 000–15 000€). Contactez-nous selon votre budget.`,
        `Tank Cartier created 1917, inspired by WWI tanks. Must de Cartier (~€1,800–5,000), Tank Louis Cartier gold (~€8,000–15,000). Contact us with your budget.`
      );} },

    { id:'cartier_ballon_bleu', kw:['ballon bleu','ballon bleu cartier','3001','3489','ballon 36','ballon 40','ballon 42','ballon acier','ballon or','ballon diamants','ballon bleu femme','ballon bleu homme','wgbb0016','wsbb0003','wsbb0049'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu'; return t(
        `Ballon Bleu : boîtier rond, couronne saphir protégée. Acier 36mm ~5 000–7 000€, acier 40mm ~7 000–9 000€. Contactez-nous pour disponibilité.`,
        `Ballon Bleu: round case, sapphire-protected crown. Steel 36mm ~€5,000–7,000, steel 40mm ~€7,000–9,000. Contact us for availability.`
      );} },

    { id:'cartier_juste_un_clou', kw:['juste un clou','just a nail','nail bracelet','clou cartier','wjba0042','clou or','clou bracelet','cartier nail','juste un clou prix'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Juste un Clou'; const s=STOCK.filter(w=>w.brand==='Cartier'); return t(
        `Nos Cartier :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nJuste un Clou : bracelet-jonc en forme de clou, iconique depuis 1971.`,
        `Our Cartier:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nJuste un Clou: nail-shaped bangle, iconic since 1971.`
      );} },

    { id:'cartier_panthere', kw:['panthère','panthere','panthere cartier','panthère de cartier','cartier panthere','cartier panthère','wspn0007','wspn0006','wspn0019','panthere mini','panthere small','panthere medium','panthere or','panthere gold','panthere acier','panthere steel','panthere quartz','montre panthere','chaînon','chain bracelet cartier','art deco cartier'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Panthère de Cartier : montre iconique Art Déco, bracelet chaînon souple. Mini, Small, Medium. Acier (~4 000–6 000€), or (~10 000–25 000€). Relancée en 2017. Contactez-nous.`,
        `Panthère de Cartier: iconic Art Deco watch, supple chain bracelet. Mini, Small, Medium. Steel (~€4,000–6,000), gold (~€10,000–25,000). Relaunched 2017. Contact us.`
      );} },

    { id:'cartier_pasha', kw:['pasha','pasha cartier','pasha de cartier','pasha 41','pasha 35','pasha chronographe','pasha grille','pasha 2021','wspa0009','wspa0013','pasha acier','pasha or','pasha skeleton','pasha squelette','cartier pasha','pasha seatimer','pasha c'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Pasha de Cartier : boîtier rond avec couronne vissée protégée, cadran grillé signature. Relancé 2020 en 41mm et 35mm. Acier ~7 000–10 000€, or ~15 000–25 000€. Contactez-nous.`,
        `Pasha de Cartier: round case with screw-down protected crown, signature grid dial. Relaunched 2020 in 41mm and 35mm. Steel ~€7,000–10,000, gold ~€15,000–25,000. Contact us.`
      );} },

    { id:'cartier_drive', kw:['drive','drive de cartier','drive cartier','cartier drive','wsnm0004','wsnm0008','drive acier','drive or','drive automatique','drive lune','drive moonphase','coussin cartier','cushion cartier','drive 40mm','drive extra flat'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Drive de Cartier : boîtier coussin arrondi, 40mm. Automatique ou Extra-Flat. Acier ~5 000–7 000€, or ~12 000–18 000€. Montre masculine élégante. Contactez-nous pour disponibilité.`,
        `Drive de Cartier: rounded cushion case, 40mm. Automatic or Extra-Flat. Steel ~€5,000–7,000, gold ~€12,000–18,000. Elegant men's watch. Contact us for availability.`
      );} },

    { id:'cartier_ronde', kw:['ronde','ronde solo','ronde de cartier','ronde louis cartier','cartier ronde','ronde must','w6700155','w6700255','wsrn0031','ronde 36','ronde 40','ronde acier','ronde or','ronde cuir','ronde leather','ronde automatique','cartier rond','round cartier'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Ronde de Cartier : forme ronde classique, chiffres romains, cabochon bleu. Ronde Solo (~2 500–4 000€), Ronde Louis Cartier or (~8 000–15 000€). Élégance intemporelle. Contactez-nous.`,
        `Ronde de Cartier: classic round shape, Roman numerals, blue cabochon. Ronde Solo (~€2,500–4,000), Ronde Louis Cartier gold (~€8,000–15,000). Timeless elegance. Contact us.`
      );} },

    { id:'cartier_calibre', kw:['calibre','calibre de cartier','calibre cartier','cartier calibre','w7100015','w7100037','calibre diver','calibre plongée','calibre acier','calibre or','calibre 42mm','calibre automatique','calibre chronographe'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Calibre de Cartier : montre sport masculine, 42mm. Acier (~5 000–7 000€), or (~12 000€+). Existe en version Diver 300m. Premier mouvement manufacture Cartier (1904 MC). Contactez-nous.`,
        `Calibre de Cartier: men's sport watch, 42mm. Steel (~€5,000–7,000), gold (~€12,000+). Available in Diver 300m version. First Cartier manufacture movement (1904 MC). Contact us.`
      );} },

    { id:'cartier_cle', kw:['clé','clé de cartier','cle de cartier','cartier clé','cartier cle','wgcl0005','wscl0018','clé acier','clé or','clé automatique','clé 40mm','clé 35mm','couronne clé','key cartier','cartier key shape'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Clé de Cartier : couronne en forme de clé distinctive. 40mm homme, 35mm femme. Acier ~5 000–7 000€, or ~12 000€+. Design moderne lancé en 2015. Contactez-nous.`,
        `Clé de Cartier: distinctive key-shaped crown. 40mm men's, 35mm ladies'. Steel ~€5,000–7,000, gold ~€12,000+. Modern design launched 2015. Contact us.`
      );} },

    { id:'cartier_crash', kw:['crash','crash cartier','cartier crash','crash watch','montre crash','crash london','crash 1967','crash surréaliste','surrealist watch','crash asymétrique','crash asymmetric','crash or','crash gold','crash limited','crash vintage','crash dali','melting watch','fondue montre'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Crash Cartier : montre surréaliste créée à Londres en 1967. Boîtier asymétrique "fondu", or, éditions très limitées. Marché vintage 50 000–200 000€+. Pièce collector rare. Contactez-nous.`,
        `Cartier Crash: surrealist watch created in London 1967. Asymmetric "melted" case, gold, very limited editions. Vintage market €50,000–200,000+. Rare collector piece. Contact us.`
      );} },

    { id:'cartier_rotonde', kw:['rotonde','rotonde de cartier','cartier rotonde','rotonde tourbillon','rotonde minute repeater','rotonde mystérieuse','mysterious cartier','cartier mystère','rotonde skeleton','rotonde squelette','rotonde astrotourbillon','astrotourbillon','cartier haute horlogerie','cartier grand complication'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Rotonde de Cartier : haute horlogerie Cartier. Tourbillons, répétitions minutes, heures mystérieuses, astrotourbillon. Or, 40–45mm. Marché 50 000€ à 500 000€+. Contactez-nous.`,
        `Rotonde de Cartier: Cartier haute horlogerie. Tourbillons, minute repeaters, mysterious hours, astrotourbillon. Gold, 40–45mm. Market €50,000 to €500,000+. Contact us.`
      );} },

    { id:'cartier_tortue', kw:['tortue','tortue cartier','cartier tortue','tortue or','tortue gold','tortue chronographe','tortue monopusher','tortue monopoussoir','tortue vintage','tortue xl','w1556234','tortue skeleton','cartier tonneau'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Tortue Cartier : boîtier forme tortue, design 1912. Chronographe monopoussoir, éditions limitées. Or. Marché 15 000–50 000€+. Classique de collection Cartier. Contactez-nous.`,
        `Cartier Tortue: tortue-shaped case, 1912 design. Mono-pusher chronograph, limited editions. Gold. Market €15,000–50,000+. Cartier collection classic. Contact us.`
      );} },

    { id:'cartier_santos_dumont', kw:['santos dumont','santos-dumont','dumont','santos dumont cartier','ultra thin santos','santos plat','santos fin','wssa0022','wssa0032','santos dumont xl','santos dumont large','santos dumont small','dumont or','dumont acier','dumont leather','dumont cuir','santos extra plat','santos quartz'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Santos-Dumont : version ultra-plate du Santos, bracelet cuir. Small et Large. Acier ~4 000–6 000€, or ~8 000–15 000€. Hommage au pionnier de l'aviation Alberto Santos-Dumont. Contactez-nous.`,
        `Santos-Dumont: ultra-thin Santos version, leather strap. Small and Large. Steel ~€4,000–6,000, gold ~€8,000–15,000. Tribute to aviation pioneer Alberto Santos-Dumont. Contact us.`
      );} },

    { id:'cartier_tank_francaise', kw:['tank française','tank francaise','française','francaise','wsta0065','wsta0074','tank francaise 2023','tank francaise acier','tank francaise or','tank française medium','tank française small','chain bracelet tank','chaîne tank'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Tank Française : bracelet chaînon intégré, boîtier incurvé. Relancée 2023 avec nouveau design. Small et Medium. Acier ~3 500–5 000€, or ~10 000€+. Contactez-nous.`,
        `Tank Française: integrated chain bracelet, curved case. Relaunched 2023 with new design. Small and Medium. Steel ~€3,500–5,000, gold ~€10,000+. Contact us.`
      );} },

    { id:'cartier_tank_americaine', kw:['tank américaine','tank americaine','américaine','americaine','wsta0082','wsta0083','tank americaine 2023','elongated tank','tank allongé','tank américaine curved','cintrée','tank cintrée','tank americaine acier','tank americaine or'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Tank Américaine : version allongée et cintrée du Tank. Relancée 2023. Acier ~5 000–8 000€, or ~12 000€+. Silhouette élégante et distinctive. Contactez-nous.`,
        `Tank Américaine: elongated curved Tank version. Relaunched 2023. Steel ~€5,000–8,000, gold ~€12,000+. Elegant and distinctive silhouette. Contact us.`
      );} },




    // ── OMEGA ────────────────────────────────────────────────────────────────────
    { id:'omega_general', kw:['omega','constellation','de ville','omega montre','achat omega','vente omega','omega occasion','omega pre-owned','omega histoire','omega suisse','omega 1848','omega swatch group','omega james bond','omega nasa'],
      r:()=>t(
        `Omega fondée en 1848. Montre officielle NASA (Speedmaster Apollo 11 1969), montre de James Bond (Seamaster). Marché Speedmaster Pro ~5 000–8 000€, Seamaster 300M ~4 000–6 000€. Nous pouvons sourcer selon modèle.`,
        `Omega founded 1848. Official NASA watch (Speedmaster Apollo 11 1969), James Bond's watch (Seamaster). Speedmaster Pro market ~€5,000–8,000, Seamaster 300M ~€4,000–6,000. We can source by model.`
      ) },

    { id:'omega_speedmaster', kw:['speedmaster','moonwatch','311.30','310.30','speed master','speedy','chronographe omega','pulsomètre','cal 3861','moonwatch professional','omega chrono','moonshine','speedmaster dark side','speedmaster reduced'],
      r:()=>t(
        `Speedmaster Professional "Moonwatch" (réf. 310.30.42, cal. 3861) : ~5 500–7 500€ marché. Éditions limitées et vintage peuvent dépasser 20 000€. Dites-nous la référence souhaitée.`,
        `Speedmaster Professional "Moonwatch" (ref. 310.30.42, cal. 3861): ~€5,500–7,500 market. Limited editions and vintage can exceed €20,000. Tell us the reference you're after.`
      ) },

    { id:'omega_seamaster', kw:['seamaster','seamaster 300','seamaster 300m','aqua terra','ploprof','210.30','seamaster diver','james bond omega','seamaster 007','seamaster co-axial','master chronometer','aqua terra 38','aqua terra 41'],
      r:()=>t(
        `Seamaster 300M (réf. 210.30.42, co-axial) : ~4 000–6 000€ marché. Aqua Terra : ~3 500–5 500€. Éditions 007 et céramique noire sont plus recherchées. Contactez-nous pour disponibilité.`,
        `Seamaster 300M (ref. 210.30.42, co-axial): ~€4,000–6,000 market. Aqua Terra: ~€3,500–5,500. 007 editions and black ceramic command premiums. Contact us for availability.`
      ) },

    // ── IWC ─────────────────────────────────────────────────────────────────────
    { id:'iwc_general', kw:['iwc','portugaise','portofino','pilot watch','iw','ingenieur iwc','big pilot','iwc occasion','iwc pre-owned','achat iwc','vente iwc','iwc schaffhausen','iwc histoire','richemont iwc','da vinci iwc','aquatimer'],
      r:()=>t(
        `IWC Schaffhausen fondée en 1868. Spécialiste montres pilote et plongée de haute gamme. Marché Portugaise automatique ~7 000–12 000€, Big Pilot ~10 000–15 000€. Contactez-nous pour sourcing.`,
        `IWC Schaffhausen founded 1868. Specialist in high-end pilot and dive watches. Portugaise automatic market ~€7,000–12,000, Big Pilot ~€10,000–15,000. Contact us to source.`
      ) },

    // ── TUDOR ───────────────────────────────────────────────────────────────────
    { id:'tudor_general', kw:['tudor','black bay','tudor bb','tudor pelagos','tudor ranger','tudor fastrider','tudor chrono','tudor blue','tudor bordeaux','tudor 39mm','tudor 41mm','tudor bracelet','tudor heritage','tudor occasion','tudor pre-owned','achat tudor','tudor prix'],
      r:()=>t(
        `Tudor est la marque sœur de Rolex, fondée en 1926. Excellent rapport qualité-prix. Black Bay 41 (réf. 79230, ~3 000–4 500€), Pelagos (réf. 25600, ~3 500–5 000€). Contactez-nous pour sourcing.`,
        `Tudor is Rolex's sister brand, founded 1926. Excellent value for money. Black Bay 41 (ref. 79230, ~€3,000–4,500), Pelagos (ref. 25600, ~€3,500–5,000). Contact us to source.`
      ) },

    // ── JAEGER-LECOULTRE ────────────────────────────────────────────────────────
    { id:'jlc_general', kw:['jaeger','jlc','jaeger lecoultre','lecoultre','reverso','master control','polaris jlc','duomètre','atmos','rendez-vous','jlc occasion','achat jlc','jlc reverso','reverso prix'],
      r:()=>t(
        `Jaeger-LeCoultre fondée en 1833, Vallée de Joux. Reverso (réf. 3858522) ~10 000–20 000€, Master Control ~5 000–9 000€. Marque de haute horlogerie accessible. Contactez-nous pour sourcing.`,
        `Jaeger-LeCoultre founded 1833, Vallée de Joux. Reverso (ref. 3858522) ~€10,000–20,000, Master Control ~€5,000–9,000. Accessible haute horlogerie brand. Contact us to source.`
      ) },

    // ── VACHERON CONSTANTIN ─────────────────────────────────────────────────────
    { id:'vacheron_general', kw:['vacheron','vacheron constantin','patrimony','overseas vacheron','traditionnelle','historiques','vacheron occasion','achat vacheron','vacheron pre-owned','plus ancienne manufacture','1755 vacheron'],
      r:()=>t(
        `Vacheron Constantin fondée en 1755 — la plus ancienne manufacture horlogère en activité. Overseas (réf. 4500V) ~30 000–50 000€, Patrimony ~15 000–30 000€. Contactez-nous pour sourcing.`,
        `Vacheron Constantin founded 1755 — the oldest active watchmaker. Overseas (ref. 4500V) ~€30,000–50,000, Patrimony ~€15,000–30,000. Contact us to source.`
      ) },

    // ── HUBLOT ──────────────────────────────────────────────────────────────────
    { id:'hublot_general', kw:['hublot','big bang','classic fusion','spirit of big bang','mp 11','mp11','hublot occasion','achat hublot','hublot pre-owned','hublot céramique','hublot titane','hublot caoutchouc','hublot ferrari','hublot uefa'],
      r:()=>t(
        `Hublot fondée en 1980 à Genève. Big Bang Unico (réf. 441.CM, céramique) ~18 000–25 000€ marché, Classic Fusion acier ~6 000–10 000€. Contactez-nous pour sourcing.`,
        `Hublot founded 1980 in Geneva. Big Bang Unico (ref. 441.CM, ceramic) ~€18,000–25,000 market, Classic Fusion steel ~€6,000–10,000. Contact us to source.`
      ) },

    // ── PANERAI ─────────────────────────────────────────────────────────────────
    { id:'panerai_general', kw:['panerai','luminor','radiomir','submersible','pam','panerai occasion','achat panerai','luminor marina','luminor base','panerai 44mm','panerai 47mm','panerai titane','panerai acier','officine panerai'],
      r:()=>t(
        `Panerai fondée en 1860 à Florence, fournisseur historique de la marine italienne. Luminor Marina (PAM01312) ~6 000–9 000€, Submersible ~7 000–12 000€. Contactez-nous pour sourcing.`,
        `Panerai founded 1860 in Florence, historic supplier to the Italian Navy. Luminor Marina (PAM01312) ~€6,000–9,000, Submersible ~€7,000–12,000. Contact us to source.`
      ) },

    // ── BREGUET ─────────────────────────────────────────────────────────────────
    { id:'breguet_general', kw:['breguet','marine breguet','classique breguet','tradition breguet','breguet tourbillon','breguet occasion','achat breguet','abraham breguet','swatch breguet','breguet 5177','breguet 5247'],
      r:()=>t(
        `Breguet fondée en 1775 par Abraham-Louis Breguet — inventeur du tourbillon. Classique (réf. 5177) ~15 000–25 000€, Marine ~12 000–20 000€. Contactez-nous pour sourcing.`,
        `Breguet founded 1775 by Abraham-Louis Breguet — inventor of the tourbillon. Classique (ref. 5177) ~€15,000–25,000, Marine ~€12,000–20,000. Contact us to source.`
      ) },


    // ── SERVICES ────────────────────────────────────────────────────────────────
    { id:'revision_general', kw:['révision','revision','service','entretien','maintenance','remettre en état','overhaul','refaire','remise à neuf','nettoyage intérieur','mouvement révisé','mouvement nettoyé','service complet','full service','combien révision','prix révision','tarif révision','my watch needs service','ma montre a besoin de révision','watch stopped working','montre arrêtée','watch not working','montre ne fonctionne plus','watch running slow','montre prend du retard','watch running fast','montre prend de l avance','losing time','prend du retard','gaining time','prend de l avance','watch broken','montre cassée','something wrong with','quelque chose qui cloche','strange noise','bruit bizarre','watch making noise','montre fait du bruit','service needed','révision nécessaire','overhaul needed','révision complète'],
      r:()=>t(
        `Révision complète disponible pour Rolex et Audemars Piguet. Nettoyage, lubrification, remplacement joints, test étanchéité, polissage optionnel. Délai ~3–6 semaines. Demandez un devis.`,
        `Full service available for Rolex and Audemars Piguet. Cleaning, lubrication, gasket replacement, water resistance test, optional polish. Lead time ~3–6 weeks. Request a quote.`
      ) },

    { id:'revision_rolex', kw:['révision rolex','revision rolex','service rolex','entretien rolex','rolex service centre','rolex officiel','garantie après révision','warranty after service','combien révision rolex','tarif révision rolex','prix service rolex','rolex après vente','3235 service','3135 service'],
      r:()=>t(
        `Révision Rolex chez Nos Montres : démontage complet, nettoyage ultrason, lubrification, remplacement joints et verre si besoin, test 48h. Plus de détails sur [notre page révision](/revision-Rolex-Paris.html).`,
        `Rolex service at Nos Montres: full disassembly, ultrasonic cleaning, lubrication, gasket/crystal replacement if needed, 48h testing. More details on [our service page](/revision-Rolex-Paris.html).`
      ) },

    { id:'revision_ap', kw:['révision ap','révision audemars','revision audemars piguet','service ap','entretien audemars','ap service','ap révision prix','tarif révision ap','royal oak révision','offshore révision','ap après vente','ap service paris'],
      r:()=>t(
        `Révision Audemars Piguet chez Nos Montres : spécialistes AP, démontage complet, cal. 3120/3126/4302. Voir notre [page révision AP](/revision-Audemars-Piguet-Paris.html) pour tarifs et délais.`,
        `AP service at Nos Montres: AP specialists, full disassembly, cal. 3120/3126/4302. See our [AP service page](/revision-Audemars-Piguet-Paris.html) for pricing and lead times.`
      ) },

    { id:'battery', kw:['pile','batterie','battery','changement de pile','change battery','montre arrêtée','stopped watch','quartz','montre quartz','pile morte','dead battery','pile faible','pile vide','combien pile','prix pile','tarif pile','changer pile'],
      r:()=>t(
        `Changement de pile disponible en boutique sur rendez-vous. Rapide, test d'étanchéité inclus pour les modèles adaptés. Voir [notre page pile](/changement-de-pile-de-montre.html).`,
        `Battery replacement available in-store by appointment. Quick service, water resistance test included for compatible models. See [our battery page](/changement-de-pile-de-montre.html).`
      ) },

    { id:'repair', kw:['réparation','reparation','repair','cassé','broken','bracelet cassé','brisé','verre cassé','crystal crack','scratched crystal','verre rayé','couronne cassée','crown broken','attache cassée','lug broken','bracelet réparation','maillon perdu','link lost'],
      r:()=>t(
        `Nous réparons : verre saphir, bracelet (maillon, attache), couronne, remontoir. Envoyez-nous des photos pour un diagnostic rapide.`,
        `We repair: sapphire crystal, bracelet (link, clasp), crown, winding stem. Send us photos for a quick diagnosis.`
      ) },

    { id:'polishing', kw:['polissage','polish','polir','rayer','rayures','scratch','égratignure','égratignures','boîtier rayé','bracelet rayé','remise en état extérieure','polissage partiel','satinage','satin finish','brushed','brossé','miroir','high polish'],
      r:()=>t(
        `Polissage disponible (miroir et/ou satinage). Attention : sur certains modèles (AP RO), le polissage peut réduire la valeur collector. Nous conseillons avant d'intervenir.`,
        `Polishing available (mirror and/or satin). Note: on some models (AP RO), polishing can reduce collector value. We advise before proceeding.`
      ) },

    { id:'strap_bracelet', kw:['bracelet','strap','nato','cuir','leather','rubber','caoutchouc','oystersteel','oyster bracelet','jubilé','president bracelet','oyster flex','oysterflex','changer bracelet','new strap','replacement bracelet','alligator strap','crocodile strap'],
      r:()=>t(
        `Nous proposons bracelets cuir, NATO, caoutchouc et bracelet métal de remplacement pour Rolex, AP et Patek. Précisez modèle et taille d'entrecorne (lug width).`,
        `We offer leather, NATO, rubber and metal replacement straps for Rolex, AP and Patek. Specify model and lug width.`
      ) },

    // ── MARCHÉ & PRIX ────────────────────────────────────────────────────────────
    { id:'price_general', kw:['prix','price','prices','pricing','combien','how much','tarif','tarifs','coût','coûts','cost','costs','cote','valeur marchande','market value','cours actuel','current price','quelle est la valeur','what is the value','prix du marché','market price','cotation','estimation prix','cost of','price of','how much is','how much does','what does it cost','what is the price','what is the cost','quel est le prix','quel est le coût','c est combien','cela coûte','ça coûte','that costs','it costs','combien coûte','combien vaut','how much for','price range','fourchette de prix','around how much','environ combien','roughly how much','price list','liste de prix','tarification','quote','devis','estimate','estimation'],
      r:()=>{
        // UPGRADE: If we have a model in context, show its actual prices
        if (ctx.model) {
          const modelKey = ctx.model.toLowerCase();
          const inStock = STOCK.filter(w => w.model.toLowerCase().includes(modelKey));
          if (inStock.length) {
            return t(
              `Prix de nos **${ctx.model}** en stock :\n${inStock.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\n📞 ${BIZ.phone1} pour réserver.`,
              `Prices for our **${ctx.model}** in stock:\n${inStock.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\n📞 ${BIZ.phone1} to reserve.`
            );
          }
        }
        if (ctx.brand) {
          const brandStock = STOCK.filter(w => w.brand === ctx.brand);
          if (brandStock.length) {
            return t(
              `Nos **${ctx.brand}** en stock :\n${brandStock.slice(0,6).map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nDites-moi quel modèle vous intéresse.`,
              `Our **${ctx.brand}** in stock:\n${brandStock.slice(0,6).map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n\nTell me which model interests you.`
            );
          }
        }
        return t(
          `Dites-moi la référence exacte ou le modèle et je vous donne une estimation de marché actuelle. Nos prix sont consultables sur notre site.`,
          `Tell me the exact reference or model and I'll give you a current market estimate. Our prices are visible on the site.`
        );
      } },

    { id:'market_rolex', kw:['cote rolex','prix rolex marché','rolex secondhand market','marché rolex','rolex market','rolex valeur','rolex prix occasion','rolex investissement prix','rolex prix 2024','rolex prix 2025','rolex augmente','rolex appreciates','rolex se revend','resale rolex'],
      r:()=>t(
        `Repères marché Rolex occasion : Submariner 126610LV ~13 000–15 000€, Daytona 126500 ~26 000–30 000€, GMT Sprite 126710GRNR ~17 000–20 000€. Marché stable depuis 2023.`,
        `Rolex pre-owned market benchmarks: Submariner 126610LV ~€13,000–15,000, Daytona 126500 ~€26,000–30,000, GMT Sprite 126710GRNR ~€17,000–20,000. Stable market since 2023.`
      ) },

    { id:'market_ap', kw:['cote ap','prix ap marché','ap secondhand market','marché ap','royal oak prix occasion','ap valeur','ap prix 2024','ap 15500 prix','royal oak chronographe prix','ap offshore prix marché','ap appreciates','ap investissement'],
      r:()=>t(
        `Repères marché AP occasion : Royal Oak 15500ST ~35 000–45 000€, RO Chrono 26240 ~55 000–65 000€, Offshore 44mm acier ~18 000–25 000€. RO Jumbo 15202 : 60 000–100 000€+.`,
        `AP pre-owned market benchmarks: Royal Oak 15500ST ~€35,000–45,000, RO Chrono 26240 ~€55,000–65,000, Offshore 44mm steel ~€18,000–25,000. RO Jumbo 15202: €60,000–100,000+.`
      ) },

    { id:'market_patek', kw:['cote patek','prix patek marché','patek secondhand market','marché patek','nautilus prix occasion','patek valeur','5711 prix','nautilus 5711 prix','patek prix 2024','patek appreciates','patek investissement','aquanaut prix'],
      r:()=>t(
        `Repères marché Patek occasion : Nautilus 5711/1A (discontinué) ~80 000–120 000€, 5726A Annual Calendar ~55 000–75 000€. Patek reste la valeur refuge n°1 en horlogerie.`,
        `Patek pre-owned market benchmarks: Nautilus 5711/1A (discontinued) ~€80,000–120,000, 5726A Annual Calendar ~€55,000–75,000. Patek remains the #1 store of value in watchmaking.`
      ) },

    { id:'market_trends', kw:['tendances marché','market trends','marché horloger','watch market','secondhand luxury','bulle spéculative','correction marché','montre en baisse','watch prices drop','montre en hausse','watch prices up','marché 2024','marché 2025','investir maintenant','should i buy now','bon moment acheter','is now a good time to buy','est maintenant bon moment acheter','watch market 2025','marché montre 2025','watch bubble','bulle montre','prices recovering','prix en hausse','prices falling','prix en baisse','market recovering','marché se reprend','watch speculation','spéculation montre','secondary market','marché secondaire','grey market','marché gris','dealer market','marché revendeur'],
      r:()=>t(
        `Depuis fin 2022, le marché secondaire a corrigé (-20–30% sur Rolex acier). Stabilisation en 2024. C'est historiquement un bon moment d'entrée sur les modèles clés.`,
        `Since late 2022, the secondary market corrected (-20–30% on steel Rolex). Stabilised in 2024. Historically a good entry point on key models.`
      ) },


    // ── ÉDUCATION & CONSEILS ─────────────────────────────────────────────────────
    { id:'fake_detection', kw:['faux','fake','contrefait','contrefaçon','comment détecter','how to spot','fake rolex','fausse rolex','copy','copie','replica','réplique','authentifier soi même','self authenticate','différence vraie fausse','true vs fake','ticking','tic tac','rolex tic','rolex sweep','second main','how do i know if fake','comment savoir si faux','is it real','est elle vraie','how to tell if genuine','comment savoir si authentique','spot a fake','repérer un faux','fake watch signs','signes fausse montre','chinese fake','fausse chinoise','aliexpress watch','fake luxury watch','fausse montre luxe','counterfeit watch','montre contrefaite','identify fake','identifier faux','authentication guide','guide authentification','tell if genuine','savoir si vrai'],
      r:()=>t(
        `Signes d'un faux : trotteuse saccadée (vrai Rolex = glissement continu), poids léger, gravures floues, couronne et fond dévissables facilement, verre non-saphir. Mieux vaut faire expertiser.`,
        `Signs of a fake: jerky seconds hand (real Rolex = smooth sweep), light weight, blurry engravings, easily unscrewable crown and caseback, non-sapphire crystal. Better to have it authenticated.`
      ) },

    { id:'care_tips', kw:['entretien quotidien','comment entretenir','prendre soin','take care','nettoyer montre','clean watch','rincer','rince','eau savonneuse','soap water','chiffon microfibre','microfibre cloth','conseils entretien','watch care','maintenance tips','garder en bon état','keep in good condition','bracelet taches'],
      r:()=>t(
        `Nettoyage : eau tiède + brosse souple toutes les 2–4 semaines. Évitez parfums et produits chimiques. Remontez à main à la même heure chaque jour si pas porté. Révision tous les 5–10 ans.`,
        `Cleaning: warm water + soft brush every 2–4 weeks. Avoid perfumes and chemicals. If not worn, hand-wind at the same time each day. Full service every 5–10 years.`
      ) },

    { id:'water_resistance', kw:['étanchéité','étanche','waterproof','waterproof watch','résistance à l eau','splash proof','30m étanche','50m étanche','100m étanche','300m étanche','plonger avec montre','swimming watch','shower watch','douche avec montre','piscine montre','mer montre','surf montre'],
      r:()=>t(
        `30M = projections seulement. 100M = piscine OK. 300M = plongée loisir. La résistance diminue avec le temps — faites tester l'étanchéité après 1 an ou si la montre a subi un choc.`,
        `30M = splashes only. 100M = swimming OK. 300M = recreational diving. Water resistance decreases over time — test after 1 year or after any impact.`
      ) },

    { id:'movement_types', kw:['automatique','manual','mécanique','mechanical','quartz','movement','mouvement','remontage automatique','self winding','hand wind','remontage manuel','cal','calibre','caliber','automatic vs quartz','eta','elaboré','in-house','manufacture calibre'],
      r:()=>t(
        `Automatique = remontage par le mouvement du poignet (rotor). Manuel = remontage à la main. Quartz = pile électrique, très précis. Haute horlogerie préfère mécaniques (statut, savoir-faire).`,
        `Automatic = wound by wrist movement (rotor). Manual = hand-wound. Quartz = battery, very precise. Haute horlogerie favours mechanical (status, craftsmanship).`
      ) },

    { id:'complications', kw:['complication','chronograph','chronographe','tourbillon','minute repeater','répétition minutes','calendrier perpétuel','perpetual calendar','moonphase','phase de lune','GMT','double fuseau','flying tourbillon','skeleton','squelette','openworked','grande complication'],
      r:()=>t(
        `Complications principales : chronographe (chrono), GMT (2 fuseaux), calendrier annuel, calendrier perpétuel, moonphase, tourbillon, répétition minutes. Chaque complication ajoute de la valeur.`,
        `Main complications: chronograph, GMT (dual time), annual calendar, perpetual calendar, moonphase, tourbillon, minute repeater. Each complication adds value.`
      ) },

    { id:'vintage_watches', kw:['vintage','ancien','ancienne montre','montre ancienne','montre vintage','1960','1970','1980','1950','old rolex','old ap','vintage rolex','vintage watch','patina','patine','tropical','gilt dial','sigma dial','tropical dial','tritium','radium','vintage ap','achat vintage','valeur vintage'],
      r:()=>t(
        `Le vintage est très recherché : cadrans tropicaux, patine naturelle, porte-folios sont des marqueurs de valeur. Nous achetons et vendons du vintage — envoyez photos pour estimation.`,
        `Vintage is highly sought after: tropical dials, natural patina, provenance papers are value markers. We buy and sell vintage — send photos for an estimate.`
      ) },

    { id:'watch_winder', kw:['remontoir','watch winder','winder','boite remontoir','remonter automatique','automatic winder','conserver montre','stocker montre','remontage automatique boîte'],
      r:()=>t(
        `Un remontoir (winder) maintient une montre automatique remontée lorsqu'elle n'est pas portée. Recommandé pour montres avec calendrier perpétuel. Non obligatoire sinon.`,
        `A watch winder keeps an automatic wound when not worn. Recommended for perpetual calendar watches. Not necessary otherwise.`
      ) },

    { id:'box_papers', kw:['boite papiers','box and papers','full set','set complet','complet','montre complète','complete watch','avec facture','avec ticket','with receipt','with invoice','original box','boite originale','inner box','outer box','carte garantie','warranty card','value with papers'],
      r:()=>t(
        `Papiers (certificat, facture, carte de garantie) et boîte augmentent la valeur de 15–30% selon le modèle et l'ancienneté. Pour la revente, conservez toujours le set complet.`,
        `Papers (certificate, invoice, warranty card) and box increase value by 15–30% depending on model and age. For resale, always keep the complete set.`
      ) },

    { id:'size_guide', kw:['taille','size','mm','38mm','39mm','40mm','41mm','42mm','44mm','36mm','trop grand','too big','trop petit','too small','quelle taille','what size','mesure poignet','wrist size','wrist measurement','poignet fin','small wrist','large wrist','grand poignet'],
      r:()=>t(
        `36–38mm : poignet fin ou classique. 39–41mm : polyvalent. 42–44mm : sportif, grand poignet. Mesurez votre poignet et ajoutez 20–30mm pour le diamètre idéal du boîtier.`,
        `36–38mm: slim or classic wrist. 39–41mm: versatile. 42–44mm: sporty, large wrist. Measure your wrist and add 20–30mm for the ideal case diameter.`
      ) },

    { id:'first_luxury_watch', kw:['premier achat montre luxe','first luxury watch','première montre de luxe','débuter collection','start collecting','debut collection','conseil premier achat','meilleure première montre','best first watch','quelle montre commencer','watch to start with','entry level luxury','montre débutant','beginner watch'],
      r:()=>t(
        `Pour un premier achat luxe : Rolex Datejust 36 ou 41 (polyvalent, tient bien la cote), AP Royal Oak 15400 (entrée de gamme AP), Omega Speedmaster. Budget 6 000–15 000€ pour Rolex.`,
        `For a first luxury watch: Rolex Datejust 36 or 41 (versatile, holds value well), AP Royal Oak 15400 (AP entry point), Omega Speedmaster. Budget €6,000–15,000 for Rolex.`
      ) },

    { id:'collection_advice', kw:['collection','collectionner','start a collection','débuter collection','construire collection','build collection','quelle ordre acheter','which order buy','diversifier','diversify','combien montres','how many watches','rotation montres','watch rotation','collection idéale'],
      r:()=>t(
        `Une collection classique : 1 sportive (Submariner ou Royal Oak), 1 habillée (Datejust ou Calatrava), 1 complication (Daytona chrono). Diversifiez entre marques pour limiter le risque.`,
        `A classic collection: 1 sporty (Submariner or Royal Oak), 1 dress (Datejust or Calatrava), 1 complication (Daytona chrono). Diversify between brands to spread risk.`
      ) },

    { id:'insurance', kw:['assurance','insurance','assurer montre','insure watch','vol montre','stolen watch','perte montre','lost watch','sinistre','claim','expertise assurance','insurance valuation','certificat assurance','police assurance','combien assurer','how to insure'],
      r:()=>t(
        `Pour assurer, faites expertiser la montre et demandez un certificat de valeur. Ajoutez-la à votre assurance habitation (option objets de valeur) ou souscrivez une assurance spécifique (AXA, Hiscox).`,
        `To insure, get an appraisal and request a valuation certificate. Add it to your home insurance (valuables option) or take out a specialist policy (AXA, Hiscox).`
      ) },

    // ── AP MODÈLES SPÉCIFIQUES ────────────────────────────────────────────────────
    { id:'ap_15500', kw:['15500','royal oak 41','royal oak 41mm','15500st','15500 bleu','15500 gris','15500 noir','15500 blanc','royal oak 15500','royal oak actuel','current royal oak','new royal oak','ap 41mm','ap 41'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak'; return t(
        `Royal Oak 15500ST (41mm, cal. 4302) : ~35 000–45 000€ marché selon cadran. Bleu et gris les plus demandés. Nous pouvons sourcer — dites-nous votre couleur de cadran.`,
        `Royal Oak 15500ST (41mm, cal. 4302): ~€35,000–45,000 market depending on dial. Blue and grey most sought after. We can source — tell us your dial colour.`
      );} },

    { id:'ap_15202', kw:['15202','jumbo 39','royal oak 39mm','royal oak original','ultra-plat ap','ultrathin ap','5402','extra thin royal oak','39mm royal oak','ap le brassus','15202st','15202bc','royal oak 50 ans','ap 1972'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Jumbo'; return t(
        `Royal Oak Jumbo 15202ST (39mm, 8.1mm d'épaisseur) : pièce iconique de 1972. Marché actuel 65 000–100 000€+. Très rare. Contactez-nous pour sourcing.`,
        `Royal Oak Jumbo 15202ST (39mm, 8.1mm thick): the iconic 1972 piece. Current market €65,000–100,000+. Very rare. Contact us to source.`
      );} },

    { id:'ap_26240', kw:['26240','royal oak chrono 41','chronographe royal oak','royal oak chronographe bleu','26240st','royal oak flyback','ap chrono acier','ap flyback'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronographe'; const s=STOCK.filter(w=>w.ref==='26240ST'); return t(
        `${s.length ? `En stock : ${s.map(w=>`${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join(', ')}` : 'Royal Oak Chrono 26240ST : ~55 000–65 000€ marché'}\nChronographe flyback cal. 4401, 41mm, cadran grande tapisserie.`,
        `${s.length ? `In stock: ${s.map(w=>`${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join(', ')}` : 'Royal Oak Chrono 26240ST: ~€55,000–65,000 market'}\nFlyback chronograph cal. 4401, 41mm, grande tapisserie dial.`
      );} },

    // ── ROLEX MODÈLES SPÉCIFIQUES ────────────────────────────────────────────────
    { id:'rolex_126610lv', kw:['126610lv','hulk','kermit','hulk rolex','submariner hulk','sub hulk','vert submariner','green submariner','submariner vert','126610 lv','kermit rolex','new hulk','rolex submariner hulk','rolex submariner vert','rolex submariner green','rolex green','rolex hulk','rolex kermit','submariner date hulk','submariner date vert','submariner date green','starbucks','starbucks submariner','ref 126610lv','green dial submariner','cadran vert submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const w=STOCK.find(s=>s.ref==='126610LV'); return t(
        `**Rolex Submariner Date réf. 126610LV** — surnommée "Kermit" (ou "Starbucks")\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 41mm, acier Oystersteel (904L), fond vissé\n• **Lunette** : Cerachrom céramique verte, insert graduations moulées, tournante unidirectionnelle 60 min\n• **Cadran** : Noir laqué, index Chromalight (luminescence bleue longue durée)\n• **Calibre** : 3235 manufacture Rolex, 28 800 alt/h (4Hz), Chronomètre Superlatif (-2/+2 sec/jour)\n• **Réserve de marche** : 70 heures (environ 3 jours)\n• **Étanchéité** : 300 mètres / 1 000 pieds\n• **Bracelet** : Oyster 3 maillons + fermoir Oysterlock + extension Glidelock (±5mm)\n\n**Histoire** : La lunette verte sur fond noir est un look introduit en 2003 sur la réf. 16610LV ("Kermit" originale, marquant les 50 ans du Submariner). La 126610LV (2020) est la version 41mm avec le nouveau calibre 3235. À ne pas confondre avec la 116610LV "Hulk" (cadran ET lunette verts, 2010-2020).\n\n**Marché** : Très demandée, valeur stable/croissante. Un incontournable de toute collection Rolex.`,
        `**Rolex Submariner Date ref. 126610LV** — nicknamed "Kermit" (or "Starbucks")\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 41mm, Oystersteel (904L), screw-down caseback\n• **Bezel**: Green Cerachrom ceramic, moulded graduations, 60-min unidirectional rotating\n• **Dial**: Black lacquer, Chromalight indices (long-lasting blue luminescence)\n• **Calibre**: 3235 Rolex manufacture, 28,800 vph (4Hz), Superlative Chronometer (-2/+2 sec/day)\n• **Power reserve**: 70 hours (approx. 3 days)\n• **Water resistance**: 300 metres / 1,000 feet\n• **Bracelet**: Oyster 3-link + Oysterlock clasp + Glidelock extension (±5mm)\n\n**History**: The green bezel on black dial was introduced in 2003 on ref. 16610LV (original "Kermit", marking 50 years of the Submariner). The 126610LV (2020) is the 41mm version with the new 3235 calibre. Not to be confused with the 116610LV "Hulk" (green dial AND bezel, 2010-2020).\n\n**Market**: Highly sought-after, stable/rising value. A must-have in any Rolex collection.`
      );} },

    { id:'rolex_126500ln', kw:['126500ln','panda','daytona panda','panda daytona','panda acier','daytona acier blanc','126500 ln','daytona blanc noir','new daytona','daytona 2021','daytona cadran blanc','ceramic daytona','daytona céramique','rolex daytona panda','rolex panda','rolex daytona acier','rolex daytona steel','rolex daytona blanc','rolex daytona white','ref 126500ln','cosmograph daytona panda','panda rolex'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const w=STOCK.find(s=>s.ref==='126500LN'); return t(
        `**Rolex Cosmograph Daytona réf. 126500LN** — "Panda" (cadran blanc, sous-compteurs noirs)\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel 904L\n• **Lunette** : Cerachrom céramique noire avec échelle tachymétrique gravée et laquée platine\n• **Cadran** : Blanc laqué "Panda", 3 sous-compteurs noirs (secondes, 30 min, 12h)\n• **Calibre** : 4131 manufacture Rolex (introduit 2023), 28 800 alt/h, Chronomètre Superlatif\n• **Réserve de marche** : 72 heures\n• **Étanchéité** : 100 mètres\n• **Bracelet** : Oyster + fermoir Oysterlock + système Easylink (5mm de confort)\n\n**Histoire** : Le Cosmograph Daytona est né en 1963, nommé d'après le circuit de Daytona en Floride. Le surnom "Panda" vient du contraste cadran blanc/sous-compteurs noirs. La réf. 126500LN (2023) remplace la 116500LN avec le nouveau cal. 4131. C'est le chronographe le plus demandé au monde — liste d'attente de plusieurs années en boutique officielle.\n\n**Marché** : La Daytona Panda acier est le Rolex sport le plus convoité. Forte appréciation.`,
        `**Rolex Cosmograph Daytona ref. 126500LN** — "Panda" (white dial, black subdials)\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, Oystersteel 904L\n• **Bezel**: Black Cerachrom ceramic with engraved tachymeter scale, platinum-filled\n• **Dial**: White lacquer "Panda", 3 black subdials (seconds, 30 min, 12h)\n• **Calibre**: 4131 Rolex manufacture (introduced 2023), 28,800 vph, Superlative Chronometer\n• **Power reserve**: 72 hours\n• **Water resistance**: 100 metres\n• **Bracelet**: Oyster + Oysterlock clasp + Easylink comfort extension (5mm)\n\n**History**: The Cosmograph Daytona was born in 1963, named after the Daytona circuit in Florida. The "Panda" nickname comes from the white dial/black subdials contrast. Ref. 126500LN (2023) replaces the 116500LN with the new cal. 4131. It is the world's most sought-after chronograph — years-long waitlists at official boutiques.\n\n**Market**: The steel Panda Daytona is the most coveted Rolex sport watch. Strong appreciation.`
      );} },

    { id:'rolex_126505', kw:['126505','daytona or rose','daytona rose gold','daytona everose','ref 126505','rolex daytona or rose','rolex daytona rose gold','cosmograph or rose','daytona gold','daytona chocolat','chocolate daytona','daytona marron','brown daytona'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const w=STOCK.find(s=>s.ref==='126505'); return t(
        `**Rolex Cosmograph Daytona réf. 126505** — Or rose Everose 18 carats\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, or Everose 18ct (alliage exclusif Rolex résistant à la décoloration)\n• **Lunette** : Cerachrom céramique marron chocolat, échelle tachymétrique\n• **Cadran** : Chocolat/noir, sous-compteurs or rose\n• **Calibre** : 4131, Chronomètre Superlatif, 72h réserve\n• **Bracelet** : Oysterflex (caoutchouc haute performance avec âme titane-nickel)\n\n**Particularité** : L'or Everose est un alliage breveté par Rolex contenant du platine, garantissant que la couleur rose ne s'altère pas avec le temps. La lunette marron chocolat est exclusive aux versions or rose.\n\n**Marché** : ~45 000–55 000€ selon état et année.`,
        `**Rolex Cosmograph Daytona ref. 126505** — 18ct Everose gold\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, 18ct Everose gold (exclusive Rolex alloy resistant to fading)\n• **Bezel**: Chocolate brown Cerachrom ceramic, tachymeter scale\n• **Dial**: Chocolate/black, rose gold subdials\n• **Calibre**: 4131, Superlative Chronometer, 72h reserve\n• **Bracelet**: Oysterflex (high-performance rubber with titanium-nickel core)\n\n**Unique feature**: Everose gold is a Rolex-patented alloy containing platinum, ensuring the rose colour never fades. The chocolate brown bezel is exclusive to rose gold versions.\n\n**Market**: ~€45,000–55,000 depending on condition and year.`
      );} },

    { id:'rolex_126710grnr', kw:['126710grnr','sprite','gmt sprite','vert rouge','red green gmt','126710 grnr','sprite rolex','sprite gmt','gmt rouge vert','jubilé gmt sprite','rolex gmt sprite','rolex sprite','gmt master sprite','gmt master vert noir','green black gmt'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='126710GRNR'); return t(
        `**Rolex GMT-Master II réf. 126710GRNR** — "Sprite"\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel 904L\n• **Lunette** : Cerachrom céramique bicolore vert/noir (deux couleurs en un seul bloc de céramique — prouesse technique Rolex)\n• **Cadran** : Noir, index Chromalight\n• **Calibre** : 3285, 28 800 alt/h, 70h réserve, Chronomètre Superlatif\n• **Bracelet** : Jubilee 5 maillons + fermoir Oysterclasp\n• **Fonctions** : Heures, minutes, secondes, date, 2e fuseau horaire (aiguille 24h)\n\n**Particularité** : Combinaison vert/noir unique dans la gamme. La lunette bicolore céramique nécessite un procédé de fabrication breveté (coloration partielle d'un bloc monolithique).\n\n**Marché** : ~17 000–20 000€. Forte demande, faible disponibilité en boutique officielle.`,
        `**Rolex GMT-Master II ref. 126710GRNR** — "Sprite"\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, Oystersteel 904L\n• **Bezel**: Green/black Cerachrom ceramic (two colours in one ceramic block — Rolex technical feat)\n• **Dial**: Black, Chromalight indices\n• **Calibre**: 3285, 28,800 vph, 70h reserve, Superlative Chronometer\n• **Bracelet**: Jubilee 5-link + Oysterclasp\n• **Functions**: Hours, minutes, seconds, date, 2nd time zone (24h hand)\n\n**Unique feature**: Green/black is unique in the range. The two-tone ceramic bezel requires a patented process (partial colouring of a monolithic block).\n\n**Market**: ~€17,000–20,000. High demand, low availability at official boutiques.`
      );} },

    { id:'rolex_116710ln', kw:['116710ln','116710','gmt black','gmt noir','gmt master noir','all black gmt','rolex gmt black','rolex gmt noir','gmt master ii black ceramic','gmt master ii noir'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='116710LN'); return t(
        `**Rolex GMT-Master II réf. 116710LN** — Lunette céramique noire\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel\n• **Lunette** : Cerachrom céramique noire, échelle 24h\n• **Cadran** : Noir, index Chromalight\n• **Calibre** : 3186, 48h réserve\n• **Bracelet** : Oyster 3 maillons\n\n**Particularité** : Première GMT-Master II avec lunette céramique (2007). Version discrète et polyvalente — pas de bicolore sur la lunette, look tout noir élégant. Génération pré-2018 (remplacée par la 126710).\n\n**Marché** : ~11 000–13 000€. Bonne valeur pour une GMT céramique.`,
        `**Rolex GMT-Master II ref. 116710LN** — Black ceramic bezel\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, Oystersteel\n• **Bezel**: Black Cerachrom ceramic, 24h scale\n• **Dial**: Black, Chromalight indices\n• **Calibre**: 3186, 48h reserve\n• **Bracelet**: Oyster 3-link\n\n**Unique feature**: First GMT-Master II with ceramic bezel (2007). Discreet and versatile — no two-tone bezel, elegant all-black look. Pre-2018 generation (replaced by 126710).\n\n**Market**: ~€11,000–13,000. Good value for a ceramic GMT.`
      );} },

    { id:'rolex_16710', kw:['16710','gmt vintage','old gmt','gmt master vintage','coke','coke gmt','pepsi vintage','rolex gmt vintage','gmt aluminium','gmt alu'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='16710'); return t(
        `**Rolex GMT-Master II réf. 16710** — Vintage (1989–2007)\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, acier 904L\n• **Lunette** : Aluminium (pas céramique) — disponible en Pepsi (bleu/rouge), Coke (noir/rouge) ou noir\n• **Cadran** : Noir, index lumineux (tritium ou Luminova selon année)\n• **Calibre** : 3185/3186 (selon année), 48h réserve\n• **Bracelet** : Oyster ou Jubilee\n\n**Particularité** : Dernière GMT avec lunette aluminium. Les inserts aluminium se patinent avec le temps, ajoutant du charme vintage. Les versions "Pepsi" et "Coke" sont très recherchées des collectionneurs.\n\n**Marché** : ~8 500–12 000€ selon insert et état. Excellente pièce collector.`,
        `**Rolex GMT-Master II ref. 16710** — Vintage (1989–2007)\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, 904L steel\n• **Bezel**: Aluminium (not ceramic) — available in Pepsi (blue/red), Coke (black/red) or black\n• **Dial**: Black, luminous indices (tritium or Luminova depending on year)\n• **Calibre**: 3185/3186 (depending on year), 48h reserve\n• **Bracelet**: Oyster or Jubilee\n\n**Unique feature**: Last GMT with aluminium bezel. Aluminium inserts develop patina over time, adding vintage charm. "Pepsi" and "Coke" versions are highly sought by collectors.\n\n**Market**: ~€8,500–12,000 depending on insert and condition. Excellent collector piece.`
      );} },

    { id:'rolex_326935', kw:['326935','yacht master 42','ym 42','everose yacht','oysterflex yacht','yacht master everose','ym everose','326935 prix','rolex yacht master 42','rolex yacht master or rose','rolex ym'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master'; const w=STOCK.find(s=>s.ref==='326935'); return t(
        `**Rolex Yacht-Master 42 réf. 326935** — Or Everose 18ct\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : 42mm, or Everose 18ct (alliage breveté Rolex anti-décoloration)\n• **Lunette** : Bidirectionnelle, or Everose mat sablé avec finition noire Cerachrom\n• **Cadran** : Noir intense, aiguilles et index or rose\n• **Calibre** : 3235, 70h réserve, Chronomètre Superlatif\n• **Bracelet** : Oysterflex (caoutchouc haute performance avec âme métal + amortisseurs longitudinaux)\n• **Étanchéité** : 100 mètres\n\n**Particularité** : Le Yacht-Master 42 est le plus grand et le plus exclusif de la gamme YM. Le bracelet Oysterflex, introduit en 2015, combine le confort du caoutchouc avec la robustesse d'une âme en alliage de titane et nickel.\n\n**Marché** : ~32 000–38 000€. Le Rolex sport le plus "bling" — or massif + bracelet sport.`,
        `**Rolex Yacht-Master 42 ref. 326935** — 18ct Everose gold\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: 42mm, 18ct Everose gold (Rolex patented anti-fading alloy)\n• **Bezel**: Bidirectional, sandblasted matte Everose gold with black Cerachrom finish\n• **Dial**: Deep black, rose gold hands and indices\n• **Calibre**: 3235, 70h reserve, Superlative Chronometer\n• **Bracelet**: Oysterflex (high-performance rubber with metal core + longitudinal cushions)\n• **Water resistance**: 100 metres\n\n**Unique feature**: The Yacht-Master 42 is the largest and most exclusive in the YM range. The Oysterflex bracelet, introduced 2015, combines rubber comfort with a titanium-nickel alloy core.\n\n**Market**: ~€32,000–38,000. The flashiest Rolex sport — solid gold + sport strap.`
      );} },

    { id:'patek_5980', kw:['5980','5980-1a','nautilus chronographe','nautilus chrono','5980 acier','nautilus flyback','patek chrono','ref 5980'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='5980-1A'); return t(
        `Nautilus Chrono réf. **5980-1A** : ${w?fmt(w.price):'~80 000–95 000€ marché'}. Chronographe flyback, cadran bleu dégradé, bracelet intégré. Cal. CH 28-520 C.`,
        `Nautilus Chrono ref. **5980-1A**: ${w?fmt(w.price):'~€80,000–95,000 market'}. Flyback chronograph, gradient blue dial, integrated bracelet. Cal. CH 28-520 C.`
      );} },

    { id:'patek_5990', kw:['5990','5990/1r','nautilus travel time','5990 or rose','nautilus dual time','5990 rose gold','patek dual time'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='5990/1R'); return t(
        `Nautilus Travel Time réf. **5990/1R** : ${w?fmt(w.price):'~230 000–250 000€ marché'}. Or Rose 18ct, double fuseau horaire, calendrier annuel, chronographe. Cal. CH 28-520 IRM QA 24H.`,
        `Nautilus Travel Time ref. **5990/1R**: ${w?fmt(w.price):'~€230,000–250,000 market'}. 18ct Rose Gold, dual time zone, annual calendar, chronograph. Cal. CH 28-520 IRM QA 24H.`
      );} },

    // ── USE CASES ────────────────────────────────────────────────────────────────
    { id:'daily_watch', kw:['daily wear','pour tous les jours','everyday watch','montre quotidienne','montre de tous les jours','casual watch','montre casual','can i wear it every day','puis je la porter tous les jours','rugged','solide','resistant','résistante','durable','durability','scratch resistant','résistante aux rayures','tough','robuste','hard wearing','daily driver','wearing every day','porter au bureau','wear to office','wear to work','wear to gym','salle de sport','sport quotidien','commute watch','travel watch','vacation watch','holiday watch','beach watch','vacation','plage','voyage','travel'],
      r:()=>t(
        `Pour le quotidien : Rolex Submariner (acier 904L, 300m), Datejust 41, AP Royal Oak 15500. Costaud, polyvalents, résistants. Évitez les complications fragiles (tourbillon) pour un usage daily.`,
        `For daily wear: Rolex Submariner (904L steel, 300m), Datejust 41, AP Royal Oak 15500. Tough, versatile, resistant. Avoid fragile complications (tourbillon) for daily use.`
      ) },

    { id:'dress_watch', kw:['dress watch','montre habillée','formal watch','montre de soirée','evening watch','montre élégante','elegant watch','montre chic','chic','smart watch','business watch','montre bureau','montre costume','suit watch','tie watch','black tie','gala','soirée','event','cérémonie','formal occasion','occasion formelle','fine watch','slim watch','thin watch','montre fine','montre mince','classic watch','montre classique','sophisticated','sophistiqué'],
      r:()=>t(
        `Pour une tenue habillée : Patek Calatrava, Datejust 36 (Wimbledon), AP Royal Oak ultra-plat, Cartier Tank ou Ballon Bleu. Discrets, élégants, intemporels.`,
        `For formal dress: Patek Calatrava, Datejust 36 (Wimbledon), AP Royal Oak ultra-thin, Cartier Tank or Ballon Bleu. Discreet, elegant, timeless.`
      ) },

    { id:'sport_watch', kw:['sport watch','montre sport','sportive','sports watch','active watch','action watch','outdoor watch','adventure watch','hiking watch','running watch','swimming watch','diving watch','montre plongée','montre sport','montre natation','montre course','montre randonnée','athletic','athlétique','physical activity','activité physique','workout','fitness','gym','exercise','water sport','sport nautique'],
      r:()=>t(
        `Montres sport en stock : Submariner (300m, plongée), GMT-Master (voyage), Explorer II (aventure), Yacht-Master (nautisme), Royal Oak Offshore (sport extrême). Dites-moi votre discipline.`,
        `Sport watches in stock: Submariner (300m, diving), GMT-Master (travel), Explorer II (adventure), Yacht-Master (nautical), Royal Oak Offshore (extreme sport). Tell me your activity.`
      ) },

    { id:'watch_for_man', kw:['montre homme','watch for men','mens watch','montre pour homme','watch for man','montre masculine','masculine watch','men rolex','rolex for men','rolex homme','ap homme','ap for men','patek homme','patek for men','homme','man','men','male','masculin','montre virile','bold watch','strong watch'],
      r:()=>t(
        `Nos choix masculins les plus populaires : Submariner 41mm, Daytona 40mm, GMT-Master II, Royal Oak 41mm, Nautilus 40mm. Quel style — sport, classique ou habillé ?`,
        `Our most popular men's choices: Submariner 41mm, Daytona 40mm, GMT-Master II, Royal Oak 41mm, Nautilus 40mm. What style — sport, classic or dress?`
      ) },

    { id:'watch_casual', kw:['casual watch','montre décontractée','relaxed watch','weekend watch','montre weekend','off duty watch','not too flashy','pas trop voyant','subtle','subtile','discreet','discrete','not too bling','understated','pas ostentatoire','low key','clean watch','simple watch','montre simple','no complications','sans complications','clean design','everyday luxury','luxe discret'],
      r:()=>t(
        `Montres discrètes et polyvalentes : Datejust 36mm, Oyster Perpetual, AP Royal Oak (la lunette octogonale est reconnaissable mais sobre). Le luxe sans ostentation.`,
        `Discreet and versatile watches: Datejust 36mm, Oyster Perpetual, AP Royal Oak (the octagonal bezel is recognisable but understated). Luxury without ostentation.`
      ) },

    { id:'biggest_watch', kw:['grosse montre','big watch','large watch','statement watch','oversized','imposant','large case','grand boîtier','44mm','42mm','big face','grand cadran','bold design','attention','remarquer','noticed','stand out','se démarquer','luxury flex','montre qui se remarque','impressive watch','impressive piece'],
      r:()=>t(
        `Pour l'impact visuel : Royal Oak Offshore 44mm (réf. 26325TS, ${fmt(STOCK.find(w=>w.ref==='26325TS')?.price||34000)}), Yacht-Master 42mm (réf. 326935, ${fmt(STOCK.find(w=>w.ref==='326935')?.price||35000)}), RM 65-01 (réf. RM65-01, ${fmt(STOCK.find(w=>w.brand==='Richard Mille')?.price||235000)}). Présence garantie.`,
        `For visual impact: Royal Oak Offshore 44mm (ref. 26325TS, ${fmt(STOCK.find(w=>w.ref==='26325TS')?.price||34000)}), Yacht-Master 42mm (ref. 326935, ${fmt(STOCK.find(w=>w.ref==='326935')?.price||35000)}), RM 65-01 (ref. RM65-01, ${fmt(STOCK.find(w=>w.brand==='Richard Mille')?.price||235000)}). Guaranteed presence.`
      ) },

    { id:'rarest_watch', kw:['rare watch','montre rare','limited edition','édition limitée','hard to find','introuvable','rare piece','pièce rare','exclusive','exclusif','one of a kind','unique','collector piece','pièce collector','discontinued','discontinué','no longer made','plus fabriqué','limited production','production limitée','out of production','rare find','difficult to find'],
      r:()=>t(
        `Nos pièces les plus rares en stock : Patek Nautilus Travel Time 5990/1R (or rose, ${fmt(239000)}), RM 65-01 rattrapante (${fmt(235000)}), Royal Oak Chrono 26240ST (${fmt(58500)}). Contactez-nous pour le sourcing de pièces introuvables.`,
        `Our rarest pieces in stock: Patek Nautilus Travel Time 5990/1R (rose gold, ${fmt(239000)}), RM 65-01 split-second (${fmt(235000)}), Royal Oak Chrono 26240ST (${fmt(58500)}). Contact us to source unobtainable pieces.`
      ) },

    { id:'entry_luxury', kw:['entry level luxury','première montre de luxe','first luxury','entrée gamme luxe','debut luxury','start luxury','starting luxury','affordable luxury','luxe abordable','cheapest luxury','least expensive','moins cher luxe','most affordable','pas trop cher','not too expensive','value luxury','bon rapport qualité prix','good value luxury','starter watch','montre pour commencer','beginner luxury'],
      r:()=>{ const opts=STOCK.filter(w=>w.price<9000).slice(0,3); return t(
        `Nos meilleures entrées en matière de luxe :\n${opts.map(w=>`• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nExcellent point d'entrée avec une forte valeur de revente.`,
        `Our best luxury entry points:\n${opts.map(w=>`• ${w.brand} ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nExcellent entry point with strong resale value.`
      );} },

    // ── COMPARAISONS ─────────────────────────────────────────────────────────────
    { id:'compare_sub_vs_gmt', kw:['submariner vs gmt','sub ou gmt','difference submariner gmt','sub gmt choisir','gmt ou sub','submariner gmt comparaison','submariner ou gmt master','submariner or gmt','gmt or submariner','which is better sub or gmt','should i get sub or gmt','sub vs gmt master','gmt master vs submariner','rolex sub vs gmt','lequel choisir sub gmt','sub ou gmt master'],
      r:()=>t(
        `Submariner : montre de plongée iconique, lunette unidirectionnelle, 300m. GMT : 2 fuseaux horaires, lunette bidirectionnelle, non-plongée. Budget identique (~12–18k€). Si vous voyagez souvent → GMT. Sinon → Submariner.`,
        `Submariner: iconic dive watch, uni-directional bezel, 300m. GMT: 2 time zones, bi-directional bezel, non-dive. Similar budget (~€12–18k). If you travel often → GMT. Otherwise → Submariner.`
      ) },

    { id:'compare_rolex_vs_ap', kw:['rolex vs ap','rolex ou ap','rolex vs audemars','choisir rolex ap','rolex audemars comparaison','royal oak vs rolex','sub vs royal oak','datejust vs royal oak'],
      r:()=>t(
        `Rolex : liquidité max, revente facile partout, icônes sport intemporelles. AP : plus exclusif, designs plus audacieux, prix entry-level plus élevé. Pour la liquidité → Rolex. Pour le statut discret → AP.`,
        `Rolex: maximum liquidity, easy resale everywhere, timeless sport icons. AP: more exclusive, bolder designs, higher entry-level prices. For liquidity → Rolex. For quiet status → AP.`
      ) },

    { id:'compare_rolex_vs_patek', kw:['rolex vs patek','rolex ou patek','choisir rolex patek','patek vs rolex','nautilus vs submariner','datejust vs calatrava'],
      r:()=>t(
        `Rolex : sport/polyvalent, ~6k–35k€, très liquide. Patek : haute horlogerie, ~15k–250k€, prestige horloger suprême. Patek se revend moins facilement mais prend plus de valeur long terme (Nautilus, 5711).`,
        `Rolex: sport/versatile, ~€6k–35k, highly liquid. Patek: haute horlogerie, ~€15k–250k, supreme watchmaking prestige. Patek is harder to resell quickly but appreciates more long-term (Nautilus, 5711).`
      ) },

    { id:'compare_new_vs_vintage', kw:['neuf ou vintage','new vs vintage','occasion récente','recent vs vintage','acheter neuf occasion','modern vs vintage','vintage vs modern','rolex neuf occasion','ap neuf occasion'],
      r:()=>t(
        `Vintage : patine unique, valeur collector, prix parfois inférieurs. Moderne : garantie, étanchéité fiable, service plus simple. Pour l'investissement → vintage clés (1960–1980 Rolex). Pour l'usage quotidien → moderne.`,
        `Vintage: unique patina, collector value, sometimes lower prices. Modern: warranty, reliable water resistance, easier to service. For investment → key vintage (1960–1980 Rolex). For daily use → modern.`
      ) },

    // ── ROLEX SITE PAGES ─────────────────────────────────────────────────────────
    { id:'page_rolex', kw:['page rolex','voir rolex','montres rolex','collection rolex','rolex disponibles','rolex en ligne','rolex sur le site','toutes les rolex'],
      r:()=>t(
        `Retrouvez toutes nos Rolex sur [notre page Rolex](/rolex.html). Nous mettons à jour le stock régulièrement.`,
        `Browse all our Rolex on [our Rolex page](/rolex.html). We update stock regularly.`
      ) },

    { id:'page_ap', kw:['page ap','voir ap','montres ap','collection ap','ap disponibles','audemars piguet disponibles','ap en ligne','toutes les ap','page audemars'],
      r:()=>t(
        `Retrouvez tous nos modèles AP sur [notre page Audemars Piguet](/audemars-piguet.html).`,
        `Browse all our AP models on [our Audemars Piguet page](/audemars-piguet.html).`
      ) },

    { id:'page_patek', kw:['page patek','voir patek','collection patek','patek disponibles','patek en ligne','toutes les patek'],
      r:()=>t(
        `Retrouvez tous nos modèles Patek sur [notre page Patek Philippe](/patek-philippe.html).`,
        `Browse all our Patek models on [our Patek Philippe page](/patek-philippe.html).`
      ) },

    { id:'page_richard_mille', kw:['page richard mille','voir richard mille','collection richard mille','rm disponibles','rm en ligne','toutes les rm'],
      r:()=>t(
        `Retrouvez nos Richard Mille sur [notre page Richard Mille](/richard-mille.html).`,
        `Browse our Richard Mille on [our Richard Mille page](/richard-mille.html).`
      ) },

    // ── MORE CONVERSATIONAL & KNOWLEDGE ──────────────────────────────────────────
    { id:'what_is_rolex', kw:['what is rolex','qu est ce que rolex','cest quoi rolex','rolex explanation','tell me about rolex','rolex brand information','information sur rolex','rolex background','about rolex brand','rolex famous','why is rolex famous','pourquoi rolex est célèbre','rolex reputation','rolex known for','rolex symbolic','rolex symbolique','rolex iconic','rolex prestige'],
      r:()=>t(
        `Rolex est la marque horlogère la plus connue au monde. Fondée en 1905 à Londres. Symbole de réussite, qualité Swiss Made irréprochable, valeur de revente exceptionnelle. Chaque Rolex est assemblée à Genève.`,
        `Rolex is the world's most recognised watch brand. Founded in 1905 in London. Symbol of success, flawless Swiss Made quality, exceptional resale value. Every Rolex is assembled in Geneva.`
      ) },

    { id:'what_is_ap', kw:['what is audemars piguet','qu est ce que audemars','cest quoi ap','ap explanation','tell me about ap','about audemars piguet brand','ap famous','why is ap famous','pourquoi ap est célèbre','ap reputation','ap known for','ap iconic','ap prestige','ap symbolic','about royal oak','what is royal oak','royal oak explanation','royal oak famous'],
      r:()=>t(
        `Audemars Piguet est une manufacture indépendante fondée en 1875. Créatrice du Royal Oak (1972), première montre sport en acier de luxe. L'une des "Sainte-Trinité" de l'horlogerie avec Patek et Rolex.`,
        `Audemars Piguet is an independent manufacture founded in 1875. Creator of the Royal Oak (1972), the first luxury steel sports watch. One of watchmaking's "Holy Trinity" with Patek and Rolex.`
      ) },

    { id:'what_is_patek', kw:['what is patek philippe','qu est ce que patek','cest quoi patek','patek explanation','tell me about patek','about patek philippe brand','patek famous','why is patek famous','pourquoi patek est célèbre','patek reputation','patek known for','patek iconic','patek prestige','holy trinity','sainte trinité horlogerie','most prestigious watch','most prestigious brand'],
      r:()=>t(
        `Patek Philippe est considérée comme la manufacture la plus prestigieuse au monde. Fondée en 1839 à Genève. Slogan : "Vous ne possédez jamais une Patek Philippe, vous la gardez pour la prochaine génération."`,
        `Patek Philippe is considered the most prestigious manufacture in the world. Founded 1839 in Geneva. Slogan: "You never actually own a Patek Philippe, you merely look after it for the next generation."`
      ) },

    { id:'what_is_rm', kw:['what is richard mille','qu est ce que richard mille','cest quoi richard mille','rm explanation','tell me about richard mille','about rm brand','rm famous','why is rm famous','pourquoi rm est célèbre','rm reputation','rm known for','rm iconic','rm prestige','rm symbolic','richard mille brand story','rm founding','rm story'],
      r:()=>t(
        `Richard Mille fondée en 2001 à Paris. Montres ultra-techniques inspirées de la F1, matériaux aérospatiaux (titane, carbone NTPT, céramique). Prix de 100 000€ à plusieurs millions. Portées par des athlètes comme Nadal et Federer.`,
        `Richard Mille founded 2001 in Paris. Ultra-technical watches inspired by F1, aerospace materials (titanium, NTPT carbon, ceramic). Prices €100,000 to several million. Worn by athletes like Nadal and Federer.`
      ) },

    { id:'what_is_pre_owned', kw:['pre owned','pre-owned','second hand','secondhand','used watch','montre usagée','occasion','d occasion','pre owned luxury','luxe occasion','is used bad','is pre owned good','is second hand ok','montre occasion bien','vaut il mieux neuf','new vs used','neuf ou occasion','difference neuf occasion','why buy pre owned','pourquoi acheter occasion'],
      r:()=>t(
        `Une montre d'occasion certifiée offre : **prix -20 à -40%** vs neuf, **disponibilité immédiate** (pas de liste d'attente), et **valeur déjà stabilisée**. Pour les Rolex populaires, l'occasion côte souvent AU-DESSUS du prix catalogue.`,
        `A certified pre-owned watch offers: **20–40% lower price** vs new, **immediate availability** (no waiting list), and **already-stabilised value**. For popular Rolex, pre-owned often trades ABOVE catalogue price.`
      ) },

    { id:'holy_trinity', kw:['holy trinity watches','sainte trinité montre','top 3 watches','top 3 brands','best three brands','best three watch brands','trois meilleures marques','rolex patek ap','ap rolex patek','patek rolex ap','which is best brand','best watch brand','top watch brand','greatest watch brand','most prestigious','most prestigious brands','number one watch','numéro un montre'],
      r:()=>t(
        `La "Sainte-Trinité" de l'horlogerie : **Patek Philippe** (prestige suprême), **Audemars Piguet** (innovation sport), **Rolex** (liquidité & iconicité). Si vous rajoutez une 4e : Richard Mille pour la technologie extrême.`,
        `Watchmaking's "Holy Trinity": **Patek Philippe** (supreme prestige), **Audemars Piguet** (sport innovation), **Rolex** (liquidity & iconicity). Add a 4th: Richard Mille for extreme technology.`
      ) },

    { id:'watch_knowledge', kw:['learn about watches','apprendre les montres','watch education','éducation horlogère','watch terminology','terminologie montre','watch glossary','glossaire montre','watch basics','bases horlogerie','horology','horlogerie','clockmaking','how watches work','comment fonctionne une montre','watch mechanism','mécanisme montre','know about watches','connaitre les montres','watch novice','débutant en montres','new to watches','new to horology'],
      r:()=>t(
        `Je peux vous expliquer : complications (chronographe, GMT, tourbillon), types de mouvements (automatique, manuel, quartz), matériaux (904L, titane, céramique), ou l'histoire des grandes maisons. Quelle question ?`,
        `I can explain: complications (chronograph, GMT, tourbillon), movement types (automatic, manual, quartz), materials (904L, titanium, ceramic), or the history of the major houses. What's your question?`
      ) },

    { id:'resale_value', kw:['resale value','valeur de revente','can i resell','puis je revendre','is it easy to resell','facile à revendre','resell quickly','revendre rapidement','liquidity','liquidité','easy to sell','se revend facilement','market for','marché pour','demand for','demande pour','will anyone buy','quelquun achètera','flip watch','flip a watch','profit on watch','profit montre','make money watches','gagner de largent montres'],
      r:()=>t(
        `Liquidité par marque : **Rolex** = meilleure (revend partout, rapidement). **AP** = excellente (Royal Oak très demandé). **Patek** = excellente (Nautilus, Annual Cal.). **RM** = très bonne mais marché plus petit. Contactez-nous pour une estimation.`,
        `Resale liquidity by brand: **Rolex** = best (sells everywhere, quickly). **AP** = excellent (Royal Oak very sought after). **Patek** = excellent (Nautilus, Annual Cal.). **RM** = very good but smaller market. Contact us for an estimate.`
      ) },

    { id:'watch_condition', kw:['condition of watch','état de la montre','excellent condition','mint condition','good condition','fair condition','poor condition','scratched','polished','unpolished','worn','unworn','lightly worn','heavily worn','like new','comme neuf','perfect condition','parfait état','condition matters','est ce que l état importe','does condition affect price','l état affecte le prix','condition grade','grading'],
      r:()=>t(
        `L'état impacte le prix de **15 à 35%**. Excellente condition (traces légères) > Très bon état (marques boîtier) > Bon état (usage visible). Les cadrans originaux non touchés ont plus de valeur que les cadrans refaits.`,
        `Condition impacts price by **15 to 35%**. Excellent (light traces) > Very Good (case marks) > Good (visible use). Original untouched dials are worth more than refinished ones.`
      ) },

    { id:'payment_plan', kw:['payment plan','plan de paiement','payer en plusieurs fois','pay in instalments','split payment','paiement échelonné','financement','financing','crédit','credit','loan','prêt','monthly payment','mensualités','can i pay monthly','puis je payer mensuellement','layaway','acompte mensuel'],
      r:()=>t(
        `Nous ne proposons pas de financement direct, mais vous pouvez utiliser votre propre crédit bancaire ou faire un acompte pour réserver la pièce. Contactez-nous pour discuter des options.`,
        `We don't offer direct financing, but you can use your own bank credit or pay a deposit to hold the piece. Contact us to discuss options.`
      ) },

    { id:'visit_store', kw:['can i visit','puis je visiter','visit your store','visiter votre boutique','come to your shop','venir en boutique','visit in person','visite en personne','stop by','passer','i want to come','je veux venir','see in person','voir en personne','physical store','boutique physique','shop location','emplacement boutique','can i see the watch','voir la montre','try on','essayer'],
      r:()=>t(
        `Oui, venez nous voir sur rendez-vous. 46 rue de Miromesnil, 75008 Paris — métro Miromesnil (L9/13). Prenez RDV au ${BIZ.phone1} ou via notre [formulaire](/prendre-rendez-vous.html).`,
        `Yes, come see us by appointment. 46 rue de Miromesnil, 75008 Paris — metro Miromesnil (L9/13). Book via ${BIZ.phone1} or our [form](/prendre-rendez-vous.html).`
      ) },

    { id:'watch_photos', kw:['photos','photo','picture','pictures','image','images','see photos','voir photos','can i see','puis je voir','show me photos','montrez moi des photos','pictures of','photos of','more photos','plus de photos','high resolution','haute résolution','photo gallery','galerie photo','what does it look like','à quoi ça ressemble'],
      r:()=>t(
        `Les photos de chaque pièce sont disponibles sur notre [site](/index.html). Pour des photos supplémentaires ou en haute résolution, contactez-nous directement.`,
        `Photos of every piece are available on our [site](/index.html). For additional or high-resolution photos, contact us directly.`
      ) },

    { id:'watch_certif', kw:['certificate','certificat','certification','certified','certifié','proof of authenticity','preuve authenticité','documentation','document','paperwork','papers included','papiers inclus','what comes with','qu est ce qui est inclus','what is included','box included','boîte incluse','warranty included','garantie incluse','accessories','accessoires','extras','suppléments'],
      r:()=>t(
        `Chaque pièce vendue inclut un certificat d'authenticité Nos Montres. Box et papiers d'origine sont mentionnés dans l'annonce — leur présence est indiquée produit par produit.`,
        `Every piece sold includes a Nos Montres certificate of authenticity. Original box and papers are noted in the listing — their presence is indicated product by product.`
      ) },

    // ── QUESTIONS FRÉQUENTES CLIENTS ─────────────────────────────────────────────
    { id:'more_info', kw:['tell me more','dites moi plus','more information','plus d information','more details','plus de détails','elaborate','développez','can you expand','pouvez vous développer','more about that','plus sur ça','go on','continuez','and then','et ensuite','explain more','expliquez plus','what else','quoi d autre','anything else','autre chose','keep going','continuez','additional info','info supplémentaire'],
      r:()=>t(
        `Bien sûr — quel aspect vous intéresse le plus ? Prix, disponibilité, caractéristiques techniques, ou conseils d'achat ?`,
        `Of course — which aspect interests you most? Price, availability, technical specs, or buying advice?`
      ) },

    { id:'not_interested', kw:['not interested','pas intéressé','no thanks','non merci','nevermind','laissez tomber','forget it','oubliez','maybe later','peut être plus tard','ill think about it','je vais réfléchir','just looking','je regarde','just browsing','juste en train de regarder','no need','pas besoin','its fine','c est bon','all good','tout va bien'],
      r:()=>t(
        `Pas de problème — n'hésitez pas à revenir si vous avez des questions. Bonne journée !`,
        `No problem — feel free to come back if you have any questions. Have a great day!`
      ) },

    { id:'confirm', kw:['ok','okay','d accord','agreed','got it','compris','understood','noted','noté','sure','bien sûr','of course','absolument','absolutely','right','exact','exactement','correct','affirmative','yes please','oui s il vous plaît','sounds good','ça me convient','perfect','parfait','great','super','alright','très bien','fine','bien'],
      r:()=>t(
        `Parfait. Y a-t-il autre chose que je puisse faire pour vous ?`,
        `Perfect. Is there anything else I can help you with?`
      ) },

    { id:'goodbye', kw:['bye','goodbye','au revoir','à bientôt','a bientot','see you','ciao','adieu','take care','bonne continuation','bonne journée','good day','have a good','passez une bonne','later','à plus','a plus','a tout à l heure','see you later','au plaisir','goodbye for now','bonne soirée','good evening','good night','bonne nuit','bye bye','cya'],
      r:()=>t(
        `À bientôt ! N'hésitez pas à revenir — nous sommes disponibles 7j/7 sur rendez-vous.`,
        `Goodbye! Don't hesitate to come back — we're available 7 days a week by appointment.`
      ) },

    { id:'warranty_sold', kw:['garantie','warranty','garanti','garanti combien de temps','how long warranty','garantie après achat','montre garantie','garantie boutique','pièce garantie','nm garantie'],
      r:()=>t(
        `Toutes nos montres sont vendues avec un certificat d'authenticité et une garantie boutique. Les détails de garantie sont précisés au moment de l'achat.`,
        `All our watches are sold with a certificate of authenticity and a boutique warranty. Warranty details are specified at the time of purchase.`
      ) },

    { id:'negotiation', kw:['négocier','négociation','négociable','price negotiable','remise','discount','réduction','faire une offre','make an offer','meilleur prix','best price','on peut négocier','prix ferme','can i negotiate','puis je négocier','room for negotiation','marge de négociation','lower the price','baisser le prix','can you do better','vous pouvez faire mieux','is the price fixed','le prix est il fixe','final price','prix final','can i get a deal','puis je avoir une remise','any discount','une réduction possible','promo','promotion','special price','prix spécial','bundle deal','deal groupé'],
      r:()=>t(
        `Nos prix sont étudiés au marché. Pour toute demande, contactez-nous directement — nous trouverons la meilleure solution selon le modèle et votre situation.`,
        `Our prices reflect the market. For any request, contact us directly — we'll find the best solution depending on the model and your situation.`
      ) },

    { id:'deposit', kw:['réservation','réserver','hold','acompte','deposit','mettre de côté','set aside','je veux réserver','i want to reserve','retenir','combien pour réserver','how much to reserve'],
      r:()=>t(
        `Nous pouvons mettre une montre de côté sur acompte. Contactez-nous par téléphone ou email pour convenir des modalités.`,
        `We can hold a watch with a deposit. Contact us by phone or email to agree on terms.`
      ) },

    { id:'shipping_insurance', kw:['assurance livraison','insured shipping','shipping insurance','valeur assurée','assurance transport','remboursé si perdu','lost in transit','vol livraison','stolen delivery','fedex','ups','chronopost assurance','sending expensive watch'],
      r:()=>t(
        `Toutes nos livraisons sont assurées à la valeur déclarée de la montre, envoi sécurisé avec signature obligatoire.`,
        `All our shipments are insured for the declared value of the watch, secure delivery with mandatory signature.`
      ) },

    { id:'exchange', kw:['échange','exchange','swap','reprendre mon ancienne','trade in','part exchange','reprise en échange','troquer','échanger ma montre','montre en échange'],
      r:()=>t(
        `Oui, nous faisons des reprises en échange (part-exchange). Envoyez-nous des photos de votre montre actuelle pour une estimation, puis nous déduisons de votre achat.`,
        `Yes, we do part-exchanges. Send us photos of your current watch for an estimate, which we then deduct from your purchase.`
      ) },

    { id:'ap_royal_oak_vs_offshore', kw:['royal oak vs offshore','offshore vs royal oak','difference royal oak offshore','ap offshore ou royal oak','choisir royal oak offshore','roya oak offshore comparaison'],
      r:()=>t(
        `Royal Oak : 41mm, sport-chic discret, classique. Offshore : 44mm, plus sportif et imposant, cadran plus chargé. Pour bureau/soirée → RO. Pour sport et statement → Offshore.`,
        `Royal Oak: 41mm, discreet sport-chic, classic. Offshore: 44mm, more sporty and imposing, busier dial. For office/evening → RO. For sport and statement → Offshore.`
      ) },

    { id:'dial_colour', kw:['couleur cadran','dial colour','dial color','cadran bleu','blue dial','cadran noir','black dial','cadran vert','green dial','cadran blanc','white dial','cadran gris','grey dial','quelle couleur','which colour','cadran argent','silver dial'],
      r:()=>t(
        `Cadrans les plus demandés : bleu (intemporel, lumineux), noir (élégant, polyvalent), vert (tendance, Hulk/Sprite). Précisez le modèle et je vous indique nos disponibilités.`,
        `Most requested dials: blue (timeless, vibrant), black (elegant, versatile), green (trending, Hulk/Sprite). Tell me the model and I'll check our availability.`
      ) },

    { id:'bracelet_vs_rubber', kw:['bracelet métal ou caoutchouc','métal vs caoutchouc','oyster vs jubilé','jubilee vs oyster','bracelet choix','which bracelet','quel bracelet','jubilée ou oyster','oysterflex ou métal','rubber vs metal'],
      r:()=>t(
        `Oyster : plus sportif, robuste. Jubilé : plus habillé, confortable. Oysterflex (Rolex) : confort rubber + look métal. Pour usage quotidien/sport → Oyster. Pour élégance → Jubilé.`,
        `Oyster: more sporty, robust. Jubilee: dressier, comfortable. Oysterflex (Rolex): rubber comfort + metal look. For daily/sport use → Oyster. For elegance → Jubilee.`
      ) },

    { id:'ap_dial_tapisserie', kw:['tapisserie','grande tapisserie','petite tapisserie','ap tapisserie','motif ap','ap pattern','quadrillage ap','ap texture cadran','tapestry dial'],
      r:()=>t(
        `La Grande Tapisserie (Royal Oak Offshore, 44mm) a un motif plus large que la Petite Tapisserie (Royal Oak 41mm). Ce motif est l'une des signatures visuelles d'AP depuis 1972.`,
        `The Grande Tapisserie (Royal Oak Offshore, 44mm) has a larger pattern than the Petite Tapisserie (Royal Oak 41mm). This pattern is one of AP's visual signatures since 1972.`
      ) },

    { id:'rolex_movement_gen', kw:['gen 1','gen 2','génération rolex','generation rolex','calibre 3135','calibre 3235','cal 3135','cal 3235','mouvement rolex','rolex calibre','rolex génération','old vs new movement','ancien calibre','nouveau calibre'],
      r:()=>t(
        `Cal. 3235 (Gen 2, depuis 2020) : chronométrie +2s/j, réserve 70h, anti-choc Rolex. Cal. 3135 (Gen 1, 1988–2020) : réserve 48h, -2/+2s/j. Les deux sont fiables — Gen 2 apporte réserve et précision améliorées.`,
        `Cal. 3235 (Gen 2, from 2020): +2s/d chronometry, 70h reserve, Rolex anti-shock. Cal. 3135 (Gen 1, 1988–2020): 48h reserve, -2/+2s/d. Both reliable — Gen 2 brings improved reserve and precision.`
      ) },

    { id:'patek_5726', kw:['5726','5726a','5726-001','annual calendar patek','calendrier annuel patek','5726 prix','ref 5726'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='5726-001'); return t(
        `Patek Annual Calendar réf. **5726-001** : ${w?fmt(w.price):'~55 000–75 000€ marché'}. Calendrier annuel (nécessite ajustement 1×/an, fin février), phase de lune, 38.5mm.`,
        `Patek Annual Calendar ref. **5726-001**: ${w?fmt(w.price):'~€55,000–75,000 market'}. Annual calendar (one annual correction needed, end of February), moonphase, 38.5mm.`
      );} },

    // ── QUESTIONS TECHNIQUES AVANCÉES ────────────────────────────────────────────
    { id:'cosc_certification', kw:['cosc','chronométrie','chronomètre','chronometer','certifié cosc','precision','précision rolex','précision ap','rolex precis','précision montre','déviation','deviation','gain perte','gaining losing','seconds per day','secondes par jour'],
      r:()=>t(
        `COSC = certification suisse de chronomètre : ±4s/jour max. Rolex dépasse COSC : cal. 3235 ≤ ±2s/j. AP cal. 4302 : ±2s/j. Patek : ±1s/j sur certains calibres. Plus précis qu'un quartz de masse.`,
        `COSC = Swiss chronometer certification: ±4s/day max. Rolex exceeds COSC: cal. 3235 ≤ ±2s/d. AP cal. 4302: ±2s/d. Patek: ±1s/d on some calibres. More precise than mass-market quartz.`
      ) },

    { id:'power_reserve', kw:['réserve de marche','power reserve','combien de temps sans porter','how long without wearing','remontage','winding','remonter','wound up','marche sans porter','autonomie montre','autonomy','70h','48h','reserve marche rolex'],
      r:()=>t(
        `Réserves de marche : Rolex cal. 3235 → 70h (3 jours). AP cal. 4302 → 70h. Patek cal. 324 SC → 45h. Si vous ne portez pas la montre plus de 2–3 jours, il faudra la relancer manuellement.`,
        `Power reserves: Rolex cal. 3235 → 70h (3 days). AP cal. 4302 → 70h. Patek cal. 324 SC → 45h. If you don't wear the watch for 2–3+ days, you'll need to hand-wind to restart it.`
      ) },

    { id:'serial_number', kw:['numéro de série','serial number','numéro série','numéro modèle','model number','trouver numéro série','where is serial number','où est le numéro','numéro boîtier','case number','entre les cornes','between lugs','numéro rehaut','rehaut','inner bezel'],
      r:()=>t(
        `Rolex : numéro de série entre les cornes à 6h (avant 2007) ou sur le rehaut (couronne intérieure) depuis 2007. Le numéro de modèle est entre les cornes à 12h.`,
        `Rolex: serial number between lugs at 6 o'clock (before 2007) or on the rehaut (inner bezel) since 2007. The model number is between the lugs at 12 o'clock.`
      ) },

    { id:'rolex_history_dates', kw:['rolex année fabrication','date fabrication','when was made','quelle année fabriqué','date production rolex','rolex vintage année','production year','year made','année production rolex'],
      r:()=>t(
        `Pour dater une Rolex, consultez les tableaux de numéros de série en ligne (numéros entre les cornes ou rehaut). Nous pouvons aussi dater votre pièce lors d'une expertise — envoyez photos.`,
        `To date a Rolex, consult serial number tables online (numbers between lugs or rehaut). We can also date your piece during an appraisal — send us photos.`
      ) },

    { id:'rolex_oyster_vs_jubilee_history', kw:['oyster vs jubilé histoire','jubilée rolex histoire','quand jubilé créé','oyster bracelet history','jubilee bracelet history','jubilé 1945','rolex bracelet history'],
      r:()=>t(
        `Bracelet Oyster (1931) : mailles larges, robuste, sportif. Bracelet Jubilé (1945, lancé avec le Datejust) : 5 mailles, plus élégant et confortable. Les deux sont fabriqués en Oystersteel 904L.`,
        `Oyster bracelet (1931): wide links, robust, sporty. Jubilee (1945, launched with the Datejust): 5-link, more elegant and comfortable. Both crafted in 904L Oystersteel.`
      ) },

    { id:'ap_serial', kw:['numéro série ap','ap serial number','authenticité ap','numéro boîtier ap','ap case number','ap numéro','donde esta numero ap','trouver numéro ap'],
      r:()=>t(
        `Sur une AP Royal Oak, le numéro de série est gravé sur le flanc du boîtier (côté 9h). Le numéro de pièce (réf.) figure sur le fond du boîtier. Envoyez-nous une photo pour confirmation.`,
        `On an AP Royal Oak, the serial number is engraved on the case side (9 o'clock). The piece number (ref.) is on the caseback. Send us a photo for confirmation.`
      ) },

    { id:'watch_gender', kw:['montre homme','montre femme','pour homme','for man','pour femme','for woman','mixte','unisex','peut on porter','can i wear','femme rolex homme','homme ap femme','porter montre homme femme','gender neutral watch'],
      r:()=>t(
        `La plupart des montres se portent de façon mixte. Rolex Datejust 36 et 41 sont populaires chez les deux genres. Royal Oak 37mm convient parfaitement aux femmes. Parlez-moi de votre poignet et style.`,
        `Most watches are worn by both genders. Rolex Datejust 36 and 41 are popular with both. Royal Oak 37mm suits women well. Tell me about your wrist size and style.`
      ) },

    { id:'buy_tips', kw:['conseils achat','buying tips','tips pour acheter','que vérifier à l achat','what to check when buying','pièges à éviter','avoid scams','red flags','acheter en sécurité','safe purchase','que regarder','what to look for','vérification achat'],
      r:()=>t(
        `À vérifier : trotteuse (lisse, pas saccadée), couronne (étanche, dévissable proprement), poids (plein, pas léger), gravures nettes, fond sécurisé. Exigez photos fond + couronne + rehaut.`,
        `Check: seconds hand (smooth sweep), crown (water-tight, screws down cleanly), weight (solid, not light), sharp engravings, secure caseback. Always request photos of caseback, crown, and rehaut.`
      ) },

    { id:'rolex_waiting_list', kw:['liste d attente rolex','waiting list rolex','rolex introuvable','rolex en boutique','rolex official dealer','dealer rolex','concessionnaire rolex','official rolex','rolex neuf prix officiel','rolex boutique officielle','prix catalogue rolex','catalogue rolex prix'],
      r:()=>t(
        `Chez les revendeurs officiels Rolex, les modèles populaires (Daytona, GMT, Submariner) ont des listes d'attente de 2–5 ans. Sur le marché secondaire, disponibles immédiatement — avec prime.`,
        `At authorised Rolex dealers, popular models (Daytona, GMT, Submariner) have 2–5 year waiting lists. On the secondary market, available immediately — at a premium.`
      ) },

    { id:'patek_vs_ap', kw:['patek vs ap','ap vs patek','patek ou ap','choisir patek ap','patek philippe vs audemars piguet','nautilus vs royal oak','royal oak vs nautilus'],
      r:()=>t(
        `AP Royal Oak : design iconique plus sportif, bracelet intégré. Patek Nautilus : légèrement plus discret, perçu comme le nec plus ultra du sport-chic. Les deux sont des investissements solides.`,
        `AP Royal Oak: more sporty iconic design, integrated bracelet. Patek Nautilus: slightly more understated, seen as the ultimate in sport-chic. Both are solid investments.`
      ) },

    { id:'crypto_payment', kw:['crypto','bitcoin','btc','ethereum','eth','payer en crypto','pay in crypto','cryptocurrency','monnaie numérique','digital currency','usdt','stablecoin'],
      r:()=>t(
        `Nous n'acceptons pas les cryptomonnaies pour le moment. Paiements acceptés : virement bancaire, espèces (limite légale) et carte bancaire.`,
        `We don't accept cryptocurrency at this time. Accepted payments: bank transfer, cash (legal limit) and bank card.`
      ) },

    { id:'rolex_ap_entretien_compare', kw:['combien souvent révision','how often service','révision tous les combien','service interval','5 ans 10 ans','service every','maintenance frequency','quand réviser','when to service'],
      r:()=>t(
        `Rolex recommande une révision tous les 10 ans (cal. 3235). AP recommande tous les 5–8 ans. En pratique : révisez si la montre perd/gagne plus de ±5s/jour ou en cas de choc.`,
        `Rolex recommends servicing every 10 years (cal. 3235). AP recommends every 5–8 years. In practice: service if the watch gains/loses more than ±5s/day, or after an impact.`
      ) },

    { id:'rm65_detail', kw:['rm65','rm 65','rm65-01','rm65 01','richard mille 65','rm 65-01 prix','rm 65 detail'],
      r:()=>{ const w=STOCK.find(s=>s.brand==='Richard Mille'); return t(
        `RM 65-01 réf. **RM65-01** : ${w?fmt(w.price):'~230 000–240 000€ marché'}. Chronographe split-second flyback, boîtier titane grade 5, verre saphir multi-couche, mouvement squelette manuel.`,
        `RM 65-01 ref. **RM65-01**: ${w?fmt(w.price):'~€230,000–240,000 market'}. Split-second flyback chronograph, grade 5 titanium case, multi-layer sapphire crystal, manual skeleton movement.`
      );} },

    // ── INTERNATIONAL CLIENTS ────────────────────────────────────────────────────
    { id:'international_shipping', kw:['ship worldwide','worldwide shipping','expédition monde','international delivery','ship to usa','ship to uk','ship to switzerland','ship to dubai','livrer hors france','livrer belgique','livrer suisse','livrer luxembourg','export','customs','douane'],
      r:()=>t(
        `Nous expédions dans le monde entier. Envoi assuré à la valeur de la pièce, signature obligatoire. Pour les envois hors UE, des frais de douane peuvent s'appliquer à destination.`,
        `We ship worldwide. Shipments insured at piece value, mandatory signature. For non-EU destinations, customs fees may apply at the receiving end.`
      ) },

    { id:'tax_refund', kw:['détaxe','tax refund','tax free','vat refund','tva remboursement','remboursement tva','tourists tax','tourist refund','pablo tax free','global blue','hors ue','non ue resident'],
      r:()=>t(
        `Les clients non-résidents UE peuvent bénéficier de la détaxe (TVA 20%). Nous pouvons établir le formulaire de détaxe. Présentez votre passeport lors de l'achat.`,
        `Non-EU residents can benefit from tax-free shopping (20% VAT). We can issue the tax refund form. Bring your passport at the time of purchase.`
      ) },

    // ── CARE & STORAGE ────────────────────────────────────────────────────────────
    { id:'magnet_shock', kw:['magnétique','magnetized','magnétisée','aimant','magnet','montre magnétisée','watch magnetized','slow after magnet','retard après aimant','téléphone aimant','iphone aimant','speaker magnet','fermeture sac aimant'],
      r:()=>t(
        `Si votre montre est magnétisée (elle prend du retard/avance soudainement), une démagnétisation chez un horloger (opération rapide, ~15 min) suffit. Évitez enceintes et fermetures magnétiques.`,
        `If your watch is magnetised (sudden gain/loss), demagnetisation at a watchmaker (quick, ~15 min) is sufficient. Avoid speakers and magnetic bag clasps.`
      ) },

    { id:'condensation', kw:['condensation','buée','fog','vapeur','eau dans le cadran','water in dial','moisture inside','eau à l intérieur','eau sous le verre','water under crystal','condensation montre'],
      r:()=>t(
        `Condensation à l'intérieur = joint d'étanchéité défaillant. N'immergez plus la montre et apportez-la en révision rapidement — l'eau peut oxyder le mouvement en 24–48h.`,
        `Condensation inside = failed water-resistance gasket. Stop submerging the watch and bring it for service quickly — water can oxidise the movement within 24–48h.`
      ) },

    { id:'polishing_value', kw:['polissage valeur','polish affect value','valeur après polissage','polished watch value','polish reduce value','rolex poli valeur','ap poli valeur','non poli préférable','unpolished preferred','original finish'],
      r:()=>t(
        `Une montre dans son état d'origine (non polie) se revend mieux chez les collectionneurs. Les finitions brossées/satinées d'une Royal Oak non polie peuvent valoir 10–20% de plus.`,
        `A watch in its original unpolished state sells better to collectors. The brushed/satin finish on an unpolished Royal Oak can be worth 10–20% more.`
      ) },

    // ── VENTE SPÉCIFIQUE ──────────────────────────────────────────────────────────
    // ── WATCH KNOWLEDGE: MECHANICS & MATERIALS ────────────────────────────────────
    { id:'sapphire_crystal', kw:['saphir','sapphire','crystal','cristal','verre','glass','verre de montre','watch glass','anti reflective','anti-reflet','ar coating','scratch proof glass','verre inrayable','verre résistant','hardness','dureté','mohs','scratch crystal','rayer le verre'],
      r:()=>t(
        `Le verre saphir (dureté Mohs 9) est quasi-inrayable. Toutes nos montres de marque utilisent du saphir. Seul le diamant peut le rayer. Un revêtement anti-reflets améliore la lisibilité.`,
        `Sapphire crystal (Mohs hardness 9) is virtually scratch-proof. All brand watches we carry use sapphire. Only diamond can scratch it. Anti-reflective coating improves legibility.`
      ) },

    { id:'luminova', kw:['luminescence','lumineux','lume','luminova','superluminova','glow dark','brille dans le noir','noctilumineux','luminescent','aiguilles lumineuses','index lumineux','legibility night','lisibilité nuit','dark legibility','lisible dans le noir','visibility night','visibilité nuit'],
      r:()=>t(
        `Les montres Rolex utilisent le Chromalight (bleu, durée 8h), AP et Patek utilisent Super-LumiNova (vert, durée 6h). Indispensable pour plongeurs et pilotes. Très utile au quotidien pour lire l'heure la nuit.`,
        `Rolex watches use Chromalight (blue, 8h duration), AP and Patek use Super-LumiNova (green, 6h). Essential for divers and pilots. Very useful daily for reading time at night.`
      ) },

    { id:'bezel_types', kw:['lunette','bezel','lunette tournante','rotating bezel','lunette fixe','fixed bezel','lunette céramique','ceramic bezel','lunette saphir','sapphire bezel','lunette or','gold bezel','fluted bezel','cannelée','tachymètre','tachymeter','diver bezel','lunette plongée','bidirectionnel','unidirectionnel','bidirectional bezel','unidirectional bezel'],
      r:()=>t(
        `Types de lunettes : **Céramique tournante** (Submariner, GMT — inrayable, unidirectionnelle), **Tachymètre** (Daytona — mesure vitesse), **Cannelée** (Datejust — or blanc/or jaune, décorative), **Grande Tapisserie** (AP RO Offshore).`,
        `Bezel types: **Rotating ceramic** (Submariner, GMT — scratch-proof, unidirectional), **Tachymeter** (Daytona — speed measurement), **Fluted** (Datejust — white/yellow gold, decorative), **Grande Tapisserie** (AP RO Offshore).`
      ) },

    // ── COMMON WATCH SHOPPING FAQ (from research) ────────────────────────────────

    { id:'trade_in', kw:['trade in','trade-in','reprendre','reprise','part exchange','échange','échanger ma montre','exchange my watch','trade my watch','reprendre ma montre','reprise montre','swap','troquer','trade up','upgrade my watch','upgrader ma montre','put toward','mettre en acompte'],
      r:()=>t(
        `Oui, nous acceptons les reprises ! Apportez votre montre pour une évaluation gratuite. La valeur estimée peut être déduite de votre prochain achat. Contactez-nous pour plus de détails.`,
        `Yes, we accept trade-ins! Bring your watch for a free evaluation. The estimated value can be deducted from your next purchase. Contact us for details.`
      ) },

    { id:'return_policy', kw:['return policy','politique retour','retour','refund','remboursement','rembourser','can I return','puis-je retourner','satisfaction garantie','satisfaction guarantee','échange possible','exchange possible','return watch','retourner montre','cooling off','délai rétractation','14 jours','14 days','changement avis','change mind','buyer remorse'],
      r:()=>t(
        `Nous offrons un délai de rétractation selon la loi française. Chaque montre est inspectée avant vente pour garantir votre satisfaction. Contactez-nous pour les conditions exactes de retour.`,
        `We offer a cooling-off period under French law. Every watch is inspected before sale to guarantee your satisfaction. Contact us for exact return conditions.`
      ) },

    { id:'case_materials', kw:['case material','matériau boîtier','matière boîtier','titanium','titane','ceramic case','boîtier céramique','carbon fiber','fibre carbone','gold case','boîtier or','steel vs gold','acier vs or','titanium vs steel','titane vs acier','platinum case','boîtier platine','rose gold vs yellow','or rose vs or jaune','white gold','or blanc','which material','quel matériau','materiau montre','watch material','bronze watch','montre bronze','tungsten','carbide'],
      r:()=>t(
        `Matériaux courants : **Acier 316L/904L** (résistant, abordable), **Titane** (léger, hypoallergénique), **Or** (jaune/rose/blanc, luxe classique), **Platine** (le plus rare/lourd), **Céramique** (inrayable, légère), **Carbone** (ultra-léger, RM). Le choix affecte poids, prix et durabilité.`,
        `Common materials: **Steel 316L/904L** (durable, affordable), **Titanium** (light, hypoallergenic), **Gold** (yellow/rose/white, classic luxury), **Platinum** (rarest/heaviest), **Ceramic** (scratch-proof, light), **Carbon** (ultra-light, RM). Choice affects weight, price and durability.`
      ) },

    { id:'crystal_types', kw:['crystal type','type de verre','mineral crystal','verre minéral','acrylic crystal','verre acrylique','hesalite','plexiglas','plexi','sapphire vs mineral','saphir vs minéral','crystal comparison','comparaison verre','which crystal','quel verre','crystal scratch','rayer verre','crystal replacement','remplacement verre','polywatch'],
      r:()=>t(
        `3 types de verres : **Saphir** (montres de luxe — quasi inrayable, 9/10 Mohs), **Minéral** (montres moyennes — résistant mais rayable), **Acrylique/Hesalite** (vintage — polissable mais fragile). Toutes nos montres de luxe sont en saphir.`,
        `3 crystal types: **Sapphire** (luxury watches — nearly scratch-proof, 9/10 Mohs), **Mineral** (mid-range — resistant but scratchable), **Acrylic/Hesalite** (vintage — polishable but fragile). All our luxury watches use sapphire.`
      ) },

    { id:'in_house_movement', kw:['in-house','in house','manufacture movement','mouvement manufacture','calibre maison','own movement','propre mouvement','eta movement','mouvement eta','sellita','generic movement','mouvement générique','in-house vs eta','manufacture vs eta','who makes movement','qui fabrique le mouvement','developed in-house','développé en interne','valjoux','miyota'],
      r:()=>t(
        `Un mouvement manufacture (in-house) est conçu et fabriqué par la marque elle-même. Rolex, AP, Patek, RM utilisent exclusivement des mouvements maison. Un mouvement ETA/Sellita est un calibre générique suisse utilisé par de nombreuses marques. In-house = prestige et valeur supérieurs.`,
        `A manufacture (in-house) movement is designed and built by the brand itself. Rolex, AP, Patek, RM use exclusively in-house movements. An ETA/Sellita movement is a generic Swiss calibre used by many brands. In-house = higher prestige and value.`
      ) },

    { id:'swiss_made', kw:['swiss made','swiss','suisse','made in switzerland','fabriqué en suisse','label swiss made','swiss made meaning','que signifie swiss made','what does swiss made mean','swiss quality','qualité suisse','100% swiss','swiss movement','mouvement suisse','swiss law','loi swiss made','swissness'],
      r:()=>t(
        `"Swiss Made" signifie : mouvement suisse, assemblage en Suisse, et 60%+ de la valeur produite en Suisse. Toutes les marques que nous vendons (Rolex, AP, Patek, RM, Cartier) sont Swiss Made avec mouvements manufacture.`,
        `"Swiss Made" means: Swiss movement, assembled in Switzerland, and 60%+ of value produced in Switzerland. All brands we sell (Rolex, AP, Patek, RM, Cartier) are Swiss Made with manufacture movements.`
      ) },

    { id:'chronometer_certification', kw:['chronometer','chronomètre','cosc','contrôle officiel suisse','chronometer vs chronograph','chronomètre vs chronographe','difference chronometer chronograph','différence chronomètre chronographe','certified chronometer','chronomètre certifié','cosc certified','certifié cosc','superlative chronometer','chronomètre superlatif'],
      r:()=>t(
        `**Chronomètre** = montre certifiée COSC pour sa précision (-4/+6 sec/jour). **Chronographe** = fonction chrono/stopwatch. Ce sont deux choses différentes ! Toutes les Rolex sont des chronomètres superlatifs (-2/+2 sec/jour). AP et Patek ont leurs propres standards encore plus stricts.`,
        `**Chronometer** = COSC-certified watch for accuracy (-4/+6 sec/day). **Chronograph** = stopwatch function. They are two different things! All Rolex are Superlative Chronometers (-2/+2 sec/day). AP and Patek have their own even stricter standards.`
      ) },

    { id:'watch_frequency', kw:['frequency','fréquence','beats per hour','battements par heure','bph','hertz','hz','28800','21600','36000','high frequency','haute fréquence','low frequency','basse fréquence','vibrations','oscillation','4 hz','3 hz','5 hz','tick rate'],
      r:()=>t(
        `La fréquence mesure la vitesse d'oscillation du balancier. **21 600 bph (3Hz)** = montres classiques, **28 800 bph (4Hz)** = standard moderne (Rolex, AP), **36 000 bph (5Hz)** = haute fréquence (Zenith). Plus haute fréquence = meilleure précision théorique mais révision plus fréquente.`,
        `Frequency measures balance wheel oscillation speed. **21,600 bph (3Hz)** = classic watches, **28,800 bph (4Hz)** = modern standard (Rolex, AP), **36,000 bph (5Hz)** = high frequency (Zenith). Higher frequency = better theoretical accuracy but more frequent servicing.`
      ) },

    { id:'limited_edition', kw:['limited edition','édition limitée','limited','limité','special edition','édition spéciale','numéroté','numbered','how many made','combien fabriqué','rare edition','édition rare','commemorative','commémorative','anniversary edition','édition anniversaire','exclusive','exclusif','collector edition','édition collector','one of','pièce unique','unique piece'],
      r:()=>t(
        `Les éditions limitées sont produites en nombre restreint, augmentant leur valeur collector. Rolex produit rarement des "limited editions" officielles. AP, Patek, RM et Cartier font régulièrement des séries numérotées. Contactez-nous pour la disponibilité de pièces rares.`,
        `Limited editions are produced in restricted numbers, increasing collector value. Rolex rarely makes official "limited editions." AP, Patek, RM and Cartier regularly release numbered series. Contact us for rare piece availability.`
      ) },

    { id:'aftermarket_parts', kw:['aftermarket','pièces non originales','non original','frankenwatch','franken','replacement parts','pièces détachées','third party','tiers','modified','modifié','custom dial','cadran custom','aftermarket bracelet','bracelet non original','original parts','pièces originales','all original','tout original','replaced dial','cadran remplacé','redial','re-dial','refinished'],
      r:()=>t(
        `Nous vendons uniquement des montres avec pièces 100% originales. Les pièces aftermarket (cadrans, aiguilles, lunettes non d'origine) réduisent considérablement la valeur. Chaque montre est inspectée et certifiée authentique avant mise en vente.`,
        `We only sell watches with 100% original parts. Aftermarket parts (non-original dials, hands, bezels) significantly reduce value. Every watch is inspected and certified authentic before listing.`
      ) },

    { id:'lug_to_lug', kw:['lug to lug','lug-to-lug','entre cornes','distance entre cornes','case diameter','diamètre boîtier','case thickness','épaisseur boîtier','watch dimensions','dimensions montre','case size','taille boîtier','mm','millimètres','how big','quelle taille','wears big','porte grand','wears small','porte petit','wrist presence','présence au poignet','overhang','dépasser poignet'],
      r:()=>t(
        `**Diamètre** = largeur du boîtier (36–44mm typique). **Lug-to-lug** = hauteur totale (la mesure la plus importante pour le confort). **Épaisseur** = profil (<10mm = fin, >14mm = épais). Idéalement, les cornes ne dépassent pas votre poignet. Venez essayer en boutique.`,
        `**Diameter** = case width (36–44mm typical). **Lug-to-lug** = total height (the most important comfort measurement). **Thickness** = profile (<10mm = thin, >14mm = thick). Ideally lugs shouldn't overhang your wrist. Come try in-store.`
      ) },

    { id:'how_to_wind', kw:['how to wind','comment remonter','winding','remontage','remonter ma montre','wind my watch','how to set','comment régler','set the date','régler la date','set the time','régler l heure','quickset','date rapide','crown positions','positions couronne','screw down crown','couronne vissée','hand winding','remontage manuel','overwinding','trop remonter','can I overwind','surremontage'],
      r:()=>t(
        `**Couronne vissée (Rolex, etc.)** : dévissez (antihoraire), position 1 = remontage, position 2 = date, position 3 = heure. Ne réglez JAMAIS la date entre 21h–3h. Remontage manuel : 20–40 tours suffisent. Les automatiques modernes ont un embrayage anti-surremontage.`,
        `**Screw-down crown (Rolex, etc.)**: unscrew (counter-clockwise), position 1 = winding, position 2 = date, position 3 = time. NEVER set date between 9PM–3AM. Manual wind: 20–40 turns is enough. Modern automatics have an anti-overwind clutch.`
      ) },

    { id:'watch_storage', kw:['storage','rangement','store watch','ranger montre','watch box','boîte montre','watch case','coffret','safe','coffre fort','travel case','étui voyage','watch roll','how to store','comment ranger','store collection','ranger collection','humidity','humidité','keep watch safe','protéger montre','watch cushion','coussin montre'],
      r:()=>t(
        `Rangez vos montres dans un coffret doublé à l'abri de la lumière, humidité, et champs magnétiques. Utilisez un remontoir pour automatiques portées rarement. Pour voyager, un étui individuel rembourré. Pour les collections, un coffre-fort ignifuge est recommandé.`,
        `Store watches in a lined box away from light, humidity, and magnetic fields. Use a winder for rarely-worn automatics. For travel, a padded individual pouch. For collections, a fireproof safe is recommended.`
      ) },

    { id:'scratch_repair', kw:['scratch repair','réparation rayure','remove scratch','enlever rayure','buff out','polir rayure','deep scratch','rayure profonde','desk diving mark','marque de bureau','scratched case','boîtier rayé','scratched bracelet','bracelet rayé','scuff','éraflure','ding','dent','nick','entaille','case repair','réparation boîtier'],
      r:()=>t(
        `Rayures légères : polissage professionnel (satinage ou miroir selon finition d'origine). Rayures profondes : peut nécessiter un polissage plus poussé qui enlève du métal. **Attention** : trop polir réduit la valeur (surtout vintage). Nous pouvons évaluer et conseiller en boutique.`,
        `Light scratches: professional polishing (satin or mirror depending on original finish). Deep scratches: may need heavier polishing that removes metal. **Warning**: over-polishing reduces value (especially vintage). We can assess and advise in-store.`
      ) },

    { id:'engraving', kw:['engraving','gravure','engrave','graver','personalize','personnaliser','personalise','customise','customize','inscription','personalized watch','montre personnalisée','caseback engraving','gravure fond','message gravé','engraved message','initials','initiales','can you engrave','pouvez-vous graver'],
      r:()=>t(
        `La gravure personnalisée est possible sur certaines montres (fond du boîtier). **Attention** : graver une montre de luxe peut réduire sa valeur de revente. Nous pouvons vous conseiller avant de procéder. Contactez-nous.`,
        `Custom engraving is possible on some watches (caseback). **Warning**: engraving a luxury watch can reduce resale value. We can advise before proceeding. Contact us.`
      ) },

    { id:'occasion_watch', kw:['wedding watch','montre mariage','graduation watch','montre diplôme','retirement watch','montre retraite','anniversary watch','montre anniversaire','birthday watch','montre anniversaire','milestone','étape','celebrate','célébrer','commemorative','commémorative','special occasion','occasion spéciale','mark the occasion','marquer l occasion','gift for him','cadeau pour lui','gift for her','cadeau pour elle','memorable','mémorable'],
      r:()=>t(
        `Une montre de luxe est le cadeau parfait pour les moments importants. **Mariage** : Datejust, Calatrava. **Retraite** : Day-Date, Royal Oak. **Diplôme** : Submariner, Santos. Contactez-nous pour des recommandations personnalisées selon l'occasion et le budget.`,
        `A luxury watch is the perfect gift for milestones. **Wedding**: Datejust, Calatrava. **Retirement**: Day-Date, Royal Oak. **Graduation**: Submariner, Santos. Contact us for personalised recommendations based on occasion and budget.`
      ) },

    { id:'travel_watch', kw:['travel watch','montre voyage','best for travel','pour voyager','gmt watch','montre gmt','dual time','double fuseau','world timer','heure mondiale','time zone','fuseau horaire','frequent traveler','voyageur fréquent','jet lag','business travel','voyage affaires','two time zones','deux fuseaux'],
      r:()=>t(
        `Pour les voyageurs : **GMT/Dual Time** (Rolex GMT-Master II, Patek 5164 Aquanaut Travel Time) affiche 2 fuseaux. **World Time** (Patek 5230) affiche 24 fuseaux. Ces montres permettent de suivre l'heure de votre domicile en déplacement.`,
        `For travellers: **GMT/Dual Time** (Rolex GMT-Master II, Patek 5164 Aquanaut Travel Time) shows 2 zones. **World Time** (Patek 5230) shows 24 zones. These watches let you track home time while travelling.`
      ) },

    { id:'small_wrist', kw:['small wrist','petit poignet','thin wrist','poignet fin','wrist size','taille poignet','too big','trop grosse','too large','trop grande','small watch','petite montre','36mm','34mm','38mm','compact watch','montre compacte','fits small','convient petit','slim wrist','poignet mince','narrow wrist','poignet étroit','woman wrist','poignet femme','child wrist'],
      r:()=>t(
        `Pour petits poignets (<16cm) : **36mm** (Datejust 36, OP 36, Santos Medium, Calatrava), **34mm** (Cartier Panthère Small). **37mm** (Royal Oak 15450). Venez essayer en boutique — la taille idéale dépend de la forme du boîtier et du lug-to-lug, pas seulement du diamètre.`,
        `For small wrists (<16cm): **36mm** (Datejust 36, OP 36, Santos Medium, Calatrava), **34mm** (Cartier Panthère Small). **37mm** (Royal Oak 15450). Try in-store — ideal size depends on case shape and lug-to-lug, not just diameter.`
      ) },

    { id:'depreciation', kw:['depreciation','dépréciation','lose value','perdre valeur','value drop','perte de valeur','which watches depreciate','quelles montres déprécient','bad investment','mauvais investissement','will it lose','va-t-elle perdre','value retention','rétention valeur','hold value','garder valeur','best value','meilleure valeur','worst investment','pire investissement','secondary market','marché secondaire'],
      r:()=>t(
        `Rolex, Patek, AP sont les marques qui conservent le mieux leur valeur (parfois au-dessus du prix boutique). Les modèles sport-acier sont les plus demandés. Les montres avec boîte et papiers d'origine conservent 15–20% de valeur en plus. Contactez-nous pour une évaluation.`,
        `Rolex, Patek, AP are the brands that best hold value (sometimes above retail). Steel sport models are most in demand. Watches with original box and papers retain 15–20% more value. Contact us for a valuation.`
      ) },

    { id:'dial_types', kw:['dial type','type cadran','guilloché','guilloche','sunburst','soleil','lacquer','laque','enamel dial','cadran émail','mother of pearl','nacre','meteorite dial','cadran météorite','porcelain dial','cadran porcelaine','fumé','fumée','smoked dial','gradient','dégradé','aventurine','tropical dial','cadran tropical','patina dial','dial finish','finition cadran','dial texture','texture cadran'],
      r:()=>t(
        `Finitions de cadrans : **Sunburst** (reflets radiants, Rolex/AP), **Guilloché** (gravure mécanique, Breguet/Patek), **Émail** (grand feu, artisanal), **Nacre** (iridescent, Lady-Datejust), **Météorite** (chaque pièce unique), **Laque** (profondeur, Cartier). Le cadran est l'âme esthétique de la montre.`,
        `Dial finishes: **Sunburst** (radiant reflections, Rolex/AP), **Guilloché** (mechanical engraving, Breguet/Patek), **Enamel** (grand feu, artisanal), **Mother of pearl** (iridescent, Lady-Datejust), **Meteorite** (each piece unique), **Lacquer** (depth, Cartier). The dial is the aesthetic soul of the watch.`
      ) },

    { id:'customs_import', kw:['customs','douane','import duty','droits d importation','import tax','taxe importation','duty free','hors taxe','détaxe','tax free','customs duty','droits de douane','import watch','importer montre','export','exportation','shipping abroad','expédier à l étranger','declare watch','déclarer montre','customs form','formulaire douane','vat refund','remboursement tva'],
      r:()=>t(
        `Pour les acheteurs hors UE : vous pouvez bénéficier de la détaxe (remboursement TVA 20%). Nous préparons les formulaires nécessaires. Pour l'import dans votre pays, renseignez-vous sur les droits de douane locaux. Nous expédions avec assurance et documents complets.`,
        `For non-EU buyers: you may qualify for détaxe (20% VAT refund). We prepare the necessary forms. For import into your country, check your local customs duties. We ship with insurance and complete documentation.`
      ) },

    { id:'service_interval', kw:['how often service','combien de temps entre révisions','service interval','intervalle révision','when to service','quand réviser','service schedule','calendrier révision','years between service','ans entre révisions','service every','révision tous les','5 years','5 ans','7 years','7 ans','10 years','10 ans','regular service','révision régulière','service frequency','fréquence révision','overdue service','révision en retard','skip service','sauter révision'],
      r:()=>t(
        `Intervalles recommandés : **Rolex** = tous les 10 ans (garantie 5 ans). **AP** = tous les 5–8 ans. **Patek** = tous les 5–7 ans. **RM** = tous les 5 ans. **Cartier** = tous les 5–7 ans. Porter une montre non révisée trop longtemps use les composants et augmente le coût de révision.`,
        `Recommended intervals: **Rolex** = every 10 years (5-year warranty). **AP** = every 5–8 years. **Patek** = every 5–7 years. **RM** = every 5 years. **Cartier** = every 5–7 years. Wearing an overdue watch wears down components and increases service cost.`
      ) },

    // ── DEEP RESEARCH FAQ BATCH 2 ────────────────────────────────────────────────

    { id:'patina_tropical', kw:['patina','patine','tropical dial','cadran tropical','aging','vieillissement','aged dial','cadran vieilli','faded dial','cadran décoloré','yellowed','jauni','spider dial','craquelé','ghost bezel','lunette fantôme','aged lume','plots vieillis','tritium','radium','vintage charm','charme vintage','aged watch','montre vieillie','natural aging','vieillissement naturel'],
      r:()=>t(
        `La patine est l'évolution naturelle des matériaux avec le temps. Un cadran "tropical" (décoloré par le soleil) ou une lunette "ghost" peut AUGMENTER la valeur chez les collectionneurs. Ne jamais restaurer une patine authentique — elle prouve l'originalité et l'histoire de la pièce.`,
        `Patina is the natural evolution of materials over time. A "tropical" dial (sun-faded) or "ghost" bezel can INCREASE value among collectors. Never restore authentic patina — it proves the piece's originality and history.`
      ) },

    { id:'how_to_use_bezel', kw:['how to use bezel','comment utiliser lunette','use gmt bezel','utiliser lunette gmt','use dive bezel','utiliser lunette plongée','use tachymeter','utiliser tachymètre','bezel function','fonction lunette','read bezel','lire lunette','elapsed time','temps écoulé','measure speed','mesurer vitesse','track time','bezel tutorial','tutoriel lunette'],
      r:()=>t(
        `**Plongée** : alignez le 0 sur l'aiguille des minutes, lisez le temps écoulé directement. **GMT** : réglez le décalage horaire sur la lunette 24h, lisez le 2e fuseau via l'aiguille GMT. **Tachymètre** : démarrez le chrono, arrêtez après 1 km/unité — la position de l'aiguille indique la vitesse.`,
        `**Dive**: align 0 with minute hand, read elapsed time directly. **GMT**: set time difference on 24h bezel, read 2nd zone via GMT hand. **Tachymeter**: start chrono, stop after 1 km/unit — hand position shows speed.`
      ) },

    { id:'bracelet_types_explained', kw:['oyster bracelet','bracelet oyster','jubilee bracelet','bracelet jubilé','president bracelet','bracelet président','oyster vs jubilee','jubilé vs oyster','three link','five link','trois maillons','cinq maillons','bracelet type','type de bracelet','which bracelet','quel bracelet','bracelet difference','différence bracelet','oyster jubilee president','sportif vs élégant bracelet'],
      r:()=>t(
        `**Oyster** : 3 maillons, sportif, robuste (Submariner, GMT). **Jubilee** : 5 maillons, élégant, souple (Datejust). **President** : 3 maillons arrondis, or/platine uniquement (Day-Date). Le choix est esthétique — Oyster = sport, Jubilee = classique, President = prestige absolu.`,
        `**Oyster**: 3 links, sporty, robust (Submariner, GMT). **Jubilee**: 5 links, elegant, supple (Datejust). **President**: 3 rounded links, gold/platinum only (Day-Date). Choice is aesthetic — Oyster = sport, Jubilee = classic, President = ultimate prestige.`
      ) },

    { id:'one_watch_collection', kw:['one watch','une seule montre','only one watch','gada','go anywhere do anything','versatile watch','montre polyvalente','all rounder','tout terrain','do it all','faire tout','one watch collection','collection une montre','if you could only have one','si vous ne pouviez en avoir qu une','everyday watch','montre quotidienne','only watch i need','seule montre nécessaire'],
      r:()=>t(
        `Pour une montre unique polyvalente : **Rolex Datejust 41** (sport + habillé), **AP Royal Oak 15500** (luxe sport-chic), **Cartier Santos Medium** (icône élégante). Critères : acier, 100m étanche, saphir, 36-41mm. Venez essayer en boutique pour trouver LA montre.`,
        `For one versatile watch: **Rolex Datejust 41** (sport + dress), **AP Royal Oak 15500** (luxury sport-chic), **Cartier Santos Medium** (elegant icon). Criteria: steel, 100m WR, sapphire, 36-41mm. Come try in-store to find THE watch.`
      ) },

    { id:'why_luxury', kw:['why luxury','pourquoi luxe','why so expensive','pourquoi si cher','worth the money','vaut le prix','why pay more','pourquoi payer plus','overpriced','trop cher','why expensive watch','pourquoi montre chère','what makes luxury','qu est-ce qui fait le luxe','justify price','justifier le prix','cheap vs expensive','pas cher vs cher','is it worth it','est-ce que ça vaut le coup','value of luxury','valeur du luxe','why not cheap watch','apple watch vs rolex'],
      r:()=>t(
        `Une montre de luxe se distingue par : mouvement manufacture (des centaines de composants assemblés à la main), matériaux nobles (acier 904L, or, saphir), finitions artisanales (anglage, côtes de Genève), et valeur de revente. C'est un patrimoine transmissible, pas un gadget jetable.`,
        `A luxury watch stands apart through: manufacture movement (hundreds of hand-assembled components), noble materials (904L steel, gold, sapphire), artisan finishing (bevelling, Côtes de Genève), and resale value. It's a transferable heritage, not a disposable gadget.`
      ) },

    { id:'stolen_check', kw:['stolen','volée','volé','check stolen','vérifier volée','watch register','registre montre','provenance','provenance montre','where does it come from','d où vient-elle','legitimate','légitime','legal','légal','clean title','titre propre','stolen database','base de données volées','is it stolen','est-elle volée','check serial','vérifier série','interpol','police','report stolen','signaler vol'],
      r:()=>t(
        `Nous vérifions CHAQUE montre contre les bases de données de montres volées (The Watch Register, Interpol) avant mise en vente. Chaque pièce a une provenance traçable. Si vous avez des doutes sur une montre achetée ailleurs, consultez thewatchregister.com pour vérifier le numéro de série.`,
        `We check EVERY watch against stolen watch databases (The Watch Register, Interpol) before listing. Each piece has traceable provenance. If you have doubts about a watch bought elsewhere, visit thewatchregister.com to verify the serial number.`
      ) },

    { id:'service_cost_detail', kw:['how much service cost','combien coûte révision','service price','prix révision','cost to service rolex','coût révision rolex','cost to service ap','coût révision ap','cost to service patek','coût révision patek','maintenance cost','coût entretien','service expensive','révision chère','service budget','budget révision','repair cost','coût réparation','overhaul cost','coût remise en état','service estimate','devis révision'],
      r:()=>t(
        `Coûts moyens de révision complète : **Rolex** 600–1 500€ (chrono jusqu'à 2 000€). **AP** 1 000–2 500€. **Patek** 1 500–4 000€+. **RM** 2 000–5 000€+. **Cartier** 500–1 200€. Les prix varient selon complications et état. Nous pouvons vous orienter vers des horlogers certifiés.`,
        `Average full service costs: **Rolex** €600–1,500 (chrono up to €2,000). **AP** €1,000–2,500. **Patek** €1,500–4,000+. **RM** €2,000–5,000+. **Cartier** €500–1,200. Prices vary by complications and condition. We can direct you to certified watchmakers.`
      ) },

    { id:'young_professional', kw:['young professional','jeune professionnel','first job','premier emploi','first bonus','premier bonus','bonus watch','montre bonus','treat yourself','se faire plaisir','reward yourself','se récompenser','career milestone','étape carrière','promotion watch','montre promotion','starter watch','montre débutant','entry level luxury','luxe entrée de gamme','affordable luxury','luxe abordable','under 30','moins de 30 ans'],
      r:()=>t(
        `Pour un premier achat de luxe : **Cartier Santos Medium** (~7 000€), **Rolex Oyster Perpetual 36** (~7 000€), **Cartier Tank Must** (~3 000€). Acier, polyvalentes, forte valeur de revente. Investissement intelligent qui se porte au bureau comme en weekend. Venez essayer.`,
        `For a first luxury purchase: **Cartier Santos Medium** (~€7,000), **Rolex Oyster Perpetual 36** (~€7,000), **Cartier Tank Must** (~€3,000). Steel, versatile, strong resale. Smart investment that works at the office and on weekends. Come try them.`
      ) },

    { id:'can_i_swim', kw:['can I swim','puis-je nager','swim with watch','nager avec montre','shower with watch','douche avec montre','pool','piscine','beach','plage','sea water','eau de mer','salt water','eau salée','hot tub','jacuzzi','sauna','steam','vapeur','swim rolex','nager rolex','waterproof enough','assez étanche','take in water','prendre eau','safe in water','sûr dans l eau','swim safe','baignade'],
      r:()=>t(
        `**30m/3ATM** : éclaboussures seulement, PAS de nage. **50m/5ATM** : nage calme OK. **100m/10ATM** : nage, snorkeling OK. **200m+** : plongée. Rolex Submariner (300m), Seamaster (300m) = parfait pour nager. **Jamais** de sauna/jacuzzi — la chaleur détruit les joints. Rincez à l'eau douce après la mer.`,
        `**30m/3ATM**: splashes only, NO swimming. **50m/5ATM**: calm swimming OK. **100m/10ATM**: swimming, snorkeling OK. **200m+**: diving. Rolex Submariner (300m), Seamaster (300m) = perfect for swimming. **Never** sauna/hot tub — heat destroys seals. Rinse with fresh water after sea.`
      ) },

    { id:'strap_types', kw:['nato strap','bracelet nato','rubber strap','bracelet caoutchouc','leather strap','bracelet cuir','alligator strap','bracelet alligator','crocodile strap','bracelet crocodile','canvas strap','bracelet toile','mesh bracelet','bracelet mailles','milanese','milanais','strap material','matière bracelet','which strap','quel bracelet','change strap','changer bracelet','swap strap','comfortable strap','bracelet confortable','strap for summer','bracelet été','strap for sport','bracelet sport'],
      r:()=>t(
        `**Cuir/alligator** : élégant, habillé, éviter l'eau. **Caoutchouc** : sport, étanche, confortable été. **NATO** : décontracté, léger, abordable. **Acier** : polyvalent, durable, premium. **Mesh** : rétro-chic. Changer le bracelet transforme le look d'une montre — c'est le moyen le plus simple de varier les styles.`,
        `**Leather/alligator**: elegant, dressy, avoid water. **Rubber**: sporty, waterproof, comfortable in summer. **NATO**: casual, lightweight, affordable. **Steel**: versatile, durable, premium. **Mesh**: retro-chic. Changing the strap transforms a watch's look — it's the easiest way to vary styles.`
      ) },

    { id:'watch_trends', kw:['watch trends','tendances montres','trending watches','montres tendance','popular now','populaire maintenant','hot watch','montre en vogue','what is trending','qu est-ce qui est tendance','2026 watches','montres 2026','new releases','nouvelles sorties','latest watch','dernière montre','what is popular','qu est-ce qui est populaire','hype','buzz','most wanted','plus recherché','fashionable watch','montre à la mode'],
      r:()=>t(
        `Tendances actuelles : boîtiers 36–39mm (retour aux tailles classiques), cadrans colorés (vert, bleu ciel, saumon), bracelets intégrés (Royal Oak, Nautilus), montres vintage/patinées. Les Rolex sport acier, AP Royal Oak et Patek Nautilus restent les plus demandées. Contactez-nous.`,
        `Current trends: 36–39mm cases (return to classic sizes), coloured dials (green, sky blue, salmon), integrated bracelets (Royal Oak, Nautilus), vintage/patinated watches. Steel sport Rolex, AP Royal Oak and Patek Nautilus remain most in demand. Contact us.`
      ) },

    { id:'watch_as_heirloom', kw:['heirloom','héritage','pass down','transmettre','generation','génération','father to son','père à fils','family watch','montre familiale','legacy','patrimoine','keep forever','garder toujours','last a lifetime','durer toute une vie','for my children','pour mes enfants','intergenerational','intergénérationnel','you never own','on ne possède jamais','patek slogan','slogan patek','next generation','prochaine génération'],
      r:()=>t(
        `Les montres mécaniques de qualité durent plusieurs générations avec un entretien régulier. Patek Philippe : "Vous ne possédez jamais vraiment une Patek Philippe, vous en êtes le gardien pour la génération suivante." Rolex, AP, Patek et Cartier sont conçues pour traverser les décennies. Un héritage tangible.`,
        `Quality mechanical watches last multiple generations with regular servicing. Patek Philippe: "You never actually own a Patek Philippe, you merely look after it for the next generation." Rolex, AP, Patek and Cartier are designed to span decades. A tangible legacy.`
      ) },

    { id:'watch_for_woman_guide', kw:['watch for wife','montre pour femme','montre pour ma femme','girlfriend watch','montre copine','women luxury watch','montre luxe femme','ladies watch guide','guide montre femme','feminine watch','montre féminine','elegant women','femme élégante','women collection','collection femme','best women watch','meilleure montre femme','lady watch','montre dame','her watch','sa montre','small elegant','petite élégante'],
      r:()=>t(
        `Montres femmes populaires : **Cartier Panthère** (icône Art Déco, ~4 000€), **Rolex Lady-Datejust 28mm** (~7 000€+), **Patek Twenty~4** (~12 000€+), **AP Royal Oak 33/34mm** (~20 000€+), **Cartier Ballon Bleu 33mm** (~5 000€). Venez découvrir notre sélection en boutique.`,
        `Popular women's watches: **Cartier Panthère** (Art Deco icon, ~€4,000), **Rolex Lady-Datejust 28mm** (€7,000+), **Patek Twenty~4** (€12,000+), **AP Royal Oak 33/34mm** (€20,000+), **Cartier Ballon Bleu 33mm** (~€5,000). Come discover our selection in-store.`
      ) },

    { id:'paris_shopping', kw:['shopping paris','paris watches','watch shopping paris','acheter montre paris','boutique paris','paris boutique','visit paris','visiter paris','tourist watch','touriste montre','paris luxury','luxe paris','place vendôme','vendome','rue du faubourg','champs élysées','8ème arrondissement','paris 8','quartier montre','watch district paris','where to buy paris','où acheter paris'],
      r:()=>t(
        `Notre boutique est idéalement située dans le 8ème arrondissement de Paris, quartier historique de l'horlogerie de luxe. Nous accueillons clients locaux et touristes internationaux. Détaxe disponible pour les résidents hors UE. Prenez rendez-vous pour une consultation privée.`,
        `Our boutique is ideally located in Paris's 8th arrondissement, the historic luxury watch district. We welcome local clients and international tourists. Tax refund (détaxe) available for non-EU residents. Book an appointment for a private consultation.`
      ) },

    { id:'watch_for_collection', kw:['build collection','construire collection','start collection','commencer collection','watch collection advice','conseil collection','how many watches','combien de montres','three watch collection','collection trois montres','five watch collection','collection cinq montres','diversify collection','diversifier collection','complement','compléter','next watch','prochaine montre','add to collection','ajouter à ma collection','round out','compléter collection','which watch next','quelle montre ensuite'],
      r:()=>t(
        `Collection idéale en 3 montres : 1) **Sport** (Submariner, Royal Oak), 2) **Habillée** (Calatrava, Cartier Tank), 3) **Complication** (GMT, Annual Calendar). Diversifiez marques et styles. Nous pouvons vous aider à planifier votre collection selon votre budget et vos goûts.`,
        `Ideal 3-watch collection: 1) **Sport** (Submariner, Royal Oak), 2) **Dress** (Calatrava, Cartier Tank), 3) **Complication** (GMT, Annual Calendar). Diversify brands and styles. We can help plan your collection based on budget and taste.`
      ) },





    { id:'rolex_clasp', kw:['fermoir','clasp','deployant','déployant','safety clasp','fermoir sécurité','oysterlock','oysterclasp','glidelock','glide lock','bracelet fermoir','adjust bracelet','ajuster bracelet','bracelet trop grand','bracelet too big','bracelet too small','bracelet trop petit','resize bracelet','ajuster taille'],
      r:()=>t(
        `Rolex utilise l'Oysterlock (sécurité plongée) + système Glidelock pour ajuster le bracelet de ±5mm sans outils. AP Royal Oak a un fermoir papillon. Les deux sont parmi les fermetures les plus sécurisées du marché.`,
        `Rolex uses Oysterlock (dive safety) + Glidelock system to adjust bracelet ±5mm without tools. AP Royal Oak has a butterfly clasp. Both are among the most secure closures on the market.`
      ) },

    { id:'watch_accuracy', kw:['précision','accuracy','accurate','precise','exactitude','seconds per day','secondes par jour','gain loss','gain perte','fast slow','avance retard','chronometer','chronomètre','how accurate','quelle précision','very accurate','très précis','keeps time','garde le temps','time keeping'],
      r:()=>t(
        `Rolex cal. 3235 : ±2 s/j. AP cal. 4302 : ±2 s/j. Patek cal. 26-330 : ±2 s/j. Pour comparaison, le quartz standard : ±15 s/mois. Si votre mécanique dépasse ±5 s/j, une révision est conseillée.`,
        `Rolex cal. 3235: ±2 s/d. AP cal. 4302: ±2 s/d. Patek cal. 26-330: ±2 s/d. For comparison, standard quartz: ±15 s/month. If your mechanical exceeds ±5 s/d, a service is recommended.`
      ) },

    { id:'oyster_perpetual_about', kw:['oyster','perpetual','oyster case','boîtier oyster','what is oyster','cest quoi oyster','oyster meaning','oyster technology','oyster rolex','perpétuel','perpetual rotor','rotor perpétuel','self winding rotor','rotor remontage'],
      r:()=>t(
        `"Oyster" = boîtier hermétique (inventé par Rolex en 1926, étanche). "Perpetual" = rotor de remontage automatique (inventé par Rolex en 1931). Ces deux innovations ont révolutionné la montre-bracelet.`,
        `"Oyster" = hermetic case (invented by Rolex in 1926, waterproof). "Perpetual" = automatic winding rotor (invented by Rolex in 1931). These two innovations revolutionised the wristwatch.`
      ) },

    { id:'sell_rolex', kw:['vendre ma rolex','sell my rolex','vendre rolex','estimer rolex','rolex estimation vente','je veux vendre rolex','combien pour ma rolex','rachat rolex','how much for my rolex','rolex buyback'],
      r:()=>t(
        `Pour estimer votre Rolex : envoyez-nous photos (cadran, boîtier, fond, couronne, bracelet) + réf. et état. Réponse sous 48h. Papiers et boîte d'origine augmentent le prix de 15–30%.`,
        `To estimate your Rolex: send photos (dial, case, caseback, crown, bracelet) + ref. and condition. Response within 48h. Original papers and box increase price by 15–30%.`
      ) },

    { id:'sell_ap', kw:['vendre ap','vendre royal oak','sell ap','sell royal oak','estimer ap','ap estimation vente','je veux vendre ap','combien pour mon ap','rachat ap','how much for my ap','ap buyback'],
      r:()=>t(
        `Pour estimer votre AP : envoyez photos cadran, boîtier (côté serial), fond, bracelet + état. Les Royal Oak 15500ST en bonne condition se rachètent 30 000–40 000€ selon le marché.`,
        `To estimate your AP: send photos of dial, case (serial side), caseback, bracelet + condition. Royal Oak 15500ST in good condition buys at €30,000–40,000 depending on the market.`
      ) },

    { id:'sell_patek', kw:['vendre patek','sell patek','estimer patek','patek estimation vente','je veux vendre patek','combien pour mon patek','rachat patek','how much for my patek','patek buyback'],
      r:()=>t(
        `Pour estimer votre Patek : envoyez photos + numéro de série (fond). Le Nautilus 5711/1A set complet se rachète actuellement 75 000–100 000€. Délai de réponse : 24–48h.`,
        `To estimate your Patek: send photos + serial number (caseback). Nautilus 5711/1A complete set currently buys at €75,000–100,000. Response time: 24–48h.`
      ) },

    { id:'condition_grades', kw:['état','condition','mint','parfait état','très bon état','bon état','état usagé','worn condition','grade','scratches','rayures','used','porté','unworn','never worn','NOS','new old stock','what condition','quelle condition','condition description','description état','how worn','combien porté','how used','how old','quel âge','age of watch','age montre','year of watch','année de la montre','production date','date de production'],
      r:()=>t(
        `Nos grades : Excellent (≤légères traces bracelet), Très bon (quelques marques boîtier), Bon (marques visibles, fonctionnel). Les prix indiqués sur le site reflètent l'état réel de chaque pièce.`,
        `Our grades: Excellent (≤light bracelet marks), Very Good (some case marks), Good (visible marks, fully functional). Prices shown on site reflect each piece's actual condition.`
      ) },

    // ── FINALES ───────────────────────────────────────────────────────────────────
    { id:'rolex_116613lb', kw:['116613lb','submariner bicolore','submariner acier or','rolesor submariner','sub gold steel','deux tons submariner','two tone submariner','116613 lb','116613 acier or','rolex submariner bicolore','rolex submariner acier or','rolex submariner two tone','submariner blue gold','submariner bleu or','submariner rolesor'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const w=STOCK.find(s=>s.ref==='116613LB'); return t(
        `**Rolex Submariner Date réf. 116613LB** — Acier/Or jaune "Rolesor" bleu\n\n${w?`📍 **En stock : ${fmt(w.price)}**\n\n`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel + or jaune 18ct (Rolesor)\n• **Lunette** : Cerachrom céramique bleue, insert or jaune\n• **Cadran** : Bleu soleil (sunburst), index or appliqués\n• **Calibre** : 3135, 48h réserve de marche\n• **Étanchéité** : 300 mètres\n• **Bracelet** : Oyster bicolore acier/or + Glidelock\n\n**Particularité** : La combinaison bleu/or est un classique Rolex. La 116613LB est la version 40mm (génération pré-2020). Le bleu du cadran et de la lunette change de nuance selon la lumière — signature de la finition Rolex.\n\n**Marché** : ~11 000–14 000€. Excellente valeur dans la gamme bicolore Rolex.`,
        `**Rolex Submariner Date ref. 116613LB** — Steel/Yellow gold "Rolesor" blue\n\n${w?`📍 **In stock: ${fmt(w.price)}**\n\n`:''}• **Case**: Oyster 40mm, Oystersteel + 18ct yellow gold (Rolesor)\n• **Bezel**: Blue Cerachrom ceramic, yellow gold insert\n• **Dial**: Blue sunburst, applied gold indices\n• **Calibre**: 3135, 48h power reserve\n• **Water resistance**: 300 metres\n• **Bracelet**: Two-tone Oyster steel/gold + Glidelock\n\n**Unique feature**: The blue/gold combination is a Rolex classic. The 116613LB is the 40mm version (pre-2020 generation). The blue of the dial and bezel shifts in nuance with light — a signature Rolex finish.\n\n**Market**: ~€11,000–14,000. Excellent value in the Rolex two-tone range.`
      );} },

    { id:'datejust_wimbledon', kw:['wimbledon','126300 wimbledon','datejust wimbledon','cadran wimbledon','vert datejust','wimbledon dial','slate green','fluted bezel green','126300'],
      r:()=>{ const s=STOCK.filter(w=>w.ref&&w.ref.includes('Wimbledon')); return t(
        `Datejust Wimbledon :\n${s.map(w=>`• réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nCadran vert ardoise, lunette cannelée or blanc, bracelet Jubilé. Un des cadrans Rolex les plus recherchés.`,
        `Datejust Wimbledon:\n${s.map(w=>`• ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nSlate green dial, white gold fluted bezel, Jubilee bracelet. One of the most sought-after Rolex dials.`
      );} },

    { id:'ap_25940sk', kw:['25940sk','offshore 42','offshore acier céramique','ap offshore 25940','offshore noir céramique','25940 ap'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='25940SK'); return t(
        `Royal Oak Offshore réf. **25940SK** : ${w?fmt(w.price):'~17 000–19 000€ marché'}. Boîtier acier, lunette céramique noire, bracelet caoutchouc noir, 44mm, cal. 3126/3840.`,
        `Royal Oak Offshore ref. **25940SK**: ${w?fmt(w.price):'~€17,000–19,000 market'}. Steel case, black ceramic bezel, black rubber bracelet, 44mm, cal. 3126/3840.`
      );} },

    { id:'urgent', kw:['urgent','urgently','rapidement','quickly','vite','asap','dès que possible','as soon as possible','aujourd hui','today','ce soir','tonight','demain','tomorrow','je suis pressé','in a hurry'],
      r:()=>t(
        `Pour toute demande urgente, appelez-nous directement au ${BIZ.phone1} — nous répondons en temps réel pendant les heures d'ouverture.`,
        `For urgent requests, call us directly on ${BIZ.phone1} — we respond in real time during opening hours.`
      ) },

    { id:'rolex_submariner_nodate', kw:['submariner no date','sub sans date','114060','124060','submariner sans date','no date sub','114060 prix','124060 prix','three six three submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; return t(
        `Submariner sans date (réf. 124060, 41mm, cal. 3230) : marché ~9 500–11 000€. Plus épuré que la Date, légèrement moins cher. Lunette céramique noire, cadran noir.`,
        `Submariner No Date (ref. 124060, 41mm, cal. 3230): market ~€9,500–11,000. Cleaner dial than the Date, slightly lower price. Black ceramic bezel, black dial.`
      );} },

    { id:'cartier_love', kw:['love cartier','love bracelet','love ring','b6035517','b6047317','cartier love bracelet','vis cartier','tournevis cartier','love gold','love acier','love or','love diamond','love prix'],
      r:()=>{ ctx.brand='Cartier'; return t(
        `Cartier Love Bracelet : bijou iconique depuis 1969. Or jaune 18ct ~6 500€, or rose ~6 500€, or blanc ~6 500€. Acier ~2 000–3 000€ marché seconde main. Contactez-nous pour disponibilité.`,
        `Cartier Love Bracelet: iconic jewel since 1969. Yellow gold 18ct ~€6,500, rose gold ~€6,500, white gold ~€6,500. Steel ~€2,000–3,000 on secondary market. Contact us for availability.`
      );} },

    // SANTOS COLLECTION
    { id:'cartier_santos_medium', kw:['santos medium','santos 35','santos 35.1mm','santos acier medium','cartier santos 35'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Medium'; return t(
        `Cartier Santos Moyen (35.1mm, acier, cal. 1847 MC) : le classique sport revisité. Boîtier acier inoxydable, bracelet QuickSwitch intégré. Mouvement automatique 42h réserve, 100m étanchéité. ~9 500–11 000€ neuf. Design 1904, modernisé avec l'acier brossé et le verre saphir bombé. Couronne octogonale brevetée. Référence W2SA0018, collection contemporaine incontournable.`,
        `Cartier Santos Medium (35.1mm, steel, cal. 1904 MC): the iconic sports watch redesigned. Stainless steel case, integrated QuickSwitch bracelet. Automatic movement 42-hour reserve, 100m water resistance. ~€9,500–11,000 new. 1904 design, modernized with brushed steel and domed sapphire crystal. Patented octagonal crown. Reference W2SA0018, essential contemporary collection.`
      );} },

    { id:'cartier_santos_large', kw:['santos large','santos 39','santos 39.8mm','santos acier grand','cartier santos 39','santos wssa0018'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Large'; return t(
        `Cartier Santos Grand (39.8mm, acier, cal. 1847 MC) : la version masculine du classique sport. Boîtier acier inoxydable, bracelet QuickSwitch, lunette sculptée. Mouvement automatique 42h réserve, 100m étanchéité. ~10 500–12 500€ neuf. Références WSSA0018. Cadran bleu ou blanc, index appliqués, aiguilles épées. Léger et confortable malgré les 39.8mm. Choix premium pour le poignet masculin.`,
        `Cartier Santos Large (39.8mm, steel, cal. 1904 MC): the masculine version of the iconic sports watch. Stainless steel case, QuickSwitch bracelet, sculpted bezel. Automatic movement 42-hour reserve, 100m water resistance. ~€10,500–12,500 new. Reference WSSA0018. Blue or white dial, applied indices, sword hands. Light and comfortable despite 39.8mm case. Premium choice for men's wrists.`
      );} },

    { id:'cartier_santos_skeleton', kw:['santos skeleton','santos squelette','santos adlc','santos pvm','cartier skeleton santos'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Skeleton'; return t(
        `Cartier Santos Skeleton (39.8mm, ADLC carbone, cal. 9611 MC) : haute horlogerie affichée. Boîtier revêtu PVD noir (carbone), dos transparent, mécanisme visible. Squelettisation complète du mouvement automatique. ~28 000–32 000€ neuf. Lunette or rose ou acier contraste, index diamants optionnels. Edition limitée, prestiges collections. Réference WHSA0012 (acier), WJSA0015 (or rose).`,
        `Cartier Santos Skeleton (39.8mm, ADLC carbon, cal. 9611 MC): haute horlogerie on display. DLC coated case (black carbon), transparent caseback, visible mechanism. Full skeletonized automatic movement. ~€28,000–32,000 new. Rose gold or contrasted steel bezel, optional diamond indices. Limited edition, prestige collections. Reference WHSA0012 (steel), WJSA0015 (rose gold).`
      );} },

    { id:'cartier_santos_chrono', kw:['santos chronographe','santos chrono','santos chronograph','santos timing','cartier santos chronograph'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Chronographe'; return t(
        `Cartier Santos Chronographe (39.8mm, acier/or, cal. 1904 CHR MC) : l'outil sportif complet. Boîtier acier ou or jaune, fond transparent, chronographe intégré 30mn. Mouvement automatique chronographique 40h réserve, 100m étanchéité. ~15 000–18 000€ (acier), ~45 000–55 000€ (or). Cadran noir avec compteurs contrastants. Bracelet QuickSwitch. Rarement proposé, collection boutique exclusive.`,
        `Cartier Santos Chronograph (39.8mm, steel/gold, cal. 1904 CHR MC): the complete sports tool. Steel or yellow gold case, transparent caseback, integrated 30-minute chronograph. Automatic chronograph movement 40-hour reserve, 100m water resistance. ~€15,000–18,000 (steel), ~€45,000–55,000 (gold). Black dial with contrasting counters. QuickSwitch bracelet. Rarely offered, exclusive boutique collection.`
      );} },

    // TANK COLLECTION
    { id:'cartier_tank_louis', kw:['tank louis','tank 1917','original tank','premiere tank','cartier tank history'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Louis'; return t(
        `Cartier Tank Louis Cartier (33.7mm, acier/or, cal. 1904 MC) : la montre carrée d'exception depuis 1917. Création iconique de Louis Cartier, boîtier acier ou or jaune/rose 18ct, lunette lisse. Mouvement automatique 40h réserve, 30m étanchéité. ~7 500–9 500€ (acier), ~35 000–45 000€ (or). Cadran email blanc avec chiffres romains. Bracelet cuir alligator ou acier. References WTA0011, WGTA0002. Pièce de collection, patrimoine horloger.`,
        `Cartier Tank Louis Cartier (33.7mm, steel/gold, cal. 1904 MC): the exceptional square watch since 1917. Iconic creation by Louis Cartier, stainless steel or 18ct yellow/rose gold case, smooth bezel. Automatic movement 40-hour reserve, 30m water resistance. ~€7,500–9,500 (steel), ~€35,000–45,000 (gold). White enamel dial with Roman numerals. Alligator leather or steel bracelet. References WTA0011, WGTA0002. Collector's piece, watchmaking heritage.`
      );} },

    { id:'cartier_tank_must', kw:['tank must','tank solarbeat','tank must solaire','cartier tank accessible','tank quartz must'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Must'; return t(
        `Cartier Tank Must SolarBeat (33.7mm, acier/PVD, cal. 690 quartz solaire) : démocratisation du Tank. Boîtier acier inoxydable option PVD noir, bracelet acier. Mouvement quartz SolarBeat (recharge solaire) 16 mois autonomie. ~1 700–2 200€. Cadran noir ou bleu, chiffres romains. Très accessible, collection jeune. Couronne tank sculptée. References CRWSTA0018 (acier), CRWSTA0009 (PVD). Popularité montante auprès millennials.`,
        `Cartier Tank Must SolarBeat (33.7mm, steel/PVD, cal. 690 solar quartz): democratizing the Tank. Stainless steel case with optional black PVD, steel bracelet. SolarBeat quartz movement (solar rechargeable) 16-month power reserve. ~€1,700–2,200. Black or blue dial, Roman numerals. Highly accessible, young collection. Sculpted tank crown. References CRWSTA0018 (steel), CRWSTA0009 (PVD). Rising popularity with millennials.`
      );} },

    { id:'cartier_tank_mc', kw:['tank mc','tank moyen','tank manufacture','tank 29','cartier tank mc medium'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank MC'; return t(
        `Cartier Tank MC (29mm, acier/or, cal. 1904 MC) : le Tank femme par excellence. Boîtier acier inoxydable ou or jaune/rose 18ct, lunette lisse satinée. Mouvement automatique Cartier 1904 MC 40h, 30m étanchéité. ~6 500–8 500€ (acier), ~32 000–42 000€ (or). Cadran blanc, index romains appétents. Bracelet cuir alligator ou QuickSwitch acier. References WTA0013, WGTA0008. Proposition unisexe moderne sur 29mm.`,
        `Cartier Tank MC (29mm, steel/gold, cal. 1904 MC): the quintessential women's Tank. Stainless steel or 18ct yellow/rose gold case, smooth satin bezel. Automatic Cartier 1904 MC movement 40-hour reserve, 30m water resistance. ~€6,500–8,500 (steel), ~€32,000–42,000 (gold). White dial, Roman indices. Alligator leather or QuickSwitch steel bracelet. References WTA0013, WGTA0008. Modern unisex proposition on 29mm.`
      );} },

    { id:'cartier_tank_cintree', kw:['tank cintrée','tank cintree','tank elongated','tank vintage','tank curvé','cartier tank curved'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Cintrée'; return t(
        `Cartier Tank Cintrée (50.2 x 31mm, or jaune, cal. 1904 MC) : l'élégance bombée originale. Boîtier or jaune 18ct épuré, lunette bombée signature. Mouvement automatique 40h réserve, 30m étanchéité. ~35 000–45 000€ marché. Cadran bleu nuit ou argent. Référence WGTA0050. Pièce vintage-inspirée, ligne courbée intemporelle. Produit actuellement en édition limitée. Rarissime depuis 1980s.`,
        `Cartier Tank Cintrée (50.2 x 31mm, yellow gold, cal. 1904 MC): the original domed elegance. Pure 18ct yellow gold case, signature domed bezel. Automatic movement 40-hour reserve, 30m water resistance. ~€35,000–45,000 market. Midnight blue or silver dial. Reference WGTA0050. Vintage-inspired piece, timeless curved line. Currently produced in limited edition. Rarified since 1980s.`
      );} },

    { id:'cartier_tank_normale', kw:['tank normale','tank 2024','tank reinvention','tank edition','tank relaunch'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Normale'; return t(
        `Cartier Tank Normale (27.4 x 23.4mm, acier/or, cal. 690 quartz) : la ré-édition 2024 de 1928. Boîtier acier inoxydable ou or jaune, proportions carrées pures. Mouvement quartz 690 Cartier, 3 ans autonomie. ~4 200€ (acier), ~18 000€ (or jaune). Cadran blanc email ou noir, chiffres romains gravés. Bracelet cuir alligator cartier. Références WSTA0009 (acier), WGTA0045 (or). Relance boutique 2024, collection historiquement fondatrice.`,
        `Cartier Tank Normale (27.4 x 23.4mm, steel/gold, cal. 690 quartz): the 2024 re-edition of 1928. Stainless steel or yellow gold case, pure square proportions. Cartier 690 quartz movement, 3-year power reserve. ~€4,200 (steel), ~€18,000 (yellow gold). White enamel or black dial, engraved Roman numerals. Cartier alligator leather bracelet. References WSTA0009 (steel), WGTA0045 (gold). Boutique relaunch 2024, historically foundational collection.`
      );} },

    // BALLON BLEU COLLECTION
    { id:'cartier_bb_33', kw:['ballon bleu 33','bb 33','ballon bleu quartz','bb femme','ballon bleu dame','cartier bb dames'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 33'; return t(
        `Cartier Ballon Bleu 33mm (acier/or, quartz) : l'iconique pour dames. Boîtier 33mm acier inoxydable ou or jaune 18ct, lunette portée cabochon saphir bleu. Mouvement quartz Cartier, 2 ans autonomie. ~4 500–6 500€ (acier), ~28 000–36 000€ (or). Cadran bleu grad ou argenté, chiffres romains. Bracelet QuickSwitch cuir ou acier. Références W2BA0004 (acier), WGBB0004 (or). Inévitable feminin, porté iconic léger.`,
        `Cartier Ballon Bleu 33mm (steel/gold, quartz): the iconic women's version. 33mm stainless steel or 18ct yellow gold case, signature worn sapphire cabochon bezel. Cartier quartz movement, 2-year power reserve. ~€4,500–6,500 (steel), ~€28,000–36,000 (gold). Blue gradient or silver dial, Roman numerals. QuickSwitch leather or steel bracelet. References W2BA0004 (steel), WGBB0004 (gold). Iconic feminine, lightweight worn design.`
      );} },

    { id:'cartier_bb_36', kw:['ballon bleu 36','bb 36','ballon bleu auto','bb unisexe','cartier bb moyen','ballon bleu proportions'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 36'; return t(
        `Cartier Ballon Bleu 36mm (acier/or, cal. 1847 MC) : l'unisexe référence. Boîtier 36mm acier ou or jaune, lunette cabochon bleu saphir signature. Mouvement automatique Cartier 1904 MC 40h réserve. 100m étanchéité. ~6 500–8 500€ (acier), ~35 000–45 000€ (or). Cadran blanc ou bleu soleillé, aiguilles épées. Bracelet QuickSwitch acier ou cuir. References W2BB0004, WGBB0033. Porté léger, masculine/feminine equivalent proportion.`,
        `Cartier Ballon Bleu 36mm (steel/gold, cal. 1904 MC): the unisex reference. 36mm stainless steel or yellow gold case, signature blue sapphire cabochon bezel. Automatic Cartier 1904 MC movement 40-hour reserve. 100m water resistance. ~€6,500–8,500 (steel), ~€35,000–45,000 (gold). White or sunburst blue dial, sword hands. QuickSwitch steel or leather bracelet. References W2BB0004, WGBB0033. Light worn design, masculine/feminine equivalent proportions.`
      );} },

    { id:'cartier_bb_42', kw:['ballon bleu 42','bb 42','ballon bleu hommes','bb masculin','ballon bleu grand','cartier bb grand'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 42'; return t(
        `Cartier Ballon Bleu 42mm (acier/or, cal. 9611 MC) : le Ballon masculin fort. Boîtier 42mm acier inoxydable ou or jaune 18ct, lunette cabochon bleu saphir prédominant. Mouvement automatique 9611 MC, chronographe optionnel (version Chronographe). 100m étanchéité. ~7 500–9 500€ (acier), ~40 000–50 000€ (or). Cadran gris, blanc ou gradient bleu. Bracelet QuickSwitch acier. Références W2BB0010 (acier), WGBB0010 (or). Présence masculine, port épais et léger.`,
        `Cartier Ballon Bleu 42mm (steel/gold, cal. 1904 MC): the strong masculine Ballon. 42mm stainless steel or 18ct yellow gold case, dominant blue sapphire cabochon bezel. Automatic 1904 MC movement, optional chronograph (Chronograph version). 100m water resistance. ~€7,500–9,500 (steel), ~€40,000–50,000 (gold). Gray, white or blue gradient dial. QuickSwitch steel bracelet. References W2BB0010 (steel), WGBB0010 (gold). Masculine presence, thick yet light wear.`
      );} },

    // PASHA COLLECTION
    { id:'cartier_pasha_41', kw:['pasha 41','pasha current','pasha automatique','pasha 41mm','cartier pasha moderne'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha de Cartier 41'; return t(
        `Cartier Pasha de Cartier 41mm (acier/or, cal. 1904 MC) : l'icône carrée sport 2020. Boîtier 41mm acier inoxydable ou or jaune, lunette carrée Pasha, couronne protégée. Mouvement automatique 40h réserve, 100m étanchéité. ~8 500–10 500€ (acier), ~40 000–50 000€ (or). Cadran noir, bleu ou gris, aiguilles Mercedes. Bracelet QuickSwitch acier ou cuir. Références W2PA0010 (acier), WGPA0010 (or). Design revitalisé 2021, très demandé.`,
        `Cartier Pasha de Cartier 41mm (steel/gold, cal. 1904 MC): the iconic square sports watch 2020. 41mm stainless steel or yellow gold case, Pasha square bezel, protected crown. Automatic movement 40-hour reserve, 100m water resistance. ~€8,500–10,500 (steel), ~€40,000–50,000 (gold). Black, blue or gray dial, Mercedes hands. QuickSwitch steel or leather bracelet. References W2PA0010 (steel), WGPA0010 (gold). Revitalized 2021 design, highly sought.`
      );} },

    { id:'cartier_pasha_chrono', kw:['pasha chronographe','pasha chrono','pasha timing','pasha chronograph','cartier pasha sport'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha Chronographe'; return t(
        `Cartier Pasha Chronographe (42mm, acier/or, cal. 1904-CHR MC) : l'outil sport complet. Boîtier 42mm acier ou or, lunette Pasha distincte, fond transparent. Chronographe intégré 12h/30mn/60s. Mouvement automatique chronographique. ~12 000–14 000€ (acier), ~50 000–65 000€ (or). Cadran noir avec compteurs colorés. Rarement proposé, collection spécialisée. Référence W2PA0015 (acier version).`,
        `Cartier Pasha Chronograph (42mm, steel/gold, cal. 1904-CHR MC): the complete sports tool. 42mm steel or gold case, distinct Pasha bezel, transparent caseback. Integrated 12-hour/30-minute/60-second chronograph. Automatic chronograph movement. ~€12,000–14,000 (steel), ~€50,000–65,000 (gold). Black dial with colored counters. Rarely offered, specialized collection. Reference W2PA0015 (steel version).`
      );} },

    { id:'cartier_pasha_skeleton', kw:['pasha skeleton','pasha squelette','pasha transparent','pasha adlc','cartier pasha ajouré'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha Skeleton'; return t(
        `Cartier Pasha Skeleton (42mm, ADLC/or, cal. 9611 MC squelettisé) : haute horlogerie carrée. Boîtier revêtu carbone ou or, mouvement squelettisé visible. Mouvement automatique 9611 MC 40h réserve. ~28 000–35 000€ (ADLC), ~65 000–80 000€ (or). Fond transparent, lunette Pasha carrée. Édition limitée, collection prestige. Très rare au second marché.`,
        `Cartier Pasha Skeleton (42mm, ADLC/gold, cal. 9611 MC skeletonized): square haute horlogerie. Carbon-coated or gold case, skeletonized visible movement. Automatic 9611 MC movement 40-hour reserve. ~€28,000–35,000 (ADLC), ~€65,000–80,000 (gold). Transparent caseback, square Pasha bezel. Limited edition, prestige collection. Very rare on secondary market.`
      );} },

    // PANTHÈRE COLLECTION
    { id:'cartier_panthere_medium', kw:['panthère moyen','panthere 27','panthère 27mm','panthère quartz iconic','cartier panthere femme'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Panthère 27'; return t(
        `Cartier Panthère 27mm (acier/or, quartz) : l'icône féminine depuis 1983. Boîtier 27mm acier ou or jaune, lunette polygonale signature panth. Mouvement quartz Cartier, 2 ans autonomie. ~3 500–5 000€ (acier), ~20 000–28 000€ (or). Cadran bleu soleillé ou argenté, index romains. Bracelet QuickSwitch cuir alligator ou acier. Références W25028B6, WGPN0006. Portée légendaire, feminin par essence.`,
        `Cartier Panthère 27mm (steel/gold, quartz): the feminine icon since 1983. 27mm stainless steel or yellow gold case, signature polygonal panther bezel. Cartier quartz movement, 2-year power reserve. ~€3,500–5,000 (steel), ~€20,000–28,000 (gold). Sunburst blue or silver dial, Roman indices. QuickSwitch alligator leather or steel bracelet. References W25028B6, WGPN0006. Legendary wear, feminine by essence.`
      );} },

    { id:'cartier_panthere_small', kw:['panthère petit','panthere 22','panthère 22mm','panthère petite','cartier panthere small'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Panthère 22'; return t(
        `Cartier Panthère 22mm (acier/or, quartz) : la délicate intemporelle. Boîtier 22mm acier ou or jaune, lunette polygonale fine. Mouvement quartz 2 ans autonomie. ~2 800–4 200€ (acier), ~15 000–22 000€ (or). Cadran blanc ou argent léger. Très féminin, poignets délicats. Bracelet cuir ou acier fin QuickSwitch. References W25014B6, WGPN0008. Porté discret, élégance minimaliste.`,
        `Cartier Panthère 22mm (steel/gold, quartz): the delicate timeless piece. 22mm stainless steel or yellow gold case, fine polygonal bezel. Quartz movement 2-year reserve. ~€2,800–4,200 (steel), ~€15,000–22,000 (gold). Light white or silver dial. Very feminine, delicate wrists. Fine leather or steel QuickSwitch bracelet. References W25014B6, WGPN0008. Discreet wear, minimalist elegance.`
      );} },

    // DRIVE COLLECTION
    { id:'cartier_drive_auto', kw:['drive automatique','drive acier','drive coussin','drive auto','cartier drive mouvement'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Drive de Cartier'; return t(
        `Cartier Drive de Cartier (41mm, acier, cal. 1904 MC) : l'outil coussin élégant. Boîtier 41mm acier inoxydable, forme coussin bombée caractéristique. Mouvement automatique 40h réserve, 100m étanchéité. ~7 500–9 000€ neuf. Cadran bleu, gris ou blanc, aiguilles épées. Bracelet cuir alligator ou acier QuickSwitch. Références W2DV0010 (acier). Design intemporel depuis 2010, très demandé second marché.`,
        `Cartier Drive de Cartier (41mm, steel, cal. 1904 MC): the elegant cushion tool. 41mm stainless steel case, characteristic domed cushion shape. Automatic movement 40-hour reserve, 100m water resistance. ~€7,500–9,000 new. Blue, gray or white dial, sword hands. Alligator leather or QuickSwitch steel bracelet. References W2DV0010 (steel). Timeless design since 2010, highly sought secondary market.`
      );} },

    { id:'cartier_drive_moon', kw:['drive phases lune','drive moon phases','drive lune','drive astronomique','cartier drive calendar'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Drive de Cartier Moon Phases'; return t(
        `Cartier Drive de Cartier Phases Lune (41mm, acier/or, cal. 1904 MC phases) : complexité élégante. Boîtier acier ou or jaune, forme coussin. Mouvement automatique phases lune intégrées. ~12 000–15 000€ (acier), ~55 000–70 000€ (or). Cadran argenté ou bleu, affichage lune en haut. Rare, collection spécialisée Cartier. Bracelet cuir premium alligator. Disponibilité boutique limitée.`,
        `Cartier Drive de Cartier Moon Phases (41mm, steel/gold, cal. 1904 MC phases): elegant complexity. Steel or yellow gold case, cushion shape. Automatic movement with integrated moon phases. ~€12,000–15,000 (steel), ~€55,000–70,000 (gold). Silver or blue dial, moon display at top. Rare, Cartier specialized collection. Premium alligator leather bracelet. Limited boutique availability.`
      );} },

    // ROTONDE COLLECTION
    { id:'cartier_rotonde_skeleton', kw:['rotonde skeleton','rotonde squelette','rotonde ajourée','rotonde transparent','cartier rotonde ajouré'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde de Cartier Skeleton'; return t(
        `Cartier Rotonde de Cartier Squelette (42mm, acier/or, cal. 9611 MC) : ronde haute horlogerie. Boîtier 42mm acier inoxydable ou or rose 18ct, mouvement squelettisé visible 360°. Mouvement automatique 40h réserve, 100m étanchéité. ~20 000–25 000€ (acier), ~65 000–85 000€ (or rose). Cadran squelettisé exposant roues et balancier. Bracelet cuir alligator cartier premium. Référence W1556209. Collection horologère, pièce de conversation.`,
        `Cartier Rotonde de Cartier Skeleton (42mm, steel/gold, cal. 9611 MC): round haute horlogerie. 42mm stainless steel or 18ct rose gold case, 360° visible skeletonized movement. Automatic movement 40-hour reserve, 100m water resistance. ~€20,000–25,000 (steel), ~€65,000–85,000 (rose gold). Skeletonized dial exposing wheels and balance. Premium Cartier alligator leather bracelet. Reference W1556209. Horological collection, conversation piece.`
      );} },

    { id:'cartier_rotonde_repeater', kw:['rotonde minute repeater','rotonde sonnerie','rotonde repeater','rotonde carillon','cartier rotonde minute'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Minute Repeater'; return t(
        `Cartier Rotonde de Cartier Sonnerie Minute (45mm, or rose, cal. 9410 MC) : la complication ultime. Boîtier 45mm or rose 18ct, mouvement sonnerie minute mécanique. Mouvement automatique haute horlogerie 50h réserve. 100m étanchéité. ~120 000–150 000€ neuf. Cadran bleu nuit, aiguilles or rose. Très rarement proposé, collection hautement spécialisée Cartier. Pièce de manufacture, production limitée annuelle.`,
        `Cartier Rotonde de Cartier Minute Repeater (45mm, rose gold, cal. 9410 MC): the ultimate complication. 45mm 18ct rose gold case, mechanical minute repeater chiming. High horological automatic movement 50-hour reserve. 100m water resistance. ~€120,000–150,000 new. Midnight blue dial, rose gold hands. Rarely offered, highly specialized Cartier collection. Manufacture piece, limited annual production.`
      );} },

    { id:'cartier_rotonde_tourbillon', kw:['rotonde tourbillon','rotonde astrotourbillon','rotonde chrono tourbillon','cartier rotonde tourbillon'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Astrotourbillon'; return t(
        `Cartier Rotonde de Cartier Astrotourbillon (45mm, platine, cal. 9450 MC) : la rotation perpétuelle. Boîtier 45mm platine Cartier, tourbillon équilibrant visible à 6h. Mouvement automatique 9450 MC 50h réserve. 100m étanchéité. ~85 000–110 000€ neuf. Cadran bleu ou noir, échappement visible. Bracelet cuir alligator noir couture cartier. Référence W1580050. Pièce haute manufacture, port exclusif.`,
        `Cartier Rotonde de Cartier Astrotourbillon (45mm, platinum, cal. 9450 MC): perpetual rotation. 45mm Cartier platinum case, balancing tourbillon visible at 6 o'clock. Automatic 9450 MC movement 50-hour reserve. 100m water resistance. ~€85,000–110,000 new. Blue or black dial, visible escapement. Black Cartier-stitched alligator leather bracelet. Reference W1580050. High manufacture piece, exclusive wear.`
      );} },

    { id:'cartier_rotonde_perpetual', kw:['rotonde calendrier perpétuel','rotonde perpetual calendar','rotonde perpetuelle','cartier rotonde complex'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Perpetual Calendar'; return t(
        `Cartier Rotonde de Cartier Calendrier Perpétuel (45mm, platine, cal. 9420 MC) : les 128 ans programmées. Boîtier 45mm platine, calendrier mécanique perpétuel sans correction humaine jusqu'à 2100. Mouvement automatique 50h réserve, 100m étanchéité. ~95 000–125 000€ neuf. Cadran bleu roi, affichage date/mois/lune. Bracelet cuir alligator premium. Référence W1580052. Horlogerie suprême, pièce patrimoine.`,
        `Cartier Rotonde de Cartier Perpetual Calendar (45mm, platinum, cal. 9420 MC): 128 years programmed. 45mm platinum case, mechanical perpetual calendar requiring no human correction until 2100. Automatic movement 50-hour reserve, 100m water resistance. ~€95,000–125,000 new. Royal blue dial, date/month/moon display. Premium alligator leather bracelet. Reference W1580052. Supreme horology, heritage piece.`
      );} },

    // OTHER COLLECTIONS
    { id:'cartier_cle_40', kw:['clé 40','cle 40','cartier cle','cle couronne clé','cartier clé automatique','cle key crown'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Clé de Cartier 40'; return t(
        `Cartier Clé de Cartier 40mm (acier/or, cal. 1904 MC) : la couronne-clé révolutionnaire. Boîtier 40mm acier ou or jaune, couronne en forme de clé octogonale brevetée. Mouvement automatique 40h réserve, 100m étanchéité. ~8 000–10 000€ (acier), ~42 000–55 000€ (or). Cadran bleu/noir/argent, affichage classique. Bracelet QuickSwitch acier ou cuir. Références W2CL0002 (acier), WGCL0002 (or). Innovation design 2021, très recherchée collectors.`,
        `Cartier Clé de Cartier 40mm (steel/gold, cal. 1904 MC): the revolutionary key-shaped crown. 40mm stainless steel or yellow gold case, patented octagonal key-shaped crown. Automatic movement 40-hour reserve, 100m water resistance. ~€8,000–10,000 (steel), ~€42,000–55,000 (gold). Blue/black/silver dial, classic display. QuickSwitch steel or leather bracelet. References W2CL0002 (steel), WGCL0002 (gold). 2021 design innovation, highly sought by collectors.`
      );} },

    { id:'cartier_ronde_solo', kw:['ronde solo','ronde simple','ronde classique','ronde cartier','cartier ronde montre'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ronde Solo'; return t(
        `Cartier Ronde Solo de Cartier (36mm, acier/or, cal. 1904 MC) : la rond pure. Boîtier 36mm acier inoxydable ou or jaune, forme ronde classique. Mouvement automatique 40h réserve, 100m étanchéité. ~6 500–8 000€ (acier), ~35 000–45 000€ (or). Cadran blanc, index romains appliqués. Bracelet cuir alligator noir ou acier QuickSwitch. Références W2RN0002 (acier), WGRN0002 (or). Classicisme intemporel, collection discrète.`,
        `Cartier Ronde Solo de Cartier (36mm, steel/gold, cal. 1904 MC): the pure round. 36mm stainless steel or yellow gold case, classical round shape. Automatic movement 40-hour reserve, 100m water resistance. ~€6,500–8,000 (steel), ~€35,000–45,000 (gold). White dial, applied Roman indices. Black alligator leather or QuickSwitch steel bracelet. References W2RN0002 (steel), WGRN0002 (gold). Timeless classicism, discreet collection.`
      );} },

    { id:'cartier_masse_mysterieuse', kw:['masse mystérieuse','mystery movement','mouvement mystère','cartier mystère 2022','rotating mystery'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Masse Mystérieuse'; return t(
        `Cartier Masse Mystérieuse de Cartier (45mm, or rose, cal. 9919 MC) : l'innovation révolutionnaire 2022. Boîtier 45mm or rose 18ct, aiguilles tournant en lévitation optique (vrai mécanisme horloger). Mouvement 9919 MC 40h réserve. 100m étanchéité. ~55 000–75 000€ neuf. Cadran intégralement transparent, mécanisme apparent. Innovation horlogère mondiale unique à Cartier. Bracelet cuir alligator premium. Très recherchée collectionneurs modernes.`,
        `Cartier Masse Mystérieuse de Cartier (45mm, rose gold, cal. 9919 MC): the revolutionary 2022 innovation. 45mm 18ct rose gold case, hands rotating in optical levitation (true watchmaking mechanism). 9919 MC movement 40-hour reserve. 100m water resistance. ~€55,000–75,000 new. Fully transparent dial, visible mechanism. Unique worldwide watchmaking innovation only at Cartier. Premium alligator leather bracelet. Highly sought by modern collectors.`
      );} },

    { id:'cartier_privee', kw:['privée collection','cartier privee','privee reissue','privee revisited','cartier heritage revisited'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Cartier Privée'; return t(
        `Cartier Collection Privée : archives revisitées (années 2010-2024). Éditions limitées réinterprétant les archives Cartier 1920-1980. Boîtiers acier ou or jaune 18ct, mouvements Cartier 1904-9611 MC. ~8 000–25 000€ selon modèle/année. Chaque pièce numérotée, étui presentation heritage Cartier. Exemples récents : Ronde Revisitée 1940, Santos Dumont 1927. Très recherchée collectors patrimoine. Disponibilité boutique exclusive, avant-vente abonnés.`,
        `Cartier Privée Collection: revisited archives (2010-2024). Limited editions reinterpreting Cartier archives 1920-1980. Stainless steel or 18ct yellow gold cases, Cartier 1904-9611 MC movements. ~€8,000–25,000 depending on model/year. Each numbered piece, heritage presentation case. Recent examples: 1940 Ronde Revisited, 1927 Santos Dumont. Highly sought by heritage collectors. Exclusive boutique availability, subscriber pre-sales.`
      );} },

    { id:'cartier_baignoire', kw:['baignoire','baignoire ovale','baignoire 1912','cartier baignoire ovale','baignoire or'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Baignoire'; return t(
        `Cartier Baignoire (40.55 x 28.6mm, acier/or, cal. 1904 MC) : l'ovale fondateur 1912. Boîtier acier inoxydable ou or jaune, forme ovale signature depuis création. Mouvement automatique 40h réserve, 30m étanchéité. ~7 500–9 500€ (acier), ~38 000–48 000€ (or). Cadran blanc email ou bleu, chiffres romains. Bracelet cuir alligator cartier noir. Référence W2BA0005 (acier contemporain). Pièce patrimoine, unisexe elegant.`,
        `Cartier Baignoire (40.55 x 28.6mm, steel/gold, cal. 1904 MC): the foundational oval 1912. Stainless steel or yellow gold case, signature oval shape since creation. Automatic movement 40-hour reserve, 30m water resistance. ~€7,500–9,500 (steel), ~€38,000–48,000 (gold). White enamel or blue dial, Roman numerals. Black Cartier alligator leather bracelet. Reference W2BA0005 (contemporary steel). Heritage piece, elegant unisex.`
      );} },

    { id:'cartier_tonneau', kw:['tonneau','tonneau barrel','tonneau historique','cartier tonneau forme','tonneau vintage cartier'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tonneau'; return t(
        `Cartier Tonneau de Cartier (38 x 30mm, or rose, cal. 1904 MC) : la forme tonneau rare historique. Boîtier or rose 18ct, boîtier barillet caractéristique. Mouvement automatique 40h réserve, 30m étanchéité. ~45 000–58 000€ neuf (or rose). Cadran argenté ou bleu, aiguilles épées or rose. Bracelet cuir alligator marron cartier. Édition contemporaine 2023 très limitée. Collection heritage, relaunch patrimoine après 30 ans absence.`,
        `Cartier Tonneau de Cartier (38 x 30mm, rose gold, cal. 1904 MC): the rare historical barrel shape. 18ct rose gold case, characteristic barrel shape. Automatic movement 40-hour reserve, 30m water resistance. ~€45,000–58,000 new (rose gold). Silver or blue dial, rose gold sword hands. Brown Cartier alligator leather bracelet. 2023 contemporary limited edition. Heritage collection, heritage relaunch after 30 years absence.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // SANTOS EXPANDED — Modern & Vintage Heritage Icons
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_santos_100', kw:['santos 100','santos 100 xl','santos large discontinued','vintage santos large','cartier santos large','santos 100 automatic','santos 100 dress'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos 100 XL'; return t(
        `Santos réf. WGSA0006 (37mm acier/or, cadran blanc). Mouvement automatique Cartier calibre 049. Édition plus grande Santos discontinuée. Marché 5 000–8 000€. Modèle transition prestige.`,
        `Santos ref. WGSA0006 (37mm steel/gold, white dial). Cartier automatic caliber 049. Larger discontinued Santos edition. Market: €5,000–8,000. Prestige transition model.`
      );} },

    { id:'cartier_santos_galbee', kw:['santos galbee','galbee 1978','vintage santos galbee','cartier galbee classic','classic santos galbee','galbee original','santos 1970s'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Galbée Classic 1978'; return t(
        `Santos Galbée réf. 1560 (37mm acier, cadran blanc). Mouvement quartz Cartier original 1978. Lignes épurées Galbée signature. Très recherché vintage. Marché 4 000–7 000€ selon état. Icône Cartier habillée.`,
        `Santos Galbée ref. 1560 (37mm steel, white dial). Original 1978 Cartier quartz movement. Signature Galbée clean lines. Highly sought vintage. Market: €4,000–7,000 depending on condition. Dressed Cartier icon.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // TANK EXPANDED — Manual & Automatic Variants
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_tank_solo_large', kw:['tank solo xl','tank solo large','tank solo automatic large','tank solo oversize','tank xl automatic','tank large automatic'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Solo XL Automatic'; return t(
        `Tank Solo réf. W5200027 (33mm acier, cadran blanc). Mouvement automatique Cartier manufacture. Version XL automatique prestige. Marché 4 500–7 000€. Montre élégante quotidienne.`,
        `Tank Solo ref. W5200027 (33mm steel, white dial). Cartier manufacture automatic movement. Prestige XL automatic version. Market: €4,500–7,000. Elegant daily watch.`
      );} },

    { id:'cartier_tank_basculante', kw:['tank basculante','reversible tank','flipping case cartier','tank reversible','cartier reversible tank','basculante automatic','flip case tank'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Basculante Reversible'; return t(
        `Tank Basculante réf. W1018655 (36mm acier, cadran blanc). Mouvement automatique Cartier. Boîtier basculant réversible Cartier signature. Très rare vintage. Marché 6 000–10 000€. Montre réversible unique.`,
        `Tank Basculante ref. W1018655 (36mm steel, white dial). Cartier automatic movement. Signature reversible flip case. Very rare vintage. Market: €6,000–10,000. Unique reversible watch.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // BALLON BLANC — Ladies Elegant Collection
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_ballon_blanc', kw:['ballon blanc','ballon blanc 30mm','cartier ballon ladies','ballon diamants','ballon diamond ladies','white balloon','diamond set ballon'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Blanc 30mm Diamond'; return t(
        `Ballon Blanc réf. WE902067 (30mm acier/diamants, cadran blanc). Mouvement quartz Cartier. Boîtier rond gracieux diamants/brillants. Montre féminine luxe Cartier. Marché 5 000–9 000€. Prestige dames.`,
        `Ballon Blanc ref. WE902067 (30mm steel/diamonds, white dial). Cartier quartz movement. Graceful round case diamonds/brilliants. Luxury Cartier ladies watch. Market: €5,000–9,000. Ladies prestige.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // PASHA VARIANTS — Sport Diver Models
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_pasha_seatimer', kw:['pasha seatimer','pasha diver','pasha diving watch','seatimer diver','cartier diving pasha','underwater pasha','pasha water sports'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha SeaTimer Diver'; return t(
        `Pasha SeaTimer réf. W31077M7 (42mm acier, cadran bleu). Mouvement automatique Cartier. Montre plongée sports Cartier 300m. Très rare modèle plongeur. Marché 4 000–7 000€. Collection sports aquatiques.`,
        `Pasha SeaTimer ref. W31077M7 (42mm steel, blue dial). Cartier automatic movement. Cartier diving sports watch 300m. Very rare diver model. Market: €4,000–7,000. Water sports collection.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // HAUTE HORLOGERIE SKELETONS — Mechanical Masterworks
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_crash_skeleton', kw:['crash skeleton','cartier crash skeleton','crash skeletonized','mechanical crash','crash transparent','skeleton crash watch','crash transparent case'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Crash Skeleton Limited'; return t(
        `Crash Skeleton réf. W10109X6 (44mm platine, transparent squelette). Mouvement mécanique Cartier squelette visible. Édition limitée Crash legendaire. Marché 15 000–25 000€. Collection haute horlogerie Cartier.`,
        `Crash Skeleton ref. W10109X6 (44mm platinum, transparent skeleton). Cartier mechanical skeleton movement visible. Limited legendary Crash edition. Market: €15,000–25,000. Cartier haute horlogerie collection.`
      );} },

    { id:'cartier_tank_cintree_skeleton', kw:['tank cintree skeleton','cintree skeleton','tank cintree skeletonized','curved tank skeleton','skeleton tank cintree','transparent curved case'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Cintrée Skeleton'; return t(
        `Tank Cintrée Skeleton réf. W1535851 (45.5×27.4mm platine, squelette transparent). Mouvement mécanique squelette Cartier. Lignes courbes signature Tank Cintrée. Très rare. Marché 12 000–20 000€. Complication mécanique dress.`,
        `Tank Cintrée Skeleton ref. W1535851 (45.5×27.4mm platinum, transparent skeleton). Cartier mechanical skeleton movement. Signature Tank Cintrée curved lines. Very rare. Market: €12,000–20,000. Dress mechanical complication.`
      );} },

    { id:'cartier_santos_dumont_skeleton', kw:['santos dumont skeleton','dumont skeleton','santos skeleton','skeleton micro-rotor','transparent dumont','santos-dumont skeletonized'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos-Dumont Skeleton Micro-Rotor'; return t(
        `Santos-Dumont Skeleton réf. W2SA0007 (43.5mm platine, squelette micro-rotor). Mouvement mécanique manifestation horlogerie Santos-Dumont. Rotor micro-squelette visible. Très rare prestige. Marché 14 000–22 000€. Montre pilote prestige.`,
        `Santos-Dumont Skeleton ref. W2SA0007 (43.5mm platinum, skeleton micro-rotor). Santos-Dumont mechanical movement showcase. Micro-skeleton visible rotor. Very rare prestige. Market: €14,000–22,000. Prestige pilot watch.`
      );} },

    { id:'cartier_revelation', kw:['revelation','cartier revelation','revelation perles','revelation gold beads','revelation perles or','revelation haute joaillerie','beaded revelation'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Révélation Gold Beads'; return t(
        `Révélation réf. HPI00704 (42mm or rose, perles or). Mouvement mécanique Cartier perles dorées cachées sous sapphire. Concept révélation Cartier joaillerie. Ultra-rare. Marché 18 000–28 000€. Art haute joaillerie-horlogerie.`,
        `Révélation ref. HPI00704 (42mm rose gold, gold beads). Cartier mechanical movement with hidden gold beads under sapphire. Cartier revelation jewelry concept. Ultra-rare. Market: €18,000–28,000. High jewelry-watchmaking art.`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // CLASSICS — Collector Heritage Icons
    // ──────────────────────────────────────────────────────────────────────────

    { id:'cartier_must_21', kw:['must 21','must 21 cartier','cartier must vintage','must 21 1990s','vintage must 21','quartz must 21','must classic'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Must 21 1990s Classic'; return t(
        `Must 21 réf. W10009T7 (37mm acier plaqué, cadran bleu). Mouvement quartz Cartier 1990s. Montre iconique accessible Cartier années 1990. Très recherchée vintage. Marché 2 500–5 000€. Classique Cartier quotidien.`,
        `Must 21 ref. W10009T7 (37mm plated steel, blue dial). 1990s Cartier quartz movement. Iconic accessible Cartier 1990s watch. Highly sought vintage. Market: €2,500–5,000. Daily Cartier classic.`
      );} },

    { id:'cartier_cougar', kw:['cougar','cartier cougar','cougar 1980s','cougar vintage','sporty cougar','quartz cougar','1980s cartier sports'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Cougar 1980s Sports'; return t(
        `Cougar réf. 887 (31.5mm acier, cadran noir). Mouvement quartz Cartier années 1980. Montre sportive Cartier rétro-vintage. Design carré-rond années 1980 signature. Marché 2 000–4 500€. Pièce rétro prestige.`,
        `Cougar ref. 887 (31.5mm steel, black dial). 1980s Cartier quartz movement. Retro-vintage Cartier sports watch. Signature 1980s square-round design. Market: €2,000–4,500. Prestige retro piece.`
      );} },

    { id:'cartier_roadster', kw:['roadster','cartier roadster','roadster discontinued','vintage roadster','roadster collector','classic roadster','discontinued roadster favorite'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Roadster Discontinued Favorite'; return t(
        `Roadster réf. W62015V7 (43.5mm acier, cadran noir rectangulaire). Mouvement automatique Cartier. Montre sportive Roadster légendaire discontinuée. Ultra-recherchée collecteurs. Marché 4 500–8 000€. Icône automobile Cartier.`,
        `Roadster ref. W62015V7 (43.5mm steel, rectangular black dial). Cartier automatic movement. Legendary discontinued Roadster sports watch. Ultra-sought by collectors. Market: €4,500–8,000. Cartier automotive icon.`
      );} },

    { id:'ap_offshore_lady', kw:['offshore lady','ap femme offshore','26048sk','offshore diamants','royal oak offshore femme','lady offshore','offshore 37','offshore 38 femme'],
      r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Offshore Lady'; const s=STOCK.filter(w=>w.ref==='26048SK'); return t(
        `${s.length ? `En stock : ${s.map(w=>`${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join(', ')}` : 'Royal Oak Offshore Lady Diamants réf. 26048SK : ~22 000–26 000€ marché'}. Boîtier acier inoxydable, lunette diamants, 37mm.`,
        `${s.length ? `In stock: ${s.map(w=>`${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join(', ')}` : 'Royal Oak Offshore Lady Diamonds ref. 26048SK: ~€22,000–26,000 market'}. Stainless steel case, diamond bezel, 37mm.`
      );} },

    { id:'patek_7010', kw:['7010','7010r','7010r/011','patek 7010','complications patek femme','patek femme complications','patek complications or rose'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='7010R/011'); return t(
        `Patek Complications réf. **7010R/011** : ${w?fmt(w.price):'~50 000–55 000€ marché'}. Or rose 18ct, 29mm, mouvement mécanique à remontage automatique, lunette diamants.`,
        `Patek Complications ref. **7010R/011**: ${w?fmt(w.price):'~€50,000–55,000 market'}. 18ct rose gold, 29mm, automatic mechanical movement, diamond bezel.`
      );} },

    { id:'language_switch', kw:['en anglais','in english','switch to english','parlez vous anglais','do you speak english','english please','switch language','changer langue','francais','en français'],
      r:()=>t(
        `Je réponds dans votre langue automatiquement. Écrivez en anglais et je réponds en anglais, en français pour le français.`,
        `I automatically respond in your language. Write in English and I'll reply in English, in French for French.`
      ) },

    { id:'entretien_rolex_page', kw:['entretien rolex page','conseils entretien rolex','rolex maintenance page','rolex care page','lire entretien rolex','entretien rolex site'],
      r:()=>t(
        `Consultez notre guide complet : [Entretien de votre Rolex](/entretien-montre-Rolex.html). Nettoyage, stockage, révision — tout y est détaillé.`,
        `See our full guide: [Rolex Watch Care](/entretien-montre-Rolex.html). Cleaning, storage, servicing — all covered in detail.`
      ) },

    { id:'reparation_page', kw:['réparation rolex page','repair rolex page','reparation page','service page rolex','rolex repair paris','réparation paris rolex'],
      r:()=>t(
        `Notre atelier de réparation Rolex à Paris : [Réparation Rolex Paris](/reparation-Rolex-Paris.html). Devis gratuit sur demande.`,
        `Our Rolex repair workshop in Paris: [Rolex Repair Paris](/reparation-Rolex-Paris.html). Free quote on request.`
      ) },

    { id:'legal_mentions', kw:['mentions légales','legal notice','cgv','conditions générales','terms conditions','privacy','confidentialité','données personnelles','rgpd','gdpr','politique confidentialité'],
      r:()=>t(
        `Nos mentions légales et politique de confidentialité sont disponibles sur [cette page](/mentions-legales.html).`,
        `Our legal notices and privacy policy are available on [this page](/mentions-legales.html).`
      ) },

    { id:'appointment_online', kw:['rendez vous en ligne','online appointment','book online','réserver en ligne','formulaire rdv','prendre rdv en ligne','prendre rendez vous en ligne','formulaire prise de rdv'],
      r:()=>t(
        `Prenez rendez-vous directement via notre [formulaire en ligne](/prendre-rendez-vous.html) — rapide, disponible 24h/24.`,
        `Book directly via our [online form](/prendre-rendez-vous.html) — quick, available 24/7.`
      ) },

    { id:'rolex_steel_grade', kw:['904l','acier rolex','rolex steel','316l vs 904l','oystersteel','qualité acier rolex','rolex acier inoxydable','steel grade rolex','why rolex steel different'],
      r:()=>t(
        `Rolex utilise l'Oystersteel (acier 904L) depuis 1988, plus résistant à la corrosion que l'acier 316L standard. Plus difficile à usiner, donc plus coûteux — mais brille plus longtemps.`,
        `Rolex uses Oystersteel (904L steel) since 1988, more corrosion-resistant than standard 316L. Harder to machine, hence more costly — but stays shinier longer.`
      ) },

    { id:'ap_ceramic_bezel', kw:['lunette céramique','ceramic bezel','céramique ap','ap céramique','offshore céramique','céramique noire','black ceramic','lunette ap','bezel ap','ap bezel material'],
      r:()=>t(
        `Les lunettes céramique d'AP (Royal Oak Offshore Chronographe) sont fraisées dans un bloc de céramique brute, polies sur certaines facettes. Inrayable, mais cassante si choc violent.`,
        `AP's ceramic bezels (Royal Oak Offshore Chrono) are milled from raw ceramic, polished on select facets. Scratch-proof, but can chip under a hard impact.`
      ) },

    { id:'patek_seal', kw:['patek seal','poinçon genève','hallmark','genève poinçon','patek quality seal','patek finissage','finishing patek','patek anglage','côtes de genève','bevelling patek'],
      r:()=>t(
        `Patek Philippe possède son propre Poinçon (depuis 2009), supérieur au Poinçon de Genève. Chaque pièce est décorée à la main : côtes de Genève, anglage, polissage miroir des surfaces.`,
        `Patek Philippe has its own Seal (since 2009), surpassing the Geneva Seal. Every piece is hand-finished: Geneva stripes, bevelling, mirror-polished surfaces.`
      ) },

    { id:'rolex_green_tag', kw:['étiquette verte','green tag rolex','rolex green tag','hologram rolex','hologramme','sticker rolex','rolex tag','caseback sticker','rolex certification','carte verte rolex'],
      r:()=>t(
        `L'étiquette verte (depuis 2007 sur les Rolex récentes) est un hologramme de sécurité sur le fond du boîtier. Elle ne doit jamais être retirée — son absence réduit la valeur de revente.`,
        `The green tag (since 2007 on modern Rolex) is a security hologram on the caseback. It should never be removed — its absence reduces resale value.`
      ) },

    { id:'revision_cost', kw:['prix révision','coût révision','tarif révision','combien coûte révision','combien service','how much service cost','how much overhaul','révision prix rolex','révision prix ap','full service price','service cost'],
      r:()=>t(
        `Les tarifs varient selon le modèle et l'état. Contactez-nous pour un devis précis. Une révision complète inclut démontage, nettoyage, lubrification, remplacement joints et test étanchéité.`,
        `Prices vary by model and condition. Contact us for an accurate quote. A full service includes disassembly, cleaning, lubrication, gasket replacement and water resistance test.`
      ) },

    { id:'nos_montres_reviews', kw:['avis','reviews','google avis','trustpilot','témoignages','testimonials','que disent les clients','what do customers say','fiable','reliable','boutique fiable','sérieux','serious','reputation'],
      r:()=>t(
        `Nous avons plus de 15 ans d'expérience et des centaines de clients satisfaits. Consultez nos avis Google pour vous faire une idée ou contactez-nous directement.`,
        `We have over 15 years of experience and hundreds of satisfied clients. Check our Google reviews for an impression, or contact us directly.`
      ) },

    { id:'entretien_quotidien_rolex', kw:['nettoyer rolex','clean my rolex','rolex nettoyage','bracelet rolex nettoyage','clean rolex bracelet','brosse rolex','savon rolex','clean jubilee bracelet','nettoyer jubilé','nettoyer oyster'],
      r:()=>t(
        `Pour nettoyer votre Rolex : eau tiède + brosse douce (interdentaire idéale) pour le bracelet, chiffon microfibre sec pour le boîtier. Évitez savons parfumés et jets haute pression.`,
        `To clean your Rolex: warm water + soft brush (interdental works well) for the bracelet, dry microfibre cloth for the case. Avoid scented soaps and high-pressure jets.`
      ) },

    { id:'social_media', kw:['instagram','facebook','tiktok','youtube','réseaux sociaux','social media','follow','suivre','compte instagram','profil','linkedin','twitter','x'],
      r:()=>t(
        `Suivez-nous sur Instagram pour découvrir nos nouvelles arrivées en exclusivité. Contactez-nous pour le lien.`,
        `Follow us on Instagram to discover our new arrivals exclusively. Contact us for the link.`
      ) },

    
{ id:'guide_first_rolex', kw:['first Rolex','which model','beginner guide'],
  r:()=>{ ctx.brand='Rolex'; ctx.type='Educational'; return t(
    `FR: Choisir sa premiere Rolex est une decision majeure qui determine la trajectoire collectrice. Les trois candidats principaux: Submariner (tool watch legendaire, 100+ annees heritage, icone James Bond), Datejust (elegance classique pour tous contextes, premiere vraie montre de luxe), Oyster Perpetual (entree budget, acier seul, excellent starter). Submariner convient aux collecteurs sport-tech recherchant polyvalence eau/montagne. Datejust cible cadres professionnels elegant, differentes tailles 36/41/42mm, configurable acier/or selon budget. Oyster Perpetual offre qualité Rolex absolute au prix minimum - excellente introduction sans compromis horloger. Listes d'attente: Submariner 3-5 ans, Datejust 1-3 ans, Oyster Perpetual moins d'1 an généralement. Budget acier: €4,500-€8,000. Budget or: €15,000-€35,000+. Secret: les couleurs cadran (bleu, noir, argent) affectent desirabilitee et listes d'attente significativement. Submariner noir plus demande que bleu. Datejust gris très recherche actuellement. Conseil: debuter avec montre vous voulant vraiment porter quotidiennement, pas investissement pur - appreciation vient naturellement avec temps.`,
    `EN: Selecting your first Rolex represents a pivotal decision shaping your entire collecting trajectory. Three primary candidates: Submariner (legendary tool-watch, 100+ year heritage, James Bond icon), Datejust (classical elegance across all contexts, first true luxury watch), Oyster Perpetual (budget entry point, steel-only, exceptional starter). Submariner suits sport-tech collectors seeking water/mountain versatility. Datejust targets elegant professionals; multiple sizes (36/41/42mm) and material options (steel/gold) match budgets. Oyster Perpetual delivers absolute Rolex quality at minimum price point—excellent introduction without horological compromise. Waiting lists: Submariner 3-5 years, Datejust 1-3 years, Oyster Perpetual typically under 1 year. Budget steel: USD 4,000-USD 7,500. Budget gold: USD 14,000-USD 32,000+. Secret: dial colors (blue, black, silver) significantly affect desirability and waiting times. Submariner black more pursued than blue. Datejust grey highly sought currently. Advice: begin with a watch you genuinely want wearing daily, not pure investment—appreciation follows naturally over time.`
  );} },

{ id:'guide_first_ap', kw:['first Audemars Piguet','Royal Oak','which reference'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.type='Educational'; return t(
    `FR: La premiere Audemars Piguet devrait etre Royal Oak 15500ST acier (champion absolut depuis 2012), pas Offshore (trop sport), pas Code 11.59 (divisif design). Royal Oak 15500ST 41mm offre octagon legendaire depuis 1972, calibre 4302 ultra-fiable (70h reserve, chronometer), bracelet integré iconic reconnaissable instantanement globalement. Size 41mm domine actuellement - 36mm moins demande. Cadrans: bleu gradient TRES recherche actuellement, noir solide, gris gradient moderne. Liste d'attente terrible: 3-5 ans generalement meme chez revendeurs riches. Secret: gris et bleu moins demandes que noir - tenter ces couleurs pour liste d'attente courte. Offshore attire collecteurs "statement sportif" cherchant esthetique moderne extreme - moins heritage, plus techno-materiel. Code 11.59 propose design futuriste controversé - certains adorent, certains detestent (eviter si vous ne etes pas tres convaincu). Budget Royal Oak 15500ST acier: €26,500. Conseil: Royal Oak est montre "lifetime acquisition" - achetez le model et la couleur que vous aimerez porter TOUJOURS, pas speculation.`,
    `EN: Your first Audemars Piguet should be Royal Oak 15500ST steel (absolute champion since 2012 redesign), not Offshore (too aggressively sporty), not Code 11.59 (divisive design). Royal Oak 15500ST 41mm showcases the legendary octagon since 1972, relies on ultra-reliable caliber 4302 (70-hour PR, chronometer), and features the iconic integrated bracelet recognized globally instantly. The 41mm size dominates currently—36mm less pursued. Dials: blue gradient highly sought currently, black solid classic, grey gradient contemporary-modern. Waiting lists brutal: 3-5 years typically even among wealthy dealers. Secret: grey and blue dials shorter waiting lists than black—try these for quicker acquisition. Offshore appeals to "statement sport" collectors seeking extreme modern aesthetics—less heritage, more techno-material innovation. Code 11.59 offers controversial futuristic design—some love, many despise (avoid unless thoroughly convinced). Budget Royal Oak 15500ST steel: USD 24,000. Advice: Royal Oak is lifetime-ownership watch—buy the size/color you'll wear forever, not speculation.`
  );} },

{ id:'guide_first_patek', kw:['first Patek Philippe','Nautilus wait','Aquanaut entry'],
  r:()=>{ ctx.brand='Patek Philippe'; ctx.type='Educational'; return t(
    `FR: Premiere Patek Philippe pose dilemma budget: Nautilus 5711A acier (montre reine iconique mais 5-8 ans liste d'attente, €38,500+) vs Aquanaut 5167A acier (plus accessible, 2-3 ans attente, €18,500) vs Calatrava 5226G (elegance formelle, moins demande, €16,500). Nautilus: symbol prestige absolut, integre depuis 1976, reste tres demande. Aquanaut: polyvalence excellente, bracelet composite unique, moins heritage que Nautilus mais plus "cool" design moderne. Calatrava: montre formelle classique, appreciation historique solide, zero liste d'attente generalement - achetez immediatement si possible. Budget: Aquanaut €18,500 (moins attente), Nautilus €38,500+ (TRES attente), Calatrava €16,500 (pas d'attente). Secret intelligence: Calatrava offre meilleur rapport qualite/attente - montre magnifique sans frustration listem d'attente eternelle. Certains collecteurs commencent Calatrava, puis Aquanaut, puis Nautilus 10 ans apres. Conseil: eviter achat gris-market (pas de garantie, risque authentication, dealers legitimates refusent service sans papers authentiques).`,
    `EN: Your first Patek Philippe poses a budget dilemma: Nautilus 5711A steel (iconic queen watch but 5-8 year waiting list, USD 35,000+) vs Aquanaut 5167A steel (more accessible, 2-3 year wait, USD 17,000) vs Calatrava 5226G (formal elegance, minimal demand, USD 15,000). Nautilus: absolute prestige symbol, integrated since 1976, perpetually in demand. Aquanaut: excellent versatility, unique composite bracelet, less heritage than Nautilus but more "cool" modern design. Calatrava: classical formal watch, solid appreciation history, zero waiting list typically—purchase immediately if possible. Budget: Aquanaut USD 17,000 (moderate wait), Nautilus USD 35,000+ (EXTREME wait), Calatrava USD 15,000 (no wait). Secret intelligence: Calatrava offers best quality/wait ratio—magnificent watch without eternal waiting frustration. Some collectors begin Calatrava, then Aquanaut, then Nautilus 10 years later. Advice: avoid grey-market purchase (no warranty, authentication risk, legitimate dealers refuse service without authentic papers).`
  );} },

{ id:'guide_investment', kw:['watches investment','value retention','secondary market'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Les montres de luxe comme investissement: realite objective. Montres acier sports Rolex (Submariner, GMT-Master II, Datejust) apprecient 10-15% annuellement quand neuves, se stabilisent puis apprecient 5-8% long-terme. Raison: demande outrageous superieure a production limitee Rolex deliberee. Autres marques (Omega, Tudor) ne retiennent pas valeur steel - Rolex seul. Patek Philippe: appreciation exceptionnelle 15-30% annuellement pour Nautilus/Aquanaut, plus haute pour Perpetual Calendar/complications rares. Raison: manufacturing ultra-limitee et heritage perpetuel. Audemars Piguet: appreciation 8-15% annuellement pour Royal Oak, moins predictable que Patek mais plus que Rolex acier. Richard Mille: appreciation speculative 20%+ mais extremement volatile, requier expertise. RISQUES MAJEURS: 1) Marche correction cyclique possible; 2) Nouvelles productions peuvent surtout inonder grey-market, deprimer valeurs; 3) Services coûteux (€3,000-€8,000 Rolex) impactent ownership total-cost; 4) Authentification faux montres en explosion. CONSEIL: Acheter montre que vous porterez quotidiennement PLUS appreciation naturelle - jamais speculer pur. Montres conservees dans boite sans port == destruction lente valeur (oxydation, batterie, mecanisme rouille).`,
    `EN: Luxury watches as investment: objective reality. Rolex steel sports watches (Submariner, GMT-Master II, Datejust) appreciate 10-15% annually when new, stabilize, then appreciate 5-8% long-term. Reason: outrageous demand exceeds Rolex's deliberately limited production. Other brands (Omega, Tudor) don't retain steel value—Rolex alone dominates. Patek Philippe: exceptional appreciation 15-30% annually for Nautilus/Aquanaut, higher for Perpetual Calendar/rare complications. Reason: ultra-limited manufacturing and perpetual heritage prestige. Audemars Piguet: 8-15% annual appreciation for Royal Oak, less predictable than Patek but higher than Rolex steel. Richard Mille: speculative appreciation 20%+ but extremely volatile, requires expertise. MAJOR RISKS: 1) Market correction possible cyclically; 2) New productions flooding grey-market may depress values; 3) Service costs (USD 2,700-USD 7,300 Rolex) impact total ownership cost; 4) Counterfeit authentication explosively increasing. ADVICE: Buy watches you'll wear daily PLUS natural appreciation—never pure speculation. Watches preserved in boxes unworn = slow value destruction (oxidation, battery, mechanism rust).`
  );} },

{ id:'guide_steel_vs_gold', kw:['steel vs gold watches','value retention','daily wear'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Acier vs or: le dilemme fondamental du collecteur. ACIER: resistance rayures inferieure (visible avec le temps), maintenance aisee, port quotidien sans culpabilite, appreciation value bonne (Rolex steel Submariner +10-15% annuellement), prix 50% moins couteux. Or jaune/rose: resistance rayures superieure (or plus mou = patine naturelle plutot que rayures nettes), maintenance intensive (polissage tous les 5 ans ~€800), port quotidien difficile (peur d'endommager prestige metal), appreciation value speculative (depend materialite or spot + demande). Or blanc: version "compromis" - resistance intermediate, maintenance moderate. VERDICT PRATIQUE: Acier ideal pour collector novice et sport-usage. Or convient collecteur expert pret entretien obsessif et port occasional formel. Rolex acier Submariner: €6,800 neuf, €8,500-€11,000 preowned 5-6 ans. Rolex or jaune Submariner: €32,000 neuf, €35,000-€45,000 preowned (appreciation limitee car or spot). SECRET: or blanc Rolex sous-evalue - moins demande que or jaune mais quality identique. Bonne opportunite acquisition.`,
    `EN: Steel vs gold: the fundamental collector dilemma. STEEL: lower scratch resistance (visible over time), easy maintenance, daily wear without guilt, good value appreciation (Rolex steel Submariner +10-15% annually), 50% cheaper. Yellow/rose gold: superior scratch resistance (gold softer = natural patina rather than visible scratches), intensive maintenance (polishing every 5 years ~USD 700), difficult daily wear (fear of damaging precious-metal prestige), speculative appreciation (depends on gold spot price + demand). White gold: "compromise" version—intermediate resistance, moderate maintenance. PRACTICAL VERDICT: Steel ideal for novice collectors and sport usage. Gold suits expert collectors ready for obsessive maintenance and formal-occasional wear. Rolex steel Submariner: USD 6,200 new, USD 7,700-USD 10,000 pre-owned 5-6 years. Rolex yellow-gold Submariner: USD 29,000 new, USD 32,000-USD 41,000 pre-owned (limited appreciation as gold spot-dependent). SECRET: Rolex white gold undervalued—less pursued than yellow gold but identical quality. Good acquisition opportunity.`
  );} },

{ id:'guide_automatic_vs_quartz', kw:['automatic movement','quartz watch','mechanical vs battery'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Mouvements automatiques vs quartz: la philosophie horlogere diverge radicalement. AUTOMATIQUE (remontage automatique): ressort moteur alimente oscillation balancier (frequence 28,800 vibrations/heure typiquement), precision typique 5-15 secondes/mois, reserve marche 40-72h selon calibre, necessite remontage manuel occasionnel si port discontinu, maintenance service tous 5-10 ans (~€2,000-€5,000), appreciation prestige collecteur (mecanisme visible = art horloger), vibration tactile poignee confere sensation authentique "mecanisme vivant". Rolex utilise automatique exclusivement. QUARTZ (batterie): oscillateur quartz frequence 32,768 Hz produit precision exceptionnelle 5-10 secondes/ANNEE, batterie remplacement ~€20-€50 tous 2-3 ans, zero maintenance horlogere, legere, economique, precise MAIS perception prestige inferieure (quartz = industriel, pas art). Seiko/Omega Seamaster proposent quartz. VERDICT: automatique pour collecteurs appriant mecanisme et heritage; quartz pour pragmatiques precision-prioritaires. Rolex refuse quartz volontairement - decision marketing prestige.`,
    `EN: Automatic vs quartz movements: radically divergent horological philosophies. AUTOMATIC (self-winding): mainspring powers oscillating balance wheel (typically 28,800 vibrations per hour), typical accuracy 5-15 seconds per month, power reserve 40-72 hours depending on caliber, requires occasional manual winding if worn discontinuously, service maintenance every 5-10 years (~USD 1,800-USD 4,500), collector prestige appreciation (visible mechanism = horological art), tactile vibration on wrist conveys genuine "living mechanism" sensation. Rolex uses automatic exclusively. QUARTZ (battery-powered): quartz oscillator at 32,768 Hz frequency produces exceptional accuracy 5-10 seconds per YEAR, battery replacement ~USD 15-USD 40 every 2-3 years, zero horological maintenance, light, economical, supremely precise BUT lower prestige perception (quartz = industrial, not art). Seiko/Omega Seamaster offer quartz alternatives. VERDICT: automatic for collectors valuing mechanism and heritage; quartz for pragmatists prioritizing accuracy. Rolex deliberately refuses quartz—intentional prestige marketing decision.`
  );} },

{ id:'guide_chronometer', kw:['COSC chronometer','Patek seal','certification standards'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Certification chronographe COSC vs Patek Seal: deux standards d'excellence divergents. COSC (Controle Officiel Suisse des Chronomètres): certification suisse independante testant precision mouvement sur 15 jours en differentes positions/temperatures. Precision cible COSC: -4/+6 secondes/jour (exceptionnellement strict comparé normal horlogerie). Rolex, Patek Philippe, Audemars Piguet obtiennent certification COSC de serie - c'est passage obligatoire. Prestige moderé: COSC standard luxe, pas exceptional. PATEK SEAL: certification Patek propriétaire infiniment plus exigeante que COSC - teste mouvement 1000+ heures avec precision cible -3/+2 secondes/jour (quasi-impossible). Seules montres Patek Philippe remplissent Patek Seal - marketing prestige maison. Precision atteinte: exceptionnelle, vieillissement mouvement minimal. Grand horloger comme Lange aussi utilise certification propriétaire (Lange Certificate). VERDICT: COSC certifie = qualité excellent (standard minimum Rolex/Patek); Patek Seal = qualité exceptionnelle (prestige supremum). Lors achat, verifier certification est standard de controle qualite - montre sans certification = red-flag possible faux.`,
    `EN: COSC Chronometer certification vs Patek Seal: two divergent excellence standards. COSC (Controle Officiel Suisse des Chronomètres): independent Swiss certification testing movement accuracy over 15 days across different positions/temperatures. COSC accuracy target: -4/+6 seconds per day (exceptionally strict versus typical horology). Rolex, Patek Philippe, Audemars Piguet achieve COSC certification standard—mandatory passage. Prestige moderate: COSC standard luxury, not exceptional. PATEK SEAL: Patek proprietary certification infinitely more demanding than COSC—tests movement 1000+ hours targeting -3/+2 seconds per day (nearly impossible). Only Patek Philippe watches achieve Patek Seal—in-house prestige marketing. Achieved precision: exceptional, movement aging minimal. Grand horlogers like A. Lange & Söhne also use proprietary certification (Lange Certificate). VERDICT: COSC certified = excellent quality (Rolex/Patek minimum standard); Patek Seal = exceptional quality (prestige maximum). When purchasing, verify certification as quality-control standard—watches without certification = possible counterfeit red-flag.`
  );} },

{ id:'guide_water_resistance', kw:['water resistance rating','diving depth','practical meaning'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Etanche 30m/50m/100m/300m: interpretations pratiques souvent mal comprises. 30M (3 bars): FORMAL DRESS ONLY - pas d'eau du tout (respiration condensation peut penetrer). Exemples: Patek Calatrava 5226 dress watches. 50M (5 bars): RESISTANT SPLASHURE - resistance aux eclaboussures lavage mains occasionnel, JAMAIS immersion deliberee. Exemples: Patek Aquanaut 5167, Rolex Cellini dress watches. 100M (10 bars): DAILY WEAR WATER - resistance nage, douche, snorkeling superficiel (max 30 secondes immersion). Rolex Datejust, Submarine, GMT-Master II. Interpretation: 100m designé pour nage recreational et douche, PAS FOR DIVING sans formation. 300M (30 bars): RECREATIONAL DIVING - resistance dive jusqu'à ~60 metres pour divers certifies, snorkeling profond illimite. Exemples: Rolex Submariner 300m, Omega Seamaster 300m, Rolex Sea-Dweller 1000m. 1000M+ (100+ bars): PROFESSIONAL DEEP DIVING - resistance dive extreme jusqu'à 3,000+ metres. Exemples: Rolex Sea-Dweller Deepsea 3900m. CONSEIL: acheteur novice 100m suffit amplement. Certification etanche: verifier "Swiss Made" + bracelet integre implique meilleure resistance (flexion reduit etancheite).`,
    `EN: Water resistance 30m/50m/100m/300m: practical interpretations often misunderstood. 30M (3 bars): FORMAL DRESS ONLY—no water exposure intended (even breathing condensation can penetrate). Examples: Patek Calatrava dress watches. 50M (5 bars): SPLASH-RESISTANT—resists splashing during hand-washing occasional exposure, NEVER deliberate immersion. Examples: Patek Aquanaut, Rolex Cellini dress watches. 100M (10 bars): DAILY WEAR WATER—resistance to swimming, showering, shallow snorkeling (maximum 30 seconds immersion). Rolex Datejust, Submariner, GMT-Master II. Interpretation: 100m designed for recreational swimming and showers, NOT DIVING without certification. 300M (30 bars): RECREATIONAL DIVING—resistance to diving ~200 feet for certified divers, unlimited deep snorkeling. Examples: Rolex Submariner 300m, Omega Seamaster 300m. 1000M+ (100+ bars): PROFESSIONAL DEEP DIVING—extreme depth resistance to 9,800+ feet. Examples: Rolex Sea-Dweller Deepsea 3,900m. ADVICE: novice buyers—100m adequately sufficient. Waterproof certification: verify "Swiss Made" + integrated bracelet implies better resistance (bracelet flexing compromises seal).`
  );} },

{ id:'guide_bracelet_guide', kw:['watch bracelet types','Oyster Jubilee','President','integrated'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Types bracelet montre: vocabulaire critique pour collecteur. OYSTER: bracelet trois-rangs acier simplifie (chainette triple) Rolex legendaire depuis 1933. Design robuste, polyvalent, moins elegant que Jubilee. Montees sur: Submariner, GMT-Master II, Sea-Dweller, Explorer, Yacht-Master. JUBILEE: bracelet neuf-rangs ornate (chainette triple croisee) Rolex depuis 1945 Datejust original. Design plus elegant, plus feminin perception, excessivement demande actuellement. Montees sur: Datejust, Day-Date, Sky-Dweller. PRESIDENT: bracelet semi-circulaire polies avec maillons profonds trois-rangees, ultra-luxe Rolex Day-Date (President watch). Finition tres raffinee. INTEGRE (Audemars Piguet): bracelet forge integralement boitier (Royal Oak depuis 1972). Design contemporain icon, zero jeu mailles, aesthetic superieur. Audemars Piguet monopole quasi-total. OYSTERFLEX: bracelet caoutchouc/metal hybrid Rolex (Yacht-Master, Sky-Dweller, Submariner Oysterflex options). Confort port, resistance chlore piscine, maintenance facile. CUIR/COMPOSITE: montages cuir ou caoutchouc (Patek Aquanaut composite, Patek Calatrava). Maintenance fastidieuse, replacement tous 5 ans (~€400-€600). CONSEIL: Jubilee plus demande = plus cher bracelets remplacement; Oyster plus compatible polyvalent.`,
    `EN: Watch bracelet types: critical vocabulary for collectors. OYSTER: three-row simplified steel bracelet (triple chainette) Rolex legendary since 1933. Robust design, versatile, less elegant than Jubilee. Mounted on: Submariner, GMT-Master II, Sea-Dweller, Explorer, Yacht-Master. JUBILEE: nine-row ornate bracelet (crossed triple chainette) Rolex since 1945 original Datejust. More elegant design, feminine perception, excessively sought currently. Mounted on: Datejust, Day-Date, Sky-Dweller. PRESIDENT: semi-circular polished bracelet with deep three-row links, ultra-luxury Rolex Day-Date (President watch). Exceptionally refined finishing. INTEGRATED (Audemars Piguet): bracelet forged integrally with case (Royal Oak since 1972). Contemporary iconic design, zero link play, superior aesthetics. Audemars Piguet near-total monopoly. OYSTERFLEX: hybrid rubber/metal bracelet Rolex (Yacht-Master, Sky-Dweller, Submariner options). Comfortable wear, chlorine resistance, easy maintenance. LEATHER/COMPOSITE: leather or rubber mounting (Patek Aquanaut composite, Patek Calatrava). Fastidious maintenance, replacement every 5 years (~USD 350-USD 550). ADVICE: Jubilee most sought = expensive replacements; Oyster more versatile-compatible.`
  );} },

{ id:'guide_watch_movements', kw:['watch movement types','manual automatic','calibre explained'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Mouvements horlogers: guide complet pour comprehension mechanism. MOUVEMENT MANUEL (remontage manuel): ressort moteur alimente par remontage quotidien avec couronne. Frequence oscillateur balancier 28,800 vibrations/heure (Rolex standard). Reserve marche typique 48-72h. Precision 5-15 secondes/mois. Exemples: Patek Calatrava 5226 (calibre 240), Richard Mille (calibres extremement complexes 45-jour reserve). Avantages: mecanisme visible transparence, plus "authentique" sensation. Inconvenients: remontage quotidien fastidieux. MOUVEMENT AUTOMATIQUE (self-winding): oscillateur rotor metallique alimente par mouvement poignet. Reserve marche 40-80h selon calibre. Precision identique manuel. Rolex monopole quasi-total automatique (tous mouvements 3135/3285/etc). Avantages: remontage automatique commodite, reserve 70h suffit 2-3 jours sans port. Inconvenients: plus complexe = plus couteux service. CHRONOGRAPHE: complication supplementaire avec seconds chrono + compteurs subdivisions temps. Calibres: Rolex 4130 (manuel), Zenith El Primero 400 (auto), Patek 240 HU (manuel). SPRING DRIVE (Seiko): technologie hybride - mainspring mais regule electroniquement quartz frequency. Precision quartz-level mais sensation automatique. TOURBILLON: complication ultra-rare cardan tournant continu pour eliminer effecte gravite precision. Rolex refuse tourbillon (heritage puriste). Seules Patek, Lange, pratiquent tourbillon.`,
    `EN: Watch movements: complete guide for mechanism understanding. MANUAL MOVEMENT (hand-winding): mainspring powered by daily crown winding. Oscillator frequency 28,800 vibrations per hour (Rolex standard). Power reserve typically 48-72 hours. Accuracy 5-15 seconds per month. Examples: Patek Calatrava 5226 (caliber 240), Richard Mille (extremely complex calibers 45-day reserve). Advantages: visible transparency mechanism, more "authentic" sensation. Disadvantages: daily winding tedious. AUTOMATIC MOVEMENT (self-winding): metal rotor oscillator powered by wrist motion. Power reserve 40-80 hours depending on caliber. Identical accuracy to manual. Rolex near-total monopoly automatic (all 3135/3285/etc movements). Advantages: automatic winding convenience, 70-hour reserve sufficient 2-3 days unworn. Disadvantages: more complex = expensive service. CHRONOGRAPH: supplementary complication with chrono seconds + time subdivision counters. Calibers: Rolex 4130 (manual), Zenith El Primero 400 (auto), Patek 240 HU (manual). SPRING DRIVE (Seiko): hybrid technology—mainspring electronically regulated by quartz frequency. Quartz-level accuracy but automatic sensation. TOURBILLON: ultra-rare complication—continuously rotating carriage eliminating gravity's precision effects. Rolex deliberately refuses tourbillon (purist heritage). Only Patek, A. Lange & Söhne practice tourbillon.`
  );} },

{ id:'guide_buying_preowned', kw:['buying preowned watches','authentication','grey market'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Achat preowned montre luxe: piegges majeurs et protocole securite. DEALERS AUTHORISES vs GREY MARKET: achat revendeur autorise Rolex/Patek = garantie manufacturier 5 ans, service futur couvert, authentification certifiee. Achat grey-market (Chrono24, ebay, dealers non-autorises) = AUCUNE GARANTIE, risque contrefacon 5-15%, service refuse par manufacturiers sans papers originaux. SECRET: certains grey-market proposent "garanties tier" (2-3 ans couvrant defauts mecaniques) mais non-officiel. AUTHENTIFICATION CRITERES: 1) Gravure numero serie sur boitier (gravure fine, pas laser industriel); 2) Mouvement gravure calibre correct (Rolex 3285 vs faux 2836); 3) Box original + papers certains (importants 30% valeur); 4) Luminosité aiguilles homogene (faux souvent luminosite inégale); 5) Couleur cadran parfaite saturation (faux: cadran terne peinture mauvaise); 6) Poids global (acier imitation souvent allege). SERVICE PREOWNED: verifier historique service - montre serviceee tous 5 ans = meilleur presage fiabilite. Montre 10 ans sans service = risque rouille mecanisme interne. PRIX PREOWNED: Rolex Submariner 5-6 ans = -20% de neuf typiquement; Patek Nautilus 5-6 ans = +20-50% de neuf (appreciation!). CONSEIL: JAMAIS acheter montre sans documentation originale - perte massive valeur future + risque service refuse.`,
    `EN: Buying pre-owned luxury watches: major pitfalls and security protocol. AUTHORIZED DEALERS vs GREY MARKET: purchase from authorized Rolex/Patek dealer = 5-year manufacturer warranty, future service covered, certified authentication. Grey-market purchase (Chrono24, eBay, non-authorized dealers) = NO WARRANTY, 5-15% counterfeit risk, manufacturers refuse service without original papers. SECRET: some grey-market dealers offer "tiered guarantees" (2-3 years covering mechanical defects) but non-official. AUTHENTICATION CRITERIA: 1) Serial number engraving on case (fine engraving, not industrial laser); 2) Movement caliber engraving correct (Rolex 3285 vs fake 2836); 3) Original box + papers critical (important 30% of value); 4) Hand luminosity homogeneous (fakes often uneven lume); 5) Dial color perfect saturation (fakes: dull dial poor paint); 6) Overall weight (counterfeit steel often lighter). PRE-OWNED SERVICE: verify service history—watch serviced every 5 years = better reliability predictor. Watch 10 years without service = internal mechanism rust risk. PRE-OWNED PRICING: Rolex Submariner 5-6 years = typically -20% from new; Patek Nautilus 5-6 years = +20-50% from new (appreciation!). ADVICE: NEVER buy watches without original documentation—massive future value loss + manufacturer service refusal risk.`
  );} },

{ id:'guide_watch_servicing', kw:['watch service','maintenance cost','service intervals'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Service montre: maintenance critique, couts substantiels, planification essentielle. INTERVALLE SERVICE: tous 5-10 ans recommande pour mouvements automatiques (oil degradation, mecanisme usure). Mouvements manuels Patek: tous 5-10 ans egalement. SERVICE PRIX TYPIQUE: Rolex €2,000-€3,500 service complet (nettoyage, huilage, ajustement); Patek €3,500-€6,000 service complet (plus complexe); Audemars Piguet €2,500-€4,000 service complet. SERVICE CHRONOGRAPHE: supplement €500-€1,500 (mecanisme chronographe complexe neccessite expertise supplementaire). QUE FAIT SERVICE: 1) Desassemblage complet; 2) Nettoyage pieces ultrasons; 3) Inspection usure; 4) Remplacement joints/pignons uses; 5) Huilage precision (marques speciales Rolex/Patek); 6) Reassemblage et chronometrage precision; 7) Test etancheite (water-pressure test 100+ bars); 8) Remplacement crystale si rayures. DELAI SERVICE: 6-12 mois attente typiquement (Rolex ADs surcharge demandes). CONSEIL: budget service dans calcul total-cost ownership long-terme. Montre non-servisee = degradation progressive rouille = perte valeur + risque mecanisme cassure catastrophique.`,
    `EN: Watch servicing: critical maintenance, substantial costs, essential planning. SERVICE INTERVAL: every 5-10 years recommended for automatic movements (oil degradation, mechanism wear). Patek manual movements: every 5-10 years similarly. TYPICAL SERVICE COST: Rolex USD 1,800-USD 3,200 complete service (cleaning, oiling, adjustment); Patek USD 3,200-USD 5,500 complete service (more complex); Audemars Piguet USD 2,300-USD 3,700 complete service. CHRONOGRAPH SERVICE: supplement USD 450-USD 1,350 (chronograph mechanism complexity requires supplementary expertise). WHAT SERVICE INCLUDES: 1) Complete disassembly; 2) Ultrasonic parts cleaning; 3) Wear inspection; 4) Worn seal/pinion replacement; 5) Precision oiling (special Rolex/Patek brands); 6) Reassembly and chronometry timing; 7) Water-resistance testing (100+ bar pressure); 8) Crystal replacement if scratches. SERVICE WAIT: 6-12 months typical (Rolex ADs backlogged with demand). ADVICE: budget servicing into long-term total-cost-of-ownership calculations. Unserviced watch = progressive rust degradation = value loss + catastrophic mechanism-breaking risk.`
  );} },

{ id:'guide_rolex_waitlist', kw:['Rolex AD waitlist','how waitlist works','buying strategy'],
  r:()=>{ ctx.brand='Rolex'; ctx.type='Educational'; return t(
    `FR: Liste d'attente Rolex AD: systeme frustrant mais necessaire pour acheteurs legaux. FONCTIONNEMENT OFFICIEL: 1) Inscription AD en personne (pas telephone/email generalement); 2) Specification montre exacte (modele, materiau, couleur cadran, taille); 3) Attente 1-5+ annees selon popularite reference; 4) AD contacte quand allocation arrivee; 5) Droit refusal OU obligation achat (selon AD rules). REGLES NON-ECRITES: 1) AD preferent clients fideles (acheteurs passees montres - Datejust reconversion en Submariner aide attente); 2) Achats autres produits Rolex helps (tennis, bracelets, etc); 3) Relationnel personnel direct manager AD crucial; 4) Femmes statistiquement attente plus courte (genre bias dans industrie); 5) Multi-inscription differents ADs reduit attente mais perception negative certains. MODELES ATTENTES LONGUES: Submariner noir 2-5 ans, GMT-Master II Pepsi 3-7 ans, Daytona acier 5-10 ans (extremement demande), Datejust bleu ~1-2 ans. MODELES ATTENTES COURTES: Oyster Perpetual acier ~0-6 mois, Air-King ~0-2 mois, Explorer ~3-6 mois. GREY MARKET ALTERNATIVE: achat preowned Chrono24 elimine liste d'attente mais couts premium 20-50% + pas garantie manufacturier. CONSEIL STRATEGIE: acheter reference moins demandee d'abord (Air-King, Oyster Perpetual), puis revendeur reconversion demande populaire apres 2-3 ans de relationnel.`,
    `EN: Rolex AD waiting list: frustrating but necessary system for legal buyers. OFFICIAL MECHANISM: 1) Personal AD registration (not typically phone/email); 2) Exact watch specification (model, material, dial color, size); 3) Wait 1-5+ years depending on reference popularity; 4) AD contacts when allocation arrives; 5) Right of refusal OR purchase obligation (per AD rules). UNWRITTEN RULES: 1) ADs prefer loyal customers (past watch buyers—Datejust-to-Submariner conversion helps wait); 2) Other Rolex purchases help (jewelry, straps, etc); 3) Direct personal relationship with AD manager crucial; 4) Women statistically shorter waits (gender bias industry-wide); 5) Multi-registration at different ADs reduces wait but perceived negatively by some. LONG WAIT MODELS: Submariner black 2-5 years, GMT-Master II Pepsi 3-7 years, Daytona steel 5-10 years (extremely sought), Datejust blue ~1-2 years. SHORT WAIT MODELS: Oyster Perpetual steel ~0-6 months, Air-King ~0-2 months, Explorer ~3-6 months. GREY MARKET ALTERNATIVE: pre-owned Chrono24 purchase eliminates waiting but 20-50% premium costs + no manufacturer warranty. STRATEGY ADVICE: buy less-sought reference first (Air-King, Oyster Perpetual), then dealer-convert-to-popular-demand after 2-3 years relationship-building.`
  );} },

{ id:'guide_watch_terminology', kw:['watch terms glossary','bezel complication','escapement'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Vocabulaire montre: definitions essentielles. LUNETTE: ring tournant ou fixe autour cadran (Submariner unidirectionnelle rotatif, Datejust cannele fixe). COMPLICATION: mecanisme supplementaire au-dela temps simple (chronographe, date, moonphase, GMT, perpetuel, etc). CALIBRE: designation interne manufacturier movement (Rolex 3285, Patek 240, etc - identifie precision/reserve/architecture). ECHAPPEMENT: mecanisme oscilleur balance wheel libere energie ressort principal rythme. Types: ancre traditionnelle (Rolex), co-axial (Omega), escapement equalization (Patek Spiromax). RESSORT PRINCIPAL: ressort helicoidale storee energie mechanique motrice. Reserve marche depend ressort dimensions + nombre spires. BALANCIER: oscillateur regulateur battement frequence (28,800 vibrations/heure Rolex = 20,000 vibrations/heure anciennes). SPIRAL: ressort ultra-fin attache balancier, regulation frequence fine oscillation. PIGNONS: petites roues transmission mouvement (nombre dents affecte vitesse / reserves). CHRONOGRAPHE: complication timing avec compteurs subdivisions heures/minutes/secondes. Types: mono-compteur (simples), bi-compteur (chronographe + 30m), tri-compteur (chrono + 30m + 12h). GMT: fonction deuxieme fuseau horaire aiguille 24h additionnelle. MOONPHASE: complication affichant phase lunaire (decorative, rare Rolex). TOURBILLON: cardan tournant continuellement elimine gravitee effects (ultra-rare, tres cher). REMONTOIR: mecanisme remontage - manuel couronne vs automatique rotor.`,
    `EN: Watch terminology: essential definitions. BEZEL: rotating or fixed ring around dial (Submariner unidirectional rotating, Datejust fluted fixed). COMPLICATION: mechanism beyond simple timekeeping (chronograph, date, moonphase, GMT, perpetual, etc). CALIBER: manufacturer's internal movement designation (Rolex 3285, Patek 240, etc—identifies accuracy/reserve/architecture). ESCAPEMENT: oscillating mechanism releasing mainspring energy rhythmically to balance wheel. Types: traditional lever (Rolex), co-axial (Omega), Patek Spiromax escapement. MAINSPRING: helical spring storing mechanical energy drive. Power reserve depends on spring dimensions + number of coils. BALANCE WHEEL: frequency-regulating oscillator (28,800 vibrations per hour Rolex = 20,000 older movements). HAIRSPRING: ultra-thin spring attached to balance wheel, regulating oscillation frequency. PINIONS: small transmission wheels (tooth count affects speed/reserve). CHRONOGRAPH: timing complication with subdivision counters hours/minutes/seconds. Types: single counter (simple), dual counter (chrono + 30m), triple counter (chrono + 30m + 12h). GMT: second time-zone function with additional 24-hour hand. MOONPHASE: complication displaying lunar phase (decorative, rare on Rolex). TOURBILLON: continuously rotating carriage eliminating gravity's precision effects (ultra-rare, very expensive). WINDER: winding mechanism—manual crown vs automatic rotor.`
  );} },

{ id:'guide_collecting', kw:['watch collection strategy','one watch','three watch collection'],
  r:()=>{ ctx.brand='General'; ctx.type='Educational'; return t(
    `FR: Strategies collecteurs montres: models accumulatifs. ONE-WATCH COLLECTOR: achete UNIQUE montre representative sa vision horlogere (exemple: Rolex Submariner, Patek Nautilus, AP Royal Oak). Montre porte 365 jours/an. Avantage: connaissance intimite profonde un seul mecanisme, emotional attachment fort, zero dilemme choix quotidien. Inconvenient: zero diversification horlogere, ennui possible long-terme. Conseille: novices, budgets limites. THREE-WATCH COLLECTION: modele classique Paul Newman recommandait - 1) Montre sport (Rolex Submariner/GMT), 2) Montre formelle (Patek Calatrava), 3) Montre voyage (Patek Aquanaut). Avantage: diversification complete contexts (sport/bureau/voyage), apprentissage trois manufactures cultures differentes, engagement intellectuel eleve. Inconvenient: cout substantiel €100,000+. FIVE-WATCH COLLECTION: expansion three-watch avec mouvements chronographe + complication supplementaire (perpetuelle). Avantage: collection "mature" affichant expertise, appreciation historique diverse manufacturiers, collection vitrine prestige. Inconvenient: maintenace service complexe, assurance couteuse. GRAIL-WATCH STRATEGY: collecteur assemble ensemble montres JUSQU'A acquisition montre "grail" (Patek Perpetual Calendar, Daytona or jaune, etc). Approche: accumule references "stepping stone" jusqu'a objectif ultime. Exemple: Air-King → Datejust → Submariner → Daytona 10-15 ans progression. CONSEIL GENERAL: acheter montres VOUS PORTEREZ REELLEMENT - collection vitrine jamais portee = stagnation appreciation + regret esthetique.`,
    `EN: Watch collection strategies: accumulative models. ONE-WATCH COLLECTOR: purchases SINGLE watch representing horological vision (example: Rolex Submariner, Patek Nautilus, AP Royal Oak). Watch worn 365 days/year. Advantage: intimate deep understanding one mechanism, strong emotional attachment, zero daily choice dilemma. Disadvantage: zero horological diversification, possible long-term boredom. Recommended: novices, limited budgets. THREE-WATCH COLLECTION: classic model Paul Newman recommended—1) Sport watch (Rolex Submariner/GMT), 2) Formal watch (Patek Calatrava), 3) Travel watch (Patek Aquanaut). Advantage: complete context diversification (sport/office/travel), learning three manufacturers' cultures, high intellectual engagement. Disadvantage: substantial cost USD 90,000+. FIVE-WATCH COLLECTION: three-watch expansion with chronograph movements + supplementary complication (perpetual). Advantage: "mature" collection displaying expertise, diverse historical appreciation across manufacturers, prestige showcase collection. Disadvantage: complex service maintenance, expensive insurance. GRAIL-WATCH STRATEGY: collector assembles watches UNTIL acquiring "grail" watch (Patek Perpetual Calendar, yellow-gold Daytona, etc). Approach: accumulates "stepping stone" references toward ultimate objective. Example: Air-King → Datejust → Submariner → Daytona over 10-15 years progression. GENERAL ADVICE: purchase watches YOU'LL GENUINELY WEAR—unworn showcase collections = appreciation stagnation + aesthetic regret.`
  );} },
{ id:'fallback', kw:[], r:()=>t(
        `Je peux vous renseigner sur nos montres en stock, les prix, l'achat, la vente, les révisions, ou l'horlogerie de luxe en général. Reformulez votre question ou appelez-nous au ${BIZ.phone1}.`,
        `I can help with our watches in stock, prices, buying, selling, servicing, or luxury horology in general. Try rephrasing your question, or call us on ${BIZ.phone1}.`
      ) },

  ]; // end KB


  // ─── Classifier ───────────────────────────────────────────────────────────────

  // Strip common question/filler words to expose intent words
  function stripFillers(text) {
    return text
      .replace(/\b(what|which|where|when|how|why|who|do|does|is|are|was|were|have|has|had|can|could|would|should|will|may|might|shall|tell|show|give|know|mean|says|said|going|want|need|looking|trying|wondering|thinking|hi|hey|hello|bonjour|bonsoir|salut|please|merci|okay|ok|oui|non|yes|no|not|dont|dont|doesnt|isnt|arent|cant|wont|a|an|the|of|in|on|at|to|for|with|about|your|my|our|their|its|this|that|these|those|de|la|le|les|du|des|un|une|et|ou|est|que|qui|quoi|quel|quelle|pour|sur|dans|avec|sans|plus|très|bien|aussi|encore|just|just|only|really|very|so|quite|i|you|we|they|me|us|il|elle|on|nous|vous|ils|je|tu|c est|c'est|ça|ca|j ai|j'ai|vous avez|vous êtes|je suis|je cherche|im|i'm|ive|i've|id|i'd)\b/gi, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  // Build regex from keyword — allows trailing plural/conjugation suffixes
  function kwRegex(kw) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow: s/es (plural), ing (gerund), ed (past), er/eur (agent), ment, tion
    const sfx = '(?:s|es|ing|ings|ed|er|eur|ment|tion|sion|able|ible)?';
    return new RegExp('(?:^|[\\s,.\'"!?()\\-/])' + esc + sfx + '(?=$|[\\s,.\'"!?()\\-/])', 'i');
  }

  function runClassify(t2) {
    let best = null, bestScore = 0;
    for (const entry of KB) {
      if (!entry.kw.length) continue;
      let score = 0;
      let matchedSpecificRef = false;
      for (const kw of entry.kw) {
        if (kwRegex(kw).test(t2)) {
          const words = kw.split(/\s+/).length;
          score += words * words;
          // UPGRADE: Boost score heavily when a specific ref number matches
          // Ref numbers are alphanumeric 4+ chars with digits — e.g. 116613lb, 126500ln
          if (/\d/.test(kw) && kw.length >= 4) { score += 20; matchedSpecificRef = true; }
        }
      }
      // UPGRADE: If this entry matched a specific ref, it should almost always win
      // over generic conversational entries like 'more_info' or 'help'
      if (matchedSpecificRef) score += 50;
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return { best, score: bestScore };
  }

  function classify(text) {
    // UPGRADE: Synonym expansion + pronoun resolution before classification
    let t2 = fuzzy(text.toLowerCase());
    t2 = expandSynonyms(t2);
    t2 = resolvePronouns(t2);

    // First pass: full text (now synonym-expanded)
    let { best, score } = runClassify(t2);
    if (score > 0) return best;
    // Second pass: strip fillers to expose intent words
    const stripped = stripFillers(t2);
    if (stripped && stripped !== t2) {
      const r2 = runClassify(stripped);
      if (r2.score > 0) return r2.best;
    }
    // Third pass: try individual content words (length >= 4)
    const words = stripped.split(' ').filter(w => w.length >= 4);
    let fallbackBest = null, fallbackScore = 0;
    for (const word of words) {
      const r3 = runClassify(word);
      if (r3.score > fallbackScore) { fallbackScore = r3.score; fallbackBest = r3.best; }
    }
    if (fallbackScore > 0) return fallbackBest;

    // UPGRADE: Follow-up signal detection — if user says "tell me more" etc.
    if (FOLLOW_UP_SIGNALS.test(text) && ctx.lastEntry) {
      const lastKB = KB.find(e => e.id === ctx.lastEntry);
      if (lastKB) return lastKB;
    }

    return KB.find(e => e.id === 'fallback');
  }

  // ─── Greeting variants (random) ──────────────────────────────────────────────
  const GREET_VARIANTS_FR = [
    `Bonjour ! Comment puis-je vous aider aujourd'hui — achat, vente ou renseignement ?`,
    `Bonjour ! Je suis l'assistant Nos Montres. Quelle montre vous intéresse ?`,
    `Bonsoir ! Boutique de montres de luxe à Paris. Posez-moi votre question.`,
  ];
  const GREET_VARIANTS_EN = [
    `Hello! How can I help you today — buying, selling, or a question?`,
    `Hello! I'm the Nos Montres assistant. Which watch are you interested in?`,
    `Good evening! Luxury watch boutique in Paris. Ask me anything.`,
  ];

  // ─── Sell intent detection → trigger lead capture ─────────────────────────────
  const SELL_INTENT = /\b(vendre|vente|je veux vendre|sell|selling|estimation|estimer|rachat|buyback|reprendre|how much for|combien pour|valeur de ma)\b/i;
  const BUY_INTENT  = /\b(acheter|je cherche|looking for|want to buy|buy a|buy an|disponible|in stock|avez.vous|do you have|je veux acheter|looking to buy|interested in buying)\b/i;

  // ─── Async market price lookup from Cloudflare Worker ────────────────────────
  async function fetchMarketPrice(ref) {
    try {
      const res = await fetch(`${WORKER_URL}/price?ref=${encodeURIComponent(ref)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.price ? fmt(data.price) : null;
    } catch { return null; }
  }

  // ─── Lead capture to KV ──────────────────────────────────────────────────────
  async function saveLead(name, email, message) {
    try {
      await fetch(`${WORKER_URL}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, ts: new Date().toISOString() })
      });
    } catch { /* silent */ }
  }

  // ─── Session state ────────────────────────────────────────────────────────────
  let firstMessage = true;
  let leadCaptured = false;

  // Gemini fallback
  async function callGemini(userText) {
    try {
      const messages = memory.history
        .filter(h => h.role === 'user' || h.role === 'bot')
        .slice(-10)
        .map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.text }));
      if (!messages.length || messages[messages.length-1].content !== userText)
        messages.push({ role: 'user', content: userText });
      const res = await fetch(WORKER_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.reply || null;
    } catch (e) { return null; }
  }
  // ─── Main response handler ────────────────────────────────────────────────────
  async function getResponse(userText) {
    const raw = userText.trim();
    if (!raw) return '';

    // UPGRADE: Record user message in memory
    memory.push('user', raw, null);

    // ── Stock lookup — but ONLY if user is asking for price/availability ───────
    // If user is asking "tell me more", "details", "about", etc → skip stock, go to KB
    const DETAIL_INTENT = /\b(tell me more|more about|details|about|explain|info|information|history|en savoir plus|plus sur|parlez|détails|c est quoi|what is|what are|describe|compared|vs|versus|worth|good|recommend|should i|better|best|investment)\b/i;
    const matches = stockMatch(raw);
    if (matches.length && !DETAIL_INTENT.test(raw)) {
      ctx.brand = matches[0].brand;
      ctx.model  = matches[0].model;
      let livePrice = null;
      if (matches[0].ref) livePrice = await fetchMarketPrice(matches[0].ref);
      const lines = matches.map((w, i) => {
        const mp = livePrice && i === 0 ? ` (marché: ${livePrice})` : '';
        return `• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}${mp}`;
      });
      if (SELL_INTENT.test(raw)) {
        setTimeout(() => showLeadForm('sell'), 1200);
      }
      const stockReply = t(
        `En stock :\n${lines.join('\n')}`,
        `In stock:\n${lines.join('\n')}`
      );
      memory.push('bot', stockReply, 'stock_match');
      return stockReply;
    }
    // If stock matched but user wants details, set context and fall through to KB
    if (matches.length && DETAIL_INTENT.test(raw)) {
      ctx.brand = matches[0].brand;
      ctx.model = matches[0].model;
      // Fall through to KB classify below — it will find the model-specific entry
    }

    // ── UPGRADE: Multi-intent detection ──────────────────────────────────────
    // If user asks about two things ("sell a Rolex and buy a Patek"), handle both
    const sellAndBuy = SELL_INTENT.test(raw) && BUY_INTENT.test(raw);
    if (sellAndBuy) {
      const sellEntry = KB.find(e => e.id === 'sell');
      const buyEntry = KB.find(e => e.id === 'buy');
      if (sellEntry && buyEntry) {
        ctx.lastEntry = 'sell';
        memory.push('bot', 'multi-intent: sell+buy', 'sell');
        const response = t(
          `**Vendre** : Envoyez-nous des photos (cadran, boîtier, bracelet, fond) — estimation sous 48h.\n\n**Acheter** : Consultez notre [collection](/index.html) ou dites-moi exactement ce que vous cherchez.\n\n📞 ${BIZ.phone1}`,
          `**Sell**: Send us photos (dial, case, bracelet, caseback) — estimate within 48h.\n\n**Buy**: Browse our [collection](/index.html) or tell me exactly what you're looking for.\n\n📞 ${BIZ.phone1}`
        );
        if (!leadCaptured) setTimeout(() => showLeadForm('sell'), 1400);
        return response;
      }
    }

    // ── KB classify ──────────────────────────────────────────────────────────────
    const entry = classify(raw);
    let response;

    if (entry && entry.id !== 'fallback') {
      // Use response variation for greeting, thanks, and fallback
      if (VARIATIONS[entry.id]) {
        response = vary(entry.id);
      } else {
        response = entry.r();
      }
      ctx.lastEntry = entry.id;
    } else if (matches.length) {
      // ── Stock-aware detail fallback ──────────────────────────────────────
      // KB didn't find a specific entry, but we know which stock item they mean.
      // Build a rich response from the stock data + find the parent model KB entry.
      const w = matches[0];
      ctx.brand = w.brand; ctx.model = w.model;

      // Try to find a parent model entry (e.g. rolex_submariner for any Submariner)
      const modelKey = w.model.toLowerCase().split(' ')[0]; // "submariner", "daytona", etc.
      const parentEntry = KB.find(e => e.id && e.id.includes(modelKey) && e.kw.length > 3);

      if (parentEntry) {
        // Use the parent model's full response — it has all the detail
        response = parentEntry.r();
        ctx.lastEntry = parentEntry.id;
      } else {
        // No parent entry — build a detail response from stock data
        const otherVariants = STOCK.filter(s => s.model.toLowerCase().includes(modelKey) && s.ref !== w.ref);
        response = t(
          `**${w.brand} ${w.model}** réf. **${w.ref}** — ${fmt(w.price)} en stock.\n\n${otherVariants.length ? `Autres ${w.brand} ${modelKey} disponibles :\n${otherVariants.map(v=>`• ${v.model} réf. **${v.ref}** → ${fmt(v.price)}`).join('\n')}\n\n` : ''}Pour plus de détails ou réserver, appelez-nous au 📞 ${BIZ.phone1} ou envoyez un email à ${BIZ.email}.`,
          `**${w.brand} ${w.model}** ref. **${w.ref}** — ${fmt(w.price)} in stock.\n\n${otherVariants.length ? `Other ${w.brand} ${modelKey}s available:\n${otherVariants.map(v=>`• ${v.model} ref. **${v.ref}** → ${fmt(v.price)}`).join('\n')}\n\n` : ''}For more details or to reserve, call us at 📞 ${BIZ.phone1} or email ${BIZ.email}.`
        );
        ctx.lastEntry = 'stock_detail';
      }
    } else {
      const geminiReply = await callGemini(raw);
      response = geminiReply || vary('fallback') || KB.find(e=>e.id==='fallback').r();
    }

    // UPGRADE: Record bot response in memory
    memory.push('bot', response, entry ? entry.id : 'fallback');

    // ── UPGRADE: Smart lead capture timing ────────────────────────────────────
    // Instead of only on sell/sourcing, also trigger when user is deeply engaged
    if (entry && (entry.id === 'sell' || entry.id === 'sourcing') && !leadCaptured) {
      setTimeout(() => showLeadForm(entry.id === 'sell' ? 'sell' : 'buy'), 1400);
    } else if (!leadCaptured && memory.phase === 'interested' && memory.questionsAsked >= 4) {
      // User has asked 4+ questions across 2+ topics — they're engaged, soft-offer help
      const softCTA = t(
        `\n\n_Vous semblez chercher quelque chose de précis — souhaitez-vous qu'on vous rappelle ? 📞_`,
        `\n\n_Sounds like you're looking for something specific — would you like us to call you back? 📞_`
      );
      response += softCTA;
      memory.phase = 'converting'; // don't ask again
    }

    // UPGRADE: Contextual follow-up suggestion based on what was just discussed
    if (entry && memory.turnCount >= 2 && memory.turnCount % 3 === 0 && !['greeting','thanks','help','clarify','fallback'].includes(entry.id)) {
      const suggestions = getContextualSuggestions(entry.id);
      if (suggestions) response += suggestions;
    }

    firstMessage = false;
    return response;
  }

  // ─── UPGRADE: Contextual suggestion engine ─────────────────────────────────
  // After answering a topic, suggest related follow-ups the user hasn't asked yet
  function getContextualSuggestions(entryId) {
    const RELATED = {
      'rolex_submariner':  ['investment','sell','rolex_daytona'],
      'rolex_daytona':     ['investment','rolex_gmt','sell'],
      'rolex_gmt':         ['rolex_submariner','rolex_datejust','budget'],
      'rolex_datejust':    ['woman_watch','gift','rolex_explorer'],
      'ap_general':        ['investment','ap_royal_oak','budget_over50k'],
      'patek_general':     ['investment','patek_nautilus','budget_over50k'],
      'investment':        ['sell','budget','rolex_daytona'],
      'sell':              ['authentication','sell_docs'],
      'buy':               ['recommendation','budget','stock_overview'],
      'budget':            ['recommendation','stock_overview'],
      'gift':              ['woman_watch','recommendation','budget'],
      'service':           ['authentication','contact'],
    };

    const related = RELATED[entryId];
    if (!related) return null;

    // Filter out topics already discussed
    const fresh = related.filter(id => !memory.discussed(id));
    if (fresh.length === 0) return null;

    // Pick the first undiscussed related topic and suggest it
    const TOPIC_NAMES = {
      'investment': { fr: 'investissement horloger', en: 'watch investment' },
      'sell': { fr: 'vendre votre montre', en: 'selling your watch' },
      'buy': { fr: 'acheter', en: 'buying' },
      'authentication': { fr: "l'authentification", en: 'authentication' },
      'sell_docs': { fr: 'papiers et boîte', en: 'papers and box' },
      'budget': { fr: 'votre budget', en: 'your budget' },
      'recommendation': { fr: 'nos recommandations', en: 'our recommendations' },
      'stock_overview': { fr: 'tout notre stock', en: 'our full stock' },
      'woman_watch': { fr: 'montres femme', en: 'women\'s watches' },
      'gift': { fr: 'idées cadeau', en: 'gift ideas' },
      'service': { fr: 'la révision', en: 'servicing' },
      'contact': { fr: 'nous contacter', en: 'contact us' },
      'rolex_submariner': { fr: 'le Submariner', en: 'the Submariner' },
      'rolex_daytona': { fr: 'la Daytona', en: 'the Daytona' },
      'rolex_gmt': { fr: 'le GMT-Master', en: 'the GMT-Master' },
      'rolex_datejust': { fr: 'le Datejust', en: 'the Datejust' },
      'rolex_explorer': { fr: "l'Explorer", en: 'the Explorer' },
      'ap_general': { fr: 'Audemars Piguet', en: 'Audemars Piguet' },
      'ap_royal_oak': { fr: 'le Royal Oak', en: 'the Royal Oak' },
      'patek_general': { fr: 'Patek Philippe', en: 'Patek Philippe' },
      'patek_nautilus': { fr: 'le Nautilus', en: 'the Nautilus' },
      'budget_over50k': { fr: 'nos pièces premium', en: 'our premium pieces' },
    };

    const pick = fresh[0];
    const name = TOPIC_NAMES[pick];
    if (!name) return null;

    return t(
      `\n\n_Vous pourriez aussi me demander sur **${name.fr}**._`,
      `\n\n_You might also want to ask about **${name.en}**._`
    );
  }


  // ─── UI ───────────────────────────────────────────────────────────────────────
  const QUICK_BTNS = [
    { label: () => t('💎 Collection','💎 Collection'), msg: () => t('Voir la collection en stock','Show collection in stock') },
    { label: () => t('💰 Prix','💰 Prices'),           msg: () => t('Quels sont vos prix ?','What are your prices?') },
    { label: () => t('📤 Vendre','📤 Sell'),           msg: () => t('Je veux vendre ma montre','I want to sell my watch') },
    { label: () => t('🕐 Horaires','🕐 Hours'),         msg: () => t('Quels sont vos horaires ?','What are your opening hours?') },
    { label: () => t('📍 Adresse','📍 Address'),        msg: () => t('Où êtes-vous situés ?','Where are you located?') },
    { label: () => t('🔧 Révision','🔧 Service'),       msg: () => t('Je cherche une révision','I need a service') },
  ];

  let open = false;
  let scrollLocked = false;
  let bubbleTimer = null;

  function lockBodyScroll() {
    if (window.innerWidth < 768 && !scrollLocked) {
      document.body.style.overflow = 'hidden';
      scrollLocked = true;
    }
  }
  function unlockBodyScroll() {
    document.body.style.overflow = '';
    scrollLocked = false;
  }

  // ── Markdown-lite renderer (bold, bullet points, links) ─────────────────────
  function mdRender(text) {
    return text
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^• (.+)$/gm,'<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>')
      .replace(/\n/g,'<br>');
  }

  // ── Add message to chat window ───────────────────────────────────────────────
  function addMsg(text, sender) {
    const wrap = document.getElementById('nm-msgs');
    if (!wrap) return;
    const div = document.createElement('div');
    div.className = `nm-msg nm-${sender}`;
    div.innerHTML = mdRender(text);
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  // ── Typing indicator ─────────────────────────────────────────────────────────
  function showTyping() {
    const wrap = document.getElementById('nm-msgs');
    if (!wrap || document.getElementById('nm-typing')) return;
    const div = document.createElement('div');
    div.id = 'nm-typing';
    div.className = 'nm-msg nm-bot nm-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('nm-typing');
    if (el) el.remove();
  }

  // ── Render quick buttons ─────────────────────────────────────────────────────
  function renderQuickBtns() {
    const container = document.getElementById('nm-quick');
    if (!container) return;
    container.innerHTML = '';
    QUICK_BTNS.forEach(btn => {
      const b = document.createElement('button');
      b.className = 'nm-qbtn';
      b.textContent = btn.label();
      b.addEventListener('click', () => handleSend(btn.msg()));
      container.appendChild(b);
    });
  }

  // ── Handle send (user or quick button) ──────────────────────────────────────
  async function handleSend(text) {
    const input = document.getElementById('nm-input');
    const msg = (text || (input && input.value) || '').trim();
    if (!msg) return;
    if (input) input.value = '';
    // hide quick buttons after first real send
    const qc = document.getElementById('nm-quick');
    if (qc) qc.style.display = 'none';
    addMsg(msg, 'user');
    showTyping();
    // small delay so typing indicator shows
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    const reply = await getResponse(msg);
    hideTyping();
    addMsg(reply, 'bot');
  }


  // ── Lead capture form ─────────────────────────────────────────────────────────
  function showLeadForm(intent) {
    if (leadCaptured) return;
    const wrap = document.getElementById('nm-msgs');
    if (!wrap) return;
    const isSell = intent === 'sell';
    const formId = 'nm-lead-form';
    if (document.getElementById(formId)) return;

    const card = document.createElement('div');
    card.className = 'nm-msg nm-bot nm-lead-card';
    card.id = formId;
    card.innerHTML = `
      <div class="nm-lead-title">${t(isSell ? '📤 Estimation rapide' : '🔍 On vous trouve ça', isSell ? '📤 Quick estimate' : '🔍 We\'ll find it for you')}</div>
      <input class="nm-lead-inp" id="nm-lead-name" type="text" placeholder="${t('Votre prénom','Your first name')}" autocomplete="given-name" />
      <input class="nm-lead-inp" id="nm-lead-email" type="email" placeholder="${t('Votre email','Your email')}" autocomplete="email" />
      <textarea class="nm-lead-inp nm-lead-ta" id="nm-lead-msg" placeholder="${t(isSell ? 'Modèle, réf., état…' : 'Modèle recherché, budget…', isSell ? 'Model, ref., condition…' : 'Model sought, budget…')}"></textarea>
      <div class="nm-lead-btns">
        <button class="nm-lead-submit" id="nm-lead-send">${t('Envoyer','Send')}</button>
        <button class="nm-lead-cancel" id="nm-lead-skip">${t('Plus tard','Later')}</button>
      </div>
    `;
    wrap.appendChild(card);
    wrap.scrollTop = wrap.scrollHeight;

    document.getElementById('nm-lead-send').addEventListener('click', async () => {
      const name  = (document.getElementById('nm-lead-name')  || {}).value || '';
      const email = (document.getElementById('nm-lead-email') || {}).value || '';
      const msg   = (document.getElementById('nm-lead-msg')   || {}).value || '';
      if (!name || !email) {
        addMsg(t('Merci d\'indiquer au moins votre prénom et email.','Please provide at least your name and email.'), 'bot');
        return;
      }
      card.remove();
      leadCaptured = true;
      await saveLead(name, email, `[${intent.toUpperCase()}] ${msg}`);
      addMsg(t(`Merci ${name} ! Nous vous recontactons sous 24h.`, `Thanks ${name}! We'll get back to you within 24h.`), 'bot');
    });
    document.getElementById('nm-lead-skip').addEventListener('click', () => {
      card.remove();
      addMsg(t('Pas de problème. Appelez-nous au ' + BIZ.phone1 + ' quand vous voulez.', 'No problem. Call us on ' + BIZ.phone1 + ' whenever you\'re ready.'), 'bot');
    });
  }

  // ── Inject CSS ────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('nm-chat-css')) return;
    const s = document.createElement('style');
    s.id = 'nm-chat-css';
    s.textContent = `
      #nm-bubble { position:fixed; bottom:24px; right:24px; z-index:9999; cursor:pointer; display:flex; flex-direction:column; align-items:flex-end; gap:10px; }
      #nm-toggle { width:58px; height:58px; border-radius:50%; background:#1a1a1a; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 20px rgba(0,0,0,.45); transition:transform .2s; }
      #nm-toggle:hover { transform:scale(1.08); }
      #nm-toggle svg { width:28px; height:28px; fill:#c8a96e; }
      #nm-attention { background:#1a1a1a; color:#c8a96e; padding:10px 16px; border-radius:12px 12px 0 12px; font-size:13px; font-family:inherit; max-width:220px; text-align:right; box-shadow:0 4px 16px rgba(0,0,0,.3); animation:nm-pop .3s ease; line-height:1.4; }
      @keyframes nm-pop { from{opacity:0;transform:scale(.8) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      #nm-window { position:fixed; bottom:100px; right:24px; width:360px; max-width:calc(100vw - 32px); height:540px; max-height:calc(100vh - 120px); background:#111; border:1px solid #2a2a2a; border-radius:18px; display:flex; flex-direction:column; z-index:9998; box-shadow:0 12px 48px rgba(0,0,0,.6); font-family:'Helvetica Neue',Arial,sans-serif; overflow:hidden; transition:opacity .25s, transform .25s; transform-origin:bottom right; }
      #nm-window.nm-hidden { opacity:0; transform:scale(.92); pointer-events:none; }
      #nm-header { background:#1a1a1a; padding:14px 18px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #2a2a2a; flex-shrink:0; }
      .nm-hlogo { width:36px; height:36px; border-radius:50%; background:#c8a96e; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:700; color:#111; flex-shrink:0; }
      .nm-htitle { flex:1; }
      .nm-htitle strong { display:block; color:#e8d5b0; font-size:14px; letter-spacing:.5px; }
      .nm-htitle span { color:#999; font-size:11px; }
      #nm-close { background:none; border:none; cursor:pointer; color:#555; font-size:20px; line-height:1; padding:4px; transition:color .2s; }
      #nm-close:hover { color:#c8a96e; }
      #nm-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; scrollbar-width:thin; scrollbar-color:#2a2a2a transparent; }
      #nm-msgs::-webkit-scrollbar { width:4px; }
      #nm-msgs::-webkit-scrollbar-track { background:transparent; }
      #nm-msgs::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:4px; }
      .nm-msg { max-width:84%; padding:10px 14px; border-radius:14px; font-size:13.5px; line-height:1.55; word-break:break-word; color:#ffffff; }
      .nm-msg ul { margin:6px 0 0 0; padding-left:14px; }
      .nm-msg li { margin:3px 0; }
      .nm-msg a { color:#c8a96e; text-decoration:none; }
      .nm-msg a:hover { text-decoration:underline; }
      .nm-bot { background:#1e1e1e; color:#ffffff; border-bottom-left-radius:4px; align-self:flex-start; border:1px solid #2a2a2a; text-shadow:0 0 0 #fff; }
      .nm-bot strong { color:#ffffff; }
      .nm-bot li, .nm-bot br+span, .nm-msg.nm-bot * { color:#ffffff; }
      .nm-user { background:#c8a96e; color:#111; border-bottom-right-radius:4px; align-self:flex-end; font-weight:500; }
      .nm-typing { display:flex; gap:5px; align-items:center; padding:12px 16px; }
      .nm-typing span { width:7px; height:7px; background:#555; border-radius:50%; animation:nm-dot 1.3s infinite; }
      .nm-typing span:nth-child(2) { animation-delay:.2s; }
      .nm-typing span:nth-child(3) { animation-delay:.4s; }
      @keyframes nm-dot { 0%,80%,100%{transform:scale(.7);opacity:.4} 40%{transform:scale(1);opacity:1} }
      #nm-quick { padding:8px 14px 0; display:flex; flex-wrap:wrap; gap:6px; flex-shrink:0; }
      .nm-qbtn { background:#1e1e1e; border:1px solid #333; color:#bbb; padding:6px 11px; border-radius:20px; font-size:12px; cursor:pointer; transition:all .2s; white-space:nowrap; }
      .nm-qbtn:hover { background:#c8a96e; color:#111; border-color:#c8a96e; }
      #nm-form { padding:12px 14px 14px; border-top:1px solid #1e1e1e; display:flex; gap:8px; flex-shrink:0; }
      #nm-input { flex:1; background:#1a1a1a; border:1px solid #2a2a2a; border-radius:24px; padding:9px 16px; color:#e0e0e0; font-size:13.5px; outline:none; transition:border-color .2s; font-family:inherit; }
      #nm-input::placeholder { color:#444; }
      #nm-input:focus { border-color:#c8a96e; }
      #nm-send { width:38px; height:38px; border-radius:50%; background:#c8a96e; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background .2s; align-self:flex-end; }
      #nm-send:hover { background:#d4b87a; }
      #nm-send svg { width:16px; height:16px; fill:#111; }
      #nm-powered { text-align:center; padding:4px 0 8px; color:#666; font-size:10px; flex-shrink:0; }
      .nm-lead-card { width:100% !important; max-width:100% !important; display:flex; flex-direction:column; gap:8px; background:#1a1a1a !important; border:1px solid #c8a96e44 !important; }
      .nm-lead-title { font-size:13px; font-weight:600; color:#c8a96e; margin-bottom:2px; }
      .nm-lead-inp { background:#111; border:1px solid #2a2a2a; border-radius:8px; padding:8px 12px; color:#ddd; font-size:12.5px; outline:none; font-family:inherit; transition:border-color .2s; width:100%; box-sizing:border-box; }
      .nm-lead-inp:focus { border-color:#c8a96e; }
      .nm-lead-ta { resize:none; height:60px; }
      .nm-lead-btns { display:flex; gap:8px; margin-top:2px; }
      .nm-lead-submit { flex:1; background:#c8a96e; color:#111; border:none; border-radius:8px; padding:8px; font-size:13px; font-weight:600; cursor:pointer; transition:background .2s; font-family:inherit; }
      .nm-lead-submit:hover { background:#d4b87a; }
      .nm-lead-cancel { background:none; border:1px solid #333; color:#666; border-radius:8px; padding:8px 12px; font-size:12px; cursor:pointer; font-family:inherit; transition:color .2s; }
      .nm-lead-cancel:hover { color:#aaa; border-color:#555; }
      @media(max-width:480px) {
        #nm-window { bottom:0; right:0; width:100vw; max-width:100vw; height:100dvh; max-height:100dvh; border-radius:0; }
        #nm-bubble { bottom:16px; right:16px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── Build DOM ─────────────────────────────────────────────────────────────────
  function buildDOM() {
    // Bubble container
    const bubble = document.createElement('div');
    bubble.id = 'nm-bubble';

    // Attention message
    const attn = document.createElement('div');
    attn.id = 'nm-attention';
    attn.textContent = t('Besoin d\'aide pour choisir ou vendre une montre ?','Need help choosing or selling a watch?');
    bubble.appendChild(attn);

    // Toggle button
    const toggle = document.createElement('button');
    toggle.id = 'nm-toggle';
    toggle.setAttribute('aria-label', 'Chat');
    toggle.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>`;
    bubble.appendChild(toggle);
    document.body.appendChild(bubble);

    // Chat window
    const win = document.createElement('div');
    win.id = 'nm-window';
    win.classList.add('nm-hidden');
    win.innerHTML = `
      <div id="nm-header">
        <div class="nm-hlogo">NM</div>
        <div class="nm-htitle">
          <strong>Nos Montres</strong>
          <span>${t('Assistant horloger','Watch assistant')}</span>
        </div>
        <button id="nm-close" aria-label="Fermer">&#x2715;</button>
      </div>
      <div id="nm-msgs"></div>
      <div id="nm-quick"></div>
      <div id="nm-form">
        <input id="nm-input" type="text" placeholder="${t('Posez votre question…','Ask your question…')}" autocomplete="off" />
        <button id="nm-send" aria-label="Envoyer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
        </button>
      </div>
      <div id="nm-powered">Powered by Nos Montres</div>
    `;
    document.body.appendChild(win);
  }


  // ── Wire events & init ────────────────────────────────────────────────────────
  function init() {
    injectCSS();
    buildDOM();
    renderQuickBtns();

    // Greet on open
    const win  = document.getElementById('nm-window');
    const toggle = document.getElementById('nm-toggle');
    const closeBtn = document.getElementById('nm-close');
    const input  = document.getElementById('nm-input');
    const sendBtn = document.getElementById('nm-send');

    function openChat() {
      open = true;
      win.classList.remove('nm-hidden');
      lockBodyScroll();
      // Hide attention bubble
      const attn = document.getElementById('nm-attention');
      if (attn) attn.style.display = 'none';
      clearTimeout(bubbleTimer);
      // Send greeting on first open
      const msgs = document.getElementById('nm-msgs');
      if (msgs && msgs.children.length === 0) {
        const greeting = KB.find(e=>e.id==='greeting');
        if (greeting) {
          setTimeout(() => addMsg(greeting.r(), 'bot'), 300);
        }
      }
      setTimeout(() => { if (input) input.focus(); }, 350);
    }

    function closeChat() {
      open = false;
      win.classList.add('nm-hidden');
      unlockBodyScroll();
    }

    toggle.addEventListener('click', () => open ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);

    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

    // Auto-dismiss attention bubble after 9s
    bubbleTimer = setTimeout(() => {
      const attn = document.getElementById('nm-attention');
      if (attn && !open) {
        attn.style.transition = 'opacity .4s';
        attn.style.opacity = '0';
        setTimeout(() => attn.remove(), 400);
      }
    }, 9000);

    // Close on outside click (desktop)
    document.addEventListener('click', e => {
      if (open && !win.contains(e.target) && !toggle.contains(e.target)) {
        closeChat();
      }
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) closeChat();
    });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
