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
    { id:'greeting', kw:['bonjour','bonsoir','salut','allo','hello','hey','coucou','hi','good morning','good evening','good afternoon','yo','hola'],
      r:()=>t(`Bonjour ! Je suis l'assistant de **Nos Montres**, spécialiste parisien de l'achat-vente de montres de luxe d'occasion. Posez-moi votre question.`,
              `Hello! I'm the **Nos Montres** assistant, a Parisian specialist in pre-owned luxury watches. Ask me anything.`) },

    { id:'thanks', kw:['merci','thank you','thanks','parfait','excellent','super','nickel','very helpful','utile','cheers','perfect','génial','bravo'],
      r:()=>t(`Avec plaisir.`,`My pleasure.`) },

    { id:'help', kw:['aide','help','que faites vous','what do you do','vos services','what can you do','que proposez vous','comment ça marche','how does it work'],
      r:()=>t(`Nos Montres achète et vend des montres de luxe d'occasion à Paris. Nous faisons aussi la révision Rolex & AP, et le changement de pile. Posez-moi une question spécifique.`,
              `Nos Montres buys and sells pre-owned luxury watches in Paris. We also service Rolex & AP, and replace batteries. Ask me a specific question.`) },

    // ── BOUTIQUE ────────────────────────────────────────────────────────────────
    { id:'contact', kw:['contact','téléphone','telephone','phone','email','mail','adresse','address','numéro','number','joindre','reach','coordonnées','whatsapp','instagram','réseaux'],
      r:()=>t(`📍 ${BIZ.addr}\n📞 ${BIZ.phone1} / ${BIZ.phone2}\n✉️ ${BIZ.email}`,
              `📍 ${BIZ.addr}\n📞 ${BIZ.phone1} / ${BIZ.phone2}\n✉️ ${BIZ.email}`) },

    { id:'hours', kw:['horaires','horaire','heures ouverture','open','opening hours','fermé','closed','disponible','availability','quand êtes vous','when are you','êtes vous ouverts','are you open','samedi','dimanche','weekend','saturday','sunday','7 jours','7 days'],
      r:()=>t(`Disponibles **7j/7 sur rendez-vous uniquement**.`,`Available **7 days a week, by appointment only**.`) },

    { id:'rdv', kw:['rendez-vous','rendez vous','rdv','appointment','prendre rdv','book appointment','réserver','reserve','prise de rdv','take appointment','fixer rendez vous','schedule meeting','quand puis je venir','when can i come'],
      r:()=>t(`Prenez rendez-vous par téléphone (${BIZ.phone1}), email (${BIZ.email}) ou via notre [formulaire](/prendre-rendez-vous.html).`,
              `Book by phone (${BIZ.phone1}), email (${BIZ.email}) or via our [form](/prendre-rendez-vous.html).`) },

    { id:'location', kw:['miromesnil','paris 8','paris 8ème','paris 8eme','rue de miromesnil','comment venir','how to get','directions','métro','metro','transport','accès','access','où êtes vous','where are you','plan','map','quartier','parking','garer'],
      r:()=>t(`46 rue de Miromesnil, 75008 Paris. Métro **Miromesnil** (lignes 9 & 13), à 2 min à pied.`,
              `46 rue de Miromesnil, 75008 Paris. Metro **Miromesnil** (lines 9 & 13), 2 min walk.`) },

    { id:'about', kw:['qui êtes vous','who are you','à propos','about','votre histoire','your story','depuis quand','experience','expertise','fondé','founded','créé','nos montres','nosmontres','indépendant','independent','15 ans','passion'],
      r:()=>t(`Boutique horlogère indépendante parisienne, fondée par un passionné avec **plus de 15 ans d'expertise** en montres de luxe de seconde main.`,
              `Independent Parisian watch boutique, founded by an expert with **over 15 years of expertise** in pre-owned luxury watches.`) },

    { id:'authentication', kw:['authentique','authentification','fake','faux','contrefaçon','counterfeit','certifié','garantie','guarantee','confiance','trust','vérification','verification','expertisé','original','provenance','comment savez vous','how do you know','comment vérifiez'],
      r:()=>t(`Chaque montre est expertisée avant vente : mouvement, finitions, numéro de série, couronne, verre. Si un doute subsiste, nous n'achetons pas.`,
              `Every watch is authenticated before sale: movement, finishes, serial number, crown, crystal. If there's any doubt, we don't buy.`) },

    { id:'delivery', kw:['livraison','livrer','livrez','delivery','deliver','shipping','expédition','envoyer','ship','france','international','colissimo','chronopost','assurance','insured','délai','how long to receive','combien de temps'],
      r:()=>t(`Livraison sécurisée et assurée en France (48-72h) et à l'international. Contactez-nous pour un devis.`,
              `Secure insured delivery in France (48-72h) and internationally. Contact us for a quote.`) },

    { id:'payment', kw:['paiement','payer','payment','pay','virement','wire transfer','carte','card','espèces','cash','crypto','bitcoin','comment payer','how to pay','modes de paiement','payment methods'],
      r:()=>t(`Virement bancaire, espèces (dans la limite légale) et carte bancaire.`,
              `Bank transfer, cash (within the legal limit) and bank card.`) },

    // ── BUYING & SELLING ────────────────────────────────────────────────────────
    { id:'buy', kw:['acheter','acheter une montre','buy','buy a watch','purchase','acquérir','je veux acheter','i want to buy','looking to buy','trouver une montre','find a watch','en stock','in stock','votre collection','collection','je cherche','looking for','avez vous','do you have','disponible','available','comment acheter','how to buy'],
      r:()=>t(`Consultez notre [collection](/index.html) ou dites-moi exactement ce que vous cherchez — nous avons souvent des pièces hors vitrine.`,
              `Browse our [collection](/index.html) or tell me exactly what you're looking for — we often have off-display pieces.`) },

    { id:'sell', kw:['vendre','vente','sell','selling','racheter','rachat','buyback','buy back','je veux vendre','i want to sell','vendre ma montre','sell my watch','comment vendre','how to sell','estimation','estimate','évaluation','évaluer','combien pour ma montre','how much for my watch','valeur de ma montre','value of my watch','reprise','je cherche à vendre','vendre rapidement','sell quickly','prix de rachat'],
      r:()=>t(`Envoyez-nous des photos (cadran, boîtier, bracelet, fond, couronne) — estimation sous **48h**, paiement immédiat si accord.`,
              `Send us photos (dial, case, bracelet, caseback, crown) — estimate within **48h**, immediate payment if agreed.`) },

    { id:'sell_docs', kw:['papiers','papers','boîte','box','certificat','certificate','document','sans papiers','without papers','perdu les papiers','lost papers','avec boîte','with box','sans boîte','without box','originaux','carte de garantie','warranty card'],
      r:()=>t(`Papiers et boîte non obligatoires, mais augmentent la valeur de **15 à 30%** selon le modèle. Pièce d'identité requise légalement.`,
              `Papers and box not required, but increase value by **15 to 30%** depending on the model. ID required by law.`) },

    { id:'investment', kw:['investissement','investment','invest','valeur','cote','côte','appreciation','revente','resale','meilleure montre investissement','best watch investment','quelle montre investissement','which watch investment','prend de la valeur','gains value','patrimoine','heritage','store of value','valeur refuge','cote augmente'],
      r:()=>t(`Les meilleures valeurs actuelles : Rolex Daytona acier, AP Royal Oak 15500ST & Jumbo 15202ST, Patek Nautilus 5711 (discontinuée 2021), Patek Grand Complications.`,
              `The best current values: Rolex Daytona steel, AP Royal Oak 15500ST & Jumbo 15202ST, Patek Nautilus 5711 (discontinued 2021), Patek Grand Complications.`) },

    { id:'budget', kw:['budget','combien dépenser','how much to spend','meilleure montre pour','best watch for','quel modèle choisir','which model','pas cher','affordable','entrée de gamme','entry level','10000','15000','20000','25000','30000','50000','5000','8000','under','moins de','below','autour de','around','environ','premier achat','first luxury watch','quelle montre','which watch','aide au choix'],
      r:()=>t(`Donnez-moi votre budget précis, je vous oriente vers les meilleures options disponibles.`,
              `Give me your exact budget and I'll point you to the best available options.`) },

    { id:'woman_watch', kw:['femme','woman','women','lady','ladies','montre femme','watch for women','cadeau femme','gift for women','pour ma femme','for my wife','for my girlfriend','pour ma copine','pour ma mère','for my mother','petite taille','small size','36mm','32mm','28mm','lady datejust','féminin'],
      r:()=>t(`Lady-Datejust (28mm), Datejust 36, Cartier Tank, Cartier Panthère, Patek Twenty-4, AP Royal Oak Lady (33mm). Dites-moi votre budget.`,
              `Lady-Datejust (28mm), Datejust 36, Cartier Tank, Cartier Panthère, Patek Twenty-4, AP Royal Oak Lady (33mm). Tell me your budget.`) },

    { id:'gift', kw:['cadeau','gift','offrir','offer','surprise','anniversaire','birthday','noël','christmas','fête','celebration','pour offrir','to gift','idée cadeau','gift idea','pour quelqu un','for someone'],
      r:()=>t(`Quelle est la relation (homme/femme, son style) et votre budget ? Je vous propose les meilleures options.`,
              `What's the relationship (man/woman, their style) and your budget? I'll suggest the best options.`) },

    { id:'sourcing', kw:['chercher','trouver','find','search','commande spéciale','special order','liste d attente','waiting list','sourcing','difficile à trouver','hard to find','rare','introuvable','hors catalogue','hors inventaire','off inventory','looking specifically','vous pouvez trouver','can you find'],
      r:()=>t(`Si vous ne la voyez pas en ligne, contactez-nous — nous sourçons via notre réseau de marchands et collectionneurs européens.`,
              `If you don't see it online, contact us — we source through our network of European dealers and private collectors.`) },


    // ── ROLEX — GÉNÉRAL ─────────────────────────────────────────────────────────
    { id:'rolex_general', kw:['rolex','rolex paris','couronne d or','crown logo','achat rolex','vente rolex','montre rolex','rolex occasion','rolex secondhand','rolex pre-owned','rolex luxe','marque rolex','histoire rolex','rolex histoire','rolex fondé','rolex 1905','hans wilsdorf','rolex suisse','rolex certifié'],
      r:()=>{ ctx.brand='Rolex'; return t(
        `Rolex fondée en 1905 à Londres par Hans Wilsdorf. Nous avons ${STOCK.filter(w=>w.brand==='Rolex').length} Rolex en stock actuellement (Submariner, Daytona, GMT, Datejust…). Quel modèle vous intéresse ?`,
        `Rolex founded 1905 in London by Hans Wilsdorf. We currently have ${STOCK.filter(w=>w.brand==='Rolex').length} Rolex in stock (Submariner, Daytona, GMT, Datejust…). Which model interests you?`
      );} },

    { id:'rolex_submariner', kw:['submariner','sub','hulk','kermit','126610','116613','16800','submariner date','submariner no date','plongée','diving watch','diver','sousmarin','sous marin','116610','sub date','subno','ref 126610','ref 116613','116610lv','126610lv','116613lb','acier or submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('submariner')); return t(
        `Nos Submariner :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nÉtanche 300m, verre saphir, lunette céramique (modèles récents). Icône plongée depuis 1953.`,
        `Our Submariners:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n300m water resistance, sapphire crystal, ceramic bezel (modern). Diving icon since 1953.`
      );} },

    { id:'rolex_daytona', kw:['daytona','cosmograph','paul newman','panda','chronographe rolex','126500','126505','or rose daytona','steel daytona','daytona acier','daytona gold','daytona panda','daytona blanc','daytona noir','daytona cadran','ref 126500','ref 126505','116500','116520','116503'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('daytona')); return t(
        `Nos Daytona :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nChronographe légendaire, cal. 4131, tachymètre lunette. Valeur refuge n°1 chez Rolex.`,
        `Our Daytonas:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nLegendary chronograph, cal. 4131, tachymeter bezel. The #1 investment piece in Rolex.`
      );} },

    { id:'rolex_gmt', kw:['gmt','gmt master','gmt-master','gmt ii','116710','126710','pepsi','batman','sprite','jubilée gmt','gmt bicolore','gmt rouge bleu','gmt 2 fuseaux','deux fuseaux','second timezone','gmt master ii black','gmt master ii sprite','gmt vintage','16710','gmt acier'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('gmt')); return t(
        `Nos GMT-Master II :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\n2 fuseaux horaires simultanés, lunette bicolore céramique. Créé pour les pilotes d'Air France en 1955.`,
        `Our GMT-Master II:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nDual time zones, bicolour ceramic bezel. Originally created for Air France pilots in 1955.`
      );} },


    { id:'rolex_datejust', kw:['datejust','date just','126334','126300','16234','datejust 41','datejust 36','wimbledon','mint','jubilé','jubilee','oyster bracelet','rolesor','datejust acier','datejust or','datejust cadran','fluted bezel','cannelée','datejust vintage','ref 126334','ref 126300','datejust homme','men datejust'],
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

    // ── AUDEMARS PIGUET ──────────────────────────────────────────────────────────
    { id:'ap_general', kw:['audemars piguet','ap','audemars','piguet','ap watch','montre ap','ap paris','achat ap','vente ap','ap occasion','ap secondhand','ap pre-owned','ap luxe','ap histoire','founded ap','1875 ap','le brassus','vallée de joux','manufacture ap'],
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


    // ── PATEK PHILIPPE ──────────────────────────────────────────────────────────
    { id:'patek_general', kw:['patek philippe','patek','pp','patek genève','patek paris','achat patek','vente patek','patek occasion','patek pre-owned','patek histoire','calatrava patek','patek suisse','genève manufacture','patek fondé','1839 patek','stern patek','patek collection'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        `Patek Philippe fondée en 1839 à Genève. Manufacture indépendante. Nous avons ${STOCK.filter(w=>w.brand==='Patek Philippe').length} Patek en stock (Nautilus, Annual Calendar, Complications). Quel modèle ?`,
        `Patek Philippe founded 1839 in Geneva. Independent manufacture. We have ${STOCK.filter(w=>w.brand==='Patek Philippe').length} Patek in stock (Nautilus, Annual Calendar, Complications). Which model?`
      );} },

    { id:'patek_nautilus', kw:['nautilus','5711','5712','5726','5980','5990','nautilus 5711','5711 acier','5711 or','nautilus bleu','nautilus vert','nautilus blanc','5711 discontinué','nautilus discontinué','5726 nautilus','nautilus travel time','nautilus chronographe','ref 5980','ref 5990','nautilus 40mm','nautilus bracelet','nautilus dial'],
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

    // ── RICHARD MILLE ───────────────────────────────────────────────────────────
    { id:'rm_general', kw:['richard mille','rm','richard mille paris','rm montre','rm occasion','rm pre-owned','achat richard mille','vente richard mille','rm suisse','rm tourbillon','rm prix','richard mille cher','rm combien','rm investment','rm cote'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `Richard Mille fondée en 2001. Montres ultra-légères, techniques, prix de 100 000€ à plusieurs millions. Nous avons ${STOCK.filter(w=>w.brand==='Richard Mille').length} RM en stock.`,
        `Richard Mille founded 2001. Ultra-light, technical watches, prices from €100,000 to several million. We have ${STOCK.filter(w=>w.brand==='Richard Mille').length} RM in stock.`
      );} },

    { id:'rm_65', kw:['rm 65','rm65','rm65-01','rm 65-01','rm65 01','chronographe rm','rm split seconds','rm rattrapante','richard mille chronographe','rm acier','rm tigrade'],
      r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 65-01'; const s=STOCK.filter(w=>w.brand==='Richard Mille'); return t(
        `Nos Richard Mille :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nRM 65-01 : chronographe flyback à rattrapante. Boîtier titane grade 5, tonneau, mouvement squelette.`,
        `Our Richard Mille:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nRM 65-01: flyback split-second chronograph. Grade 5 titanium tonneau case, skeleton movement.`
      );} },

    { id:'rm_tourbillon', kw:['rm tourbillon','rm 001','rm 008','rm 010','rm 011','rm 27','rm 35','rm 038','rm 055','rm 52','rm 56','rm 69','tourbillon rm','rm rafael nadal','rm athletes','rm sport','rm carbon','rm tpt','carbon ntpt'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        `Les RM Tourbillon (RM 001, RM 027 Nadal, RM 052…) sont les pièces iconiques. Marché 200 000€ à 2M+. Contactez-nous pour sourcing selon référence.`,
        `RM Tourbillons (RM 001, RM 027 Nadal, RM 052…) are the iconic pieces. Market €200,000 to 2M+. Contact us for sourcing by reference.`
      );} },

    // ── CARTIER ─────────────────────────────────────────────────────────────────
    { id:'cartier_general', kw:['cartier','cartier montre','cartier paris','achat cartier','vente cartier','cartier occasion','cartier pre-owned','cartier histoire','cartier jewellery','cartier bijouterie','cartier joaillier','tank cartier','santos cartier','panthere cartier','cartier femme','cartier homme'],
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

    { id:'cartier_juste_un_clou', kw:['juste un clou','just a nail','nail bracelet','clou cartier','wjba0042','clou or','clou bracelet','cartier nail','love bracelet','love ring','juste un clou prix'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Juste un Clou'; const s=STOCK.filter(w=>w.brand==='Cartier'); return t(
        `Nos Cartier :\n${s.map(w=>`• ${w.model} réf. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nJuste un Clou : bracelet-jonc en forme de clou, iconique depuis 1971.`,
        `Our Cartier:\n${s.map(w=>`• ${w.model} ref. **${w.ref}** → ${fmt(w.price)}`).join('\n')}\nJuste un Clou: nail-shaped bangle, iconic since 1971.`
      );} },


    // ── OMEGA ────────────────────────────────────────────────────────────────────
    { id:'omega_general', kw:['omega','seamaster','speedmaster','constellation','de ville','omega montre','achat omega','vente omega','omega occasion','omega pre-owned','omega histoire','omega suisse','omega 1848','omega swatch group','omega james bond','omega nasa','moonwatch'],
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
    { id:'revision_general', kw:['révision','revision','service','entretien','maintenance','remettre en état','overhaul','refaire','remise à neuf','nettoyage intérieur','mouvement révisé','mouvement nettoyé','service complet','full service','combien révision','prix révision','tarif révision'],
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
    { id:'price_general', kw:['prix','price','combien','how much','tarif','coût','cost','cote','valeur marchande','market value','cours actuel','current price','quelle est la valeur','what is the value','prix du marché','market price','cotation','estimation prix'],
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

    { id:'market_trends', kw:['tendances marché','market trends','marché horloger','watch market','secondhand luxury','bulle spéculative','correction marché','montre en baisse','watch prices drop','montre en hausse','watch prices up','marché 2024','marché 2025','investir maintenant','should i buy now','bon moment acheter'],
      r:()=>t(
        `Depuis fin 2022, le marché secondaire a corrigé (-20–30% sur Rolex acier). Stabilisation en 2024. C'est historiquement un bon moment d'entrée sur les modèles clés.`,
        `Since late 2022, the secondary market corrected (-20–30% on steel Rolex). Stabilised in 2024. Historically a good entry point on key models.`
      ) },


    // ── ÉDUCATION & CONSEILS ─────────────────────────────────────────────────────
    { id:'fake_detection', kw:['faux','fake','contrefait','contrefaçon','comment détecter','how to spot','fake rolex','fausse rolex','copy','copie','replica','réplique','authentifier soi même','self authenticate','différence vraie fausse','true vs fake','ticking','tic tac','rolex tic','rolex sweep','second main'],
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

    { id:'complications', kw:['complication','chronographe','tourbillon','minute repeater','répétition minutes','calendrier perpétuel','perpetual calendar','moonphase','phase de lune','GMT','double fuseau','flying tourbillon','skeleton','squelette','openworked','grande complication'],
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

    // ── COMPARAISONS ─────────────────────────────────────────────────────────────
    { id:'compare_sub_vs_gmt', kw:['submariner vs gmt','sub ou gmt','difference submariner gmt','sub gmt choisir','gmt ou sub','submariner gmt comparaison','submariner ou gmt master'],
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

    // ── QUESTIONS FRÉQUENTES CLIENTS ─────────────────────────────────────────────
    { id:'warranty_sold', kw:['garantie','warranty','garanti','garanti combien de temps','how long warranty','garantie après achat','montre garantie','garantie boutique','pièce garantie','nm garantie'],
      r:()=>t(
        `Toutes nos montres sont vendues avec un certificat d'authenticité et une garantie boutique. Les détails de garantie sont précisés au moment de l'achat.`,
        `All our watches are sold with a certificate of authenticity and a boutique warranty. Warranty details are specified at the time of purchase.`
      ) },

    { id:'negotiation', kw:['négocier','négociation','négociable','price negotiable','remise','discount','réduction','faire une offre','make an offer','meilleur prix','best price','on peut négocier','prix ferme'],
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

    { id:'condition_grades', kw:['état','condition','mint','parfait état','très bon état','bon état','état usagé','worn condition','grade','scratches','rayures','used','porté','unworn','never worn','NOS','new old stock'],
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
        `Je n'ai pas cette information précise. Contactez-nous directement : ${BIZ.phone1} ou ${BIZ.email}.`,
        `I don't have that specific information. Contact us directly: ${BIZ.phone1} or ${BIZ.email}.`
      ) },

  ]; // end KB


  // ─── Classifier ───────────────────────────────────────────────────────────────
  function kwRegex(kw) {
    const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?:^|[\\s,.\'"!?()\\-])' + esc + '(?=$|[\\s,.\'"!?()\\-])', 'i');
  }

  function classify(text) {
    const t2 = fuzzy(text.toLowerCase());
    let best = null, bestScore = 0;
    for (const entry of KB) {
      if (!entry.kw.length) continue; // skip fallback
      let score = 0;
      for (const kw of entry.kw) {
        if (kwRegex(kw).test(t2)) {
          const words = kw.split(/\s+/).length;
          score += words * words; // longer phrases score higher
        }
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return bestScore > 0 ? best : KB.find(e => e.id === 'fallback');
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
