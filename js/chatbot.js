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
  const ctx = { brand: null, model: null };

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
      r:()=>t(`Bonjour ! Je suis l'assistant de **Nos Montres**, spécialiste parisien de l'achat-vente de montres de luxe d'occasion. Posez-moi votre question.`,
              `Hello! I'm the **Nos Montres** assistant, a Parisian specialist in pre-owned luxury watches. Ask me anything.`) },

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
      r:()=>{ ctx.brand='Rolex'; return t(
        `Rolex fondée en 1905 à Londres par Hans Wilsdorf. Nous avons ${STOCK.filter(w=>w.brand==='Rolex').length} Rolex en stock actuellement (Submariner, Daytona, GMT, Datejust…). Quel modèle vous intéresse ?`,
        `Rolex founded 1905 in London by Hans Wilsdorf. We currently have ${STOCK.filter(w=>w.brand==='Rolex').length} Rolex in stock (Submariner, Daytona, GMT, Datejust…). Which model interests you?`
      );} },

    { id:'rolex_submariner', kw:['submariner','sub','hulk','kermit','126610','116613','16800','submariner date','submariner no date','plongée','diving watch','diver','sousmarin','sous marin','116610','sub date','subno','ref 126610','ref 116613','116610lv','126610lv','116613lb','acier or submariner','rolex submariner','rolex sub','the submariner','a submariner','submariner rolex','submariner watch','submariner model','submariner price','submariner cost','submariner available'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('submariner')); return t(
        `Nos Submariner :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nÉtanche 300m, verre saphir, lunette céramique (modèles récents). Icône plongée depuis 1953.`,
        `Our Submariners:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n300m water resistance, sapphire crystal, ceramic bezel (modern). Diving icon since 1953.`
      );} },

    { id:'rolex_daytona', kw:['daytona','rolex daytona','cosmograph','paul newman','panda','chronographe rolex','126500','126505','or rose daytona','steel daytona','daytona acier','daytona gold','daytona panda','daytona blanc','daytona noir','daytona cadran','ref 126500','ref 126505','116500','116520','116503'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('daytona')); return t(
        `Nos Daytona :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nChronographe légendaire, cal. 4131, tachymètre lunette. Valeur refuge n°1 chez Rolex.`,
        `Our Daytonas:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nLegendary chronograph, cal. 4131, tachymeter bezel. The #1 investment piece in Rolex.`
      );} },

    { id:'rolex_gmt', kw:['gmt','gmt master','gmt-master','gmt ii','rolex gmt','116710','126710','pepsi','batman','sprite','jubilée gmt','gmt bicolore','gmt rouge bleu','gmt 2 fuseaux','deux fuseaux','second timezone','gmt master ii black','gmt master ii sprite','gmt vintage','16710','gmt acier'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('gmt')); return t(
        `Nos GMT-Master II :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n2 fuseaux horaires simultanés, lunette bicolore céramique. Créé pour les pilotes d'Air France en 1955.`,
        `Our GMT-Master II:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDual time zones, bicolour ceramic bezel. Originally created for Air France pilots in 1955.`
      );} },


    { id:'rolex_datejust', kw:['datejust','rolex datejust','date just','126334','126300','16234','datejust 41','datejust 36','wimbledon','mint','jubilé','jubilee','oyster bracelet','rolesor','datejust acier','datejust or','datejust cadran','fluted bezel','cannelée','datejust vintage','ref 126334','ref 126300','datejust homme','men datejust'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('datejust')&&!w.model.toLowerCase().includes('lady')); return t(
        `Nos Datejust :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nLa montre la plus vendue au monde. Cal. 3235/3235, date instantanée à 3h.`,
        `Our Datejusts:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nThe world's best-selling watch. Cal. 3235, instantaneous date at 3 o'clock.`
      );} },

    { id:'rolex_lady_datejust', kw:['lady datejust','lady','179161','177234','6917','69178','datejust femme','women rolex','rolex femme','rolex lady','cadran mop','mop','diamants','diamonds','petite rolex','small rolex','28mm rolex','26mm rolex','lady-datejust'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Lady Datejust'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('lady')); return t(
        `Nos Lady-Datejust :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDisponibles en 26mm (vintage) ou 28mm (actuel). Cadrans nacre ou diamants disponibles.`,
        `Our Lady-Datejusts:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nAvailable in 26mm (vintage) or 28mm (current). MOP or diamond dials available.`
      );} },

    { id:'rolex_explorer', kw:['explorer','explorer ii','226570','216570','214270','114270','explorer 2','explorer ii blanc','orange hand','alpiniste','explorateur','montagne','mountain','exploration','safari dial','ref 226570'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('explorer')); return t(
        `Nos Explorer :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nExplorer II 42mm, aiguille 24h indépendante pour distinguer AM/PM. Robuste, lisible, intemporelle.`,
        `Our Explorers:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nExplorer II 42mm, independent 24h hand to distinguish AM/PM. Robust, legible, timeless.`
      );} },

    { id:'rolex_yacht_master', kw:['yacht master','yachtmaster','yacht-master','326935','226659','116622','116655','226655','oysterflex','everose','palladium','platine','rolex voile','nautical rolex','yacht','bateau','boat','326935'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('yacht')); return t(
        `Nos Yacht-Master :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nBracelet Oysterflex, boîtier RLX Titanium, lunette plateau. Le Rolex sportif le plus exclusif.`,
        `Our Yacht-Masters:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nOysterflex bracelet, RLX titanium case, matte bezel. The most exclusive sporty Rolex.`
      );} },


    { id:'rolex_oyster_perpetual', kw:['oyster perpetual','op','124300','124340','124310','op 41','op 36','op 41 rouge','red dial','couleur dial','lac candy','candy color','126000','ref 124300','oyster perpetual red','oyster perpetual coral'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Oyster Perpetual'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('oyster')); return t(
        `Nos Oyster Perpetual :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nLa Rolex la plus accessible, cadrans couleurs vifs. Cal. 3230, réserve 70h. Intemporelle.`,
        `Our Oyster Perpetuals:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nMost accessible Rolex, vibrant coloured dials. Cal. 3230, 70h reserve. Timeless.`
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
      r:()=>t(
        `Dites-moi la référence exacte ou le modèle et je vous donne une estimation de marché actuelle. Nos prix sont consultables sur notre site.`,
        `Tell me the exact reference or model and I'll give you a current market estimate. Our prices are visible on the site.`
      ) },

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
    { id:'rolex_126610lv', kw:['126610lv','hulk','hulk rolex','submariner hulk','sub hulk','vert submariner','green submariner','submariner vert','126610 lv','kermit rolex','new hulk'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='126610LV'); return t(
        `Submariner Hulk réf. **126610LV** : ${w?fmt(w.price):'~14 000€ marché'}. Lunette et index verts, boîtier Oyster 41mm, cal. 3235, réserve 70h. Étanche 300m.`,
        `Submariner Hulk ref. **126610LV**: ${w?fmt(w.price):'~€14,000 market'}. Green bezel and indices, 41mm Oyster case, cal. 3235, 70h reserve. 300m water resistant.`
      );} },

    { id:'rolex_126500ln', kw:['126500ln','daytona panda','panda acier','daytona acier blanc','126500 ln','daytona blanc noir','new daytona','daytona 2021','daytona cadran blanc','ceramic daytona','daytona céramique'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='126500LN'); return t(
        `Daytona Panda réf. **126500LN** : ${w?fmt(w.price):'~27 000–30 000€ marché'}. Cadran blanc, sous-compteurs noirs, lunette céramique noire, cal. 4131 (72h réserve). 40mm.`,
        `Daytona Panda ref. **126500LN**: ${w?fmt(w.price):'~€27,000–30,000 market'}. White dial, black subdials, black ceramic bezel, cal. 4131 (72h reserve). 40mm.`
      );} },

    { id:'rolex_126710grnr', kw:['126710grnr','sprite','gmt sprite','vert rouge','red green gmt','126710 grnr','sprite rolex','sprite gmt','gmt rouge vert','jubilé gmt sprite'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='126710GRNR'); return t(
        `GMT Sprite réf. **126710GRNR** : ${w?fmt(w.price):'~18 000–20 000€ marché'}. Lunette céramique vert/rouge (Sprite), bracelet Jubilé, cal. 3285. 40mm.`,
        `GMT Sprite ref. **126710GRNR**: ${w?fmt(w.price):'~€18,000–20,000 market'}. Green/red (Sprite) ceramic bezel, Jubilee bracelet, cal. 3285. 40mm.`
      );} },

    { id:'rolex_326935', kw:['326935','yacht master 42','ym 42','everose yacht','oysterflex yacht','yacht master everose','ym everose','326935 prix'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='326935'); return t(
        `Yacht-Master 42 réf. **326935** : ${w?fmt(w.price):'~35 000–38 000€ marché'}. Boîtier Everose Gold 18ct, lunette plateau titane, bracelet Oysterflex. 42mm.`,
        `Yacht-Master 42 ref. **326935**: ${w?fmt(w.price):'~€35,000–38,000 market'}. 18ct Everose Gold case, titanium matte bezel, Oysterflex bracelet. 42mm.`
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
    { id:'rolex_116613lb', kw:['116613lb','submariner bicolore','submariner acier or','rolesor submariner','sub gold steel','deux tons submariner','two tone submariner','116613 lb','116613 acier or'],
      r:()=>{ const w=STOCK.find(s=>s.ref==='116613LB'); return t(
        `Submariner Rolesor réf. **116613LB** : ${w?fmt(w.price):'~11 000–12 500€ marché'}. Boîtier et bracelet acier/or jaune 18ct, cadran bleu, lunette céramique bleue, cal. 3135, 40mm.`,
        `Submariner Rolesor ref. **116613LB**: ${w?fmt(w.price):'~€11,000–12,500 market'}. Steel/18ct yellow gold case and bracelet, blue dial, blue ceramic bezel, cal. 3135, 40mm.`
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
      for (const kw of entry.kw) {
        if (kwRegex(kw).test(t2)) {
          const words = kw.split(/\s+/).length;
          score += words * words;
        }
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return { best, score: bestScore };
  }

  function classify(text) {
    const t2 = fuzzy(text.toLowerCase());
    // First pass: full text
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
  const BUY_INTENT  = /\b(acheter|je cherche|looking for|want to buy|disponible|in stock|avez.vous|do you have|je veux acheter)\b/i;

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

  // ─── Main response handler ────────────────────────────────────────────────────
  async function getResponse(userText) {
    const raw = userText.trim();
    if (!raw) return '';

    // ── Stock lookup first: if user mentions a ref or model, show it directly ──
    const matches = stockMatch(raw);
    if (matches.length) {
      ctx.brand = matches[0].brand;
      ctx.model  = matches[0].model;
      let livePrice = null;
      if (matches[0].ref) livePrice = await fetchMarketPrice(matches[0].ref);
      const lines = matches.map((w, i) => {
        const mp = livePrice && i === 0 ? ` (marché: ${livePrice})` : '';
        return `• ${w.brand} ${w.model} réf. **${w.ref}** → ${fmt(w.price)}${mp}`;
      });
      // Offer to show lead form if sell intent detected
      if (SELL_INTENT.test(raw)) {
        setTimeout(() => showLeadForm('sell'), 1200);
      }
      return t(
        `En stock :\n${lines.join('\n')}`,
        `In stock:\n${lines.join('\n')}`
      );
    }

    // ── KB classify ──────────────────────────────────────────────────────────────
    const entry = classify(raw);
    let response = entry ? entry.r() : KB.find(e=>e.id==='fallback').r();

    // ── Trigger lead capture form contextually ────────────────────────────────
    if (entry && (entry.id === 'sell' || entry.id === 'sourcing') && !leadCaptured) {
      setTimeout(() => showLeadForm(entry.id === 'sell' ? 'sell' : 'buy'), 1400);
    }

    firstMessage = false;
    return response;
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
      .nm-htitle span { color:#666; font-size:11px; }
      #nm-close { background:none; border:none; cursor:pointer; color:#555; font-size:20px; line-height:1; padding:4px; transition:color .2s; }
      #nm-close:hover { color:#c8a96e; }
      #nm-msgs { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px; scrollbar-width:thin; scrollbar-color:#2a2a2a transparent; }
      #nm-msgs::-webkit-scrollbar { width:4px; }
      #nm-msgs::-webkit-scrollbar-track { background:transparent; }
      #nm-msgs::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:4px; }
      .nm-msg { max-width:84%; padding:10px 14px; border-radius:14px; font-size:13.5px; line-height:1.55; word-break:break-word; }
      .nm-msg ul { margin:6px 0 0 0; padding-left:14px; }
      .nm-msg li { margin:3px 0; }
      .nm-msg a { color:#c8a96e; text-decoration:none; }
      .nm-msg a:hover { text-decoration:underline; }
      .nm-bot { background:#1e1e1e; color:#fff; border-bottom-left-radius:4px; align-self:flex-start; border:1px solid #2a2a2a; }
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
      #nm-powered { text-align:center; padding:4px 0 8px; color:#333; font-size:10px; flex-shrink:0; }
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
