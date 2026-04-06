(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  // ─── Language helper ──────────────────────────────────────────────────────────
  function lang() {
    if (window.NM && window.NM.lang) return window.NM.lang;
    return localStorage.getItem('nm_lang') || 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  // ─── Business facts ───────────────────────────────────────────────────────────
  const BIZ = {
    addr:    '46 rue de Miromesnil, 75008 Paris',
    phone1:  '01 81 80 08 47',
    phone2:  '06 22 80 70 14',
    email:   'contact.nosmontres@gmail.com',
    hours:   '7j/7 sur rendez-vous',
    hoursEn: '7 days / week, by appointment',
    years:   '15+',
  };

  // ─── Conversation context (persists across turns) ────────────────────────────
  const ctx = { brand: null, model: null, lastEntry: null, lastText: null };

  // ─── Keyword helpers ──────────────────────────────────────────────────────────
  function norm(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function kwMatch(n, kw) {
    const nkw = norm(kw);
    if (nkw.length <= 4) {
      const re = new RegExp('(?:^|\\s)' + nkw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)');
      return re.test(n);
    }
    return n.includes(nkw);
  }
  function anyKw(n, arr) { return arr.some(k => kwMatch(n, k)); }


  // ─── KNOWLEDGE BASE ───────────────────────────────────────────────────────────
  // Priority order: conversational → business intent → specific models → generic brands → education → contact
  const KB = [

    // ═══ CONVERSATIONAL ════════════════════════════════════════════════════════

    { id: 'greeting',
      kw: ['bonjour','bonsoir','salut','allo','hello','hey','hola','coucou',
           'good morning','good evening','good afternoon','hi','yo','sup','what\'s up'],
      r: () => t(
        `Bonjour ! 👋 Je suis l'assistant expert horloger de **Nos Montres**.\n\nJe peux vous parler de n'importe quelle montre de luxe — Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier, Omega, IWC, Jaeger-LeCoultre, Vacheron Constantin, A. Lange & Söhne, et bien d'autres.\n\nJe peux aussi vous aider à :\n• 💰 Estimer votre montre en temps réel\n• 📋 Vendre votre montre au meilleur prix\n• 🔧 Révision & réparation Rolex / AP\n• 🎓 Vous guider dans un achat\n\nQue souhaitez-vous savoir ?`,
        `Hello! 👋 I'm the expert watch advisor at **Nos Montres**.\n\nI can talk about any luxury watch — Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier, Omega, IWC, Jaeger-LeCoultre, Vacheron Constantin, A. Lange & Söhne, and many more.\n\nI can also help you:\n• 💰 Get a live market estimate\n• 📋 Sell your watch at the best price\n• 🔧 Rolex / AP service & repair\n• 🎓 Guide your next purchase\n\nWhat would you like to know?`
      )
    },

    { id: 'thanks',
      kw: ['merci','thank','thanks','parfait','excellent','super','génial','great',
           'nickel','very helpful','très utile','utile','helpful','well done','bravo'],
      r: () => t(
        `Avec plaisir ! 🙏 N'hésitez pas si vous avez d'autres questions sur nos montres ou nos services.\n\n📞 ${BIZ.phone1} · [Prendre rendez-vous](/prendre-rendez-vous.html)`,
        `My pleasure! 🙏 Don't hesitate if you have more questions about our watches or services.\n\n📞 ${BIZ.phone1} · [Book an appointment](/prendre-rendez-vous.html)`
      )
    },

    { id: 'more',
      kw: ['tell me more','en savoir plus','plus d\'info','more info','more details',
           'explain more','elaborate','continue','go on','and then','et alors',
           'more about','tell me about','what else','quoi d\'autre'],
      r: () => t(
        `Bien sûr ! Sur quel sujet souhaitez-vous en savoir plus ? Je peux détailler :\n• Un modèle spécifique (Submariner, Nautilus, Royal Oak…)\n• Les prix actuels du marché secondaire\n• L'histoire d'une marque\n• Nos services de révision ou de rachat\n\nQuelle montre vous intéresse ?`,
        `Of course! What would you like to know more about? I can detail:\n• A specific model (Submariner, Nautilus, Royal Oak…)\n• Current secondary market prices\n• The history of a brand\n• Our service or buyback offers\n\nWhich watch are you interested in?`
      )
    },


    // ═══ BUSINESS INTENT ════════════════════════════════════════════════════════

    { id: 'sell',
      kw: ['vendre','sell','céder','revendre','racheter','rachat','buyback',
           'buy my watch','buy back','je veux vendre','how to sell','comment vendre',
           'offre de rachat','get an offer','will you buy','can you buy',
           'vous achetez','vous rachetez','achetez ma','will you pay',
           'how much will you','pay me for','offer for my','offre pour',
           'selling my watch','je revends','make me an offer','do you buy',
           'do you purchase','reprise','vente de ma','i want to sell'],
      r: () => t(
        `Nous rachetons les montres de luxe au **meilleur prix du marché** 🎯\n\n**Comment ça marche :**\n1. Soumettez votre montre → [Page Vendre](/vendre.html)\n2. Offre ferme sous 24h\n3. Rendez-vous en boutique — **${BIZ.addr}**\n4. **Paiement immédiat** par virement sécurisé, zéro commission\n\n✅ Marques acceptées : Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier · Omega · IWC · Jaeger-LeCoultre · Vacheron · A. Lange & Söhne · Breguet · Hublot · Panerai\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n\n👉 [Obtenir mon estimation gratuite](/vendre.html)`,
        `We buy luxury watches at the **best market price** 🎯\n\n**How it works:**\n1. Submit your watch → [Sell page](/vendre.html)\n2. Firm offer within 24h\n3. Appointment at **${BIZ.addr}**\n4. **Immediate payment** by secure bank transfer — zero commission\n\n✅ Brands accepted: Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier · Omega · IWC · Jaeger-LeCoultre · Vacheron · A. Lange & Söhne · Breguet · Hublot · Panerai\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n\n👉 [Get my free estimate](/vendre.html)`
      )
    },

    { id: 'services',
      kw: ['révision','revision','service watch','repair','réparation','entretien',
           'maintenance','réviser','réparer','nettoyage','cleaning','overhaul',
           'battery','pile','changement de pile','battery replacement','battery change',
           'waterproof','étanchéité','mouvement','movement repair','service rolex',
           'service ap','service audemars','révision rolex','révision ap',
           'reparation rolex','révision montre','watchmaker','horloger','polir','polish',
           'bracelet repair','bracelet réparation','crown repair','couronne','crystal'],
      r: () => t(
        `**Services horlogerie — Nos Montres, Paris 8ème :**\n\n🔧 **Révision complète Rolex** — Démontage mouvement, ultrasons, joints neufs, graissage, réglage, test timegrapher + test étanchéité. Toutes pièces d'origine Rolex. → [Révision Rolex Paris](/revision-Rolex-Paris.html)\n\n🔧 **Révision Audemars Piguet** — Même protocole expert, pièces AP d'origine → [Révision AP Paris](/revision-Audemars-Piguet-Paris.html)\n\n🔩 **Réparation Rolex** — Couronne, glace saphir, bracelet, cadran, aiguilles → [Réparation Rolex](/reparation-Rolex-Paris.html)\n\n🔋 **Changement de pile** — Toutes marques, rapide, avec test d'étanchéité → [Changement pile](/changement-de-pile-de-montre.html)\n\n✨ **Polissage & restoration** — Bracelet, boîtier, cornes\n\n🕐 **${BIZ.hours}** · 📞 **${BIZ.phone1}**\n\n👉 [Prendre rendez-vous](/prendre-rendez-vous.html)`,
        `**Watch services — Nos Montres, Paris 8th:**\n\n🔧 **Full Rolex service** — Movement disassembly, ultrasonic cleaning, new gaskets, lubrication, regulation, timegrapher + water resistance test. Original Rolex parts only. → [Rolex Service Paris](/revision-Rolex-Paris.html)\n\n🔧 **Audemars Piguet service** — Same expert protocol with original AP parts → [AP Service Paris](/revision-Audemars-Piguet-Paris.html)\n\n🔩 **Rolex repair** — Crown, sapphire crystal, bracelet, dial, hands → [Rolex Repair](/reparation-Rolex-Paris.html)\n\n🔋 **Battery replacement** — All brands, fast, with water resistance test → [Battery change](/changement-de-pile-de-montre.html)\n\n✨ **Polishing & restoration** — Bracelet, case, lugs\n\n🕐 **${BIZ.hoursEn}** · 📞 **${BIZ.phone1}**\n\n👉 [Book an appointment](/prendre-rendez-vous.html)`
      )
    },


    { id: 'investment',
      kw: ['invest','investment','investir','investissement','appreciation','plus-value',
           'best watch to buy','meilleure montre','quelle montre acheter','store of value',
           'placement','watches appreciate','portfolio','return on investment',
           'is a watch a good','should i buy','which watch to buy','which watch should',
           'valeur augmente','prendre de la valeur','montre qui prend de la valeur',
           'watches vs gold','best luxury watch','hold value','holds value',
           'good investment','holds its value','worth buying','worth it','worth the price',
           'which is best investment','meilleur investissement'],
      r: () => t(
        `**Montres de luxe comme investissement — avis d'expert :**\n\n🏆 **Top valeurs refuges (marché secondaire 2024–2025) :**\n\n**Patek Philippe**\n• Nautilus 5711/1A-010 — Retail €28 900 → marché €70k–€145k · discontinué 2021\n• Aquanaut 5167A — Très recherché, €28k–€55k\n• Perpetual Calendar 5140 — Grande complication, €65k–€90k\n\n**Audemars Piguet**\n• Royal Oak 15202ST "Jumbo" — Discontinué, €85k–€150k\n• Royal Oak 15500ST — Icône moderne, €38k–€55k\n• Royal Oak Offshore 26470 Chronographe — €30k–€45k\n\n**Rolex**\n• Daytona 116500LN — Panda/inverse, liste d'attente 5–10 ans, €14k–€21k\n• Submariner 124060 No-Date — €9k–€12k\n• GMT-Master II 126710BLRO "Pepsi" — €12k–€18k\n\n**Richard Mille**\n• RM 011/027/035 — Éditions très limitées, €150k–€1.2M\n\n📊 **Critères de valorisation :** discontinuation · papiers + boîte complets · état neuf/pristine · faible tirage\n\n⚠️ Le marché fluctue. Appelez Gary pour un conseil personnalisé.\n📞 ${BIZ.phone1}`,
        `**Luxury watches as investments — expert view:**\n\n🏆 **Top safe-haven picks (secondary market 2024–2025):**\n\n**Patek Philippe**\n• Nautilus 5711/1A-010 — Retail €28,900 → market €70k–€145k · discontinued 2021\n• Aquanaut 5167A — Highly sought-after, €28k–€55k\n• Perpetual Calendar 5140 — Grand complication, €65k–€90k\n\n**Audemars Piguet**\n• Royal Oak 15202ST "Jumbo" — Discontinued, €85k–€150k\n• Royal Oak 15500ST — Modern icon, €38k–€55k\n• Royal Oak Offshore 26470 Chronograph — €30k–€45k\n\n**Rolex**\n• Daytona 116500LN — Panda/inverse, 5–10 yr waitlist at AD, €14k–€21k\n• Submariner 124060 No-Date — €9k–€12k\n• GMT-Master II 126710BLRO "Pepsi" — €12k–€18k\n\n**Richard Mille**\n• RM 011/027/035 — Very limited editions, €150k–€1.2M\n\n📊 **Value drivers:** discontinuation · full set box & papers · unworn/pristine condition · low production numbers\n\n⚠️ Market fluctuates. Call Gary for personalised advice.\n📞 ${BIZ.phone1}`
      )
    },

    { id: 'authenticity',
      kw: ['authentic','authentique','fake','faux','counterfeit','contrefacon',
           'genuine','verify','verifier','legit','copie','replica','replique',
           'real watch','is it real','is this real','est vraie','est fausse',
           'is it fake','spot a fake','how to spot','tell if real','comment savoir',
           'is my watch real','reconnaître faux','how do i know','authentication',
           'certifier','certificat','true or false'],
      r: () => t(
        `**Authentifier une montre de luxe :**\n\n🔍 **Vérifications par marque :**\n\n**Rolex** — Numéro de série entre les cornes (fond) + numéro de modèle (côté), hologramme vert sur fond (avant 2007), rehaut gravé au laser, logo couronne à 12h précis, aiguille des secondes qui ne tremble pas\n\n**AP Royal Oak** — Vis hexagonales lunette parfaitement alignées, "tapisserie" du cadran parfaitement symétrique, fond transparent gravé AP\n\n**Patek Philippe** — Finition "Côtes de Genève" impeccable, signé sur chaque composant, certificat d'authenticité Patek\n\n**Signes universels de contrefaçon :** tremblement du mouvement · typographie approximative · poids léger · couronne mal filetée · date qui saute brusquement · bracelet avec jeu excessif\n\n✅ **Nos Montres authentifie 100% des pièces** avant achat ou vente — expertise physique en boutique.\n\n📍 ${BIZ.addr} · 📞 ${BIZ.phone1}`,
        `**Authenticating a luxury watch:**\n\n🔍 **Brand-specific checks:**\n\n**Rolex** — Serial between lugs (bottom) + model number (side), green hologram on caseback (pre-2007), laser-engraved rehaut, precise crown logo at 12h, non-trembling seconds hand\n\n**AP Royal Oak** — Perfectly aligned hexagonal screws on bezel, perfectly symmetrical "tapisserie" dial, engraved AP transparent caseback\n\n**Patek Philippe** — Flawless "Côtes de Genève" finishing, signed on every component, Patek authenticity certificate\n\n**Universal counterfeit signs:** movement trembling · approximate typography · light weight · poorly threaded crown · date jumping abruptly · excessive bracelet play\n\n✅ **Nos Montres authenticates 100% of pieces** before any transaction — physical in-store expertise.\n\n📍 ${BIZ.addr} · 📞 ${BIZ.phone1}`
      )
    },

    { id: 'condition',
      kw: ['condition','etat','état','scratches','rayures','worn','usee','polish',
           'mint','unworn','neuve','new old stock','nos','full set','complet',
           'papiers','papers','box','boite','boîte','certificate','certificat',
           'service papers','service history','historique entretien','grade','grading',
           'what condition','what\'s the condition','good condition','poor condition'],
      r: () => t(
        `**Grading et condition — ce que ça change au prix :**\n\n⭐⭐⭐⭐⭐ **Neuve / Unworn (NOS)** — Prix marché plein, parfois prime\n⭐⭐⭐⭐ **Très bon état, ensemble complet** (boîte + papiers + bracelets) — +15–30% vs sans papiers\n⭐⭐⭐ **Bon état avec traces d'usure légères** — Prix marché standard\n⭐⭐ **Nombreuses rayures, boîtier poli** — -10–25% (polissage détruit la valeur collector)\n⭐ **Marqué, manques** — Valeur fortement réduite\n\n📦 **Full set = boîte d'origine + papiers/carte de garantie + bracelet d'origine + livret + ticket de caisse AD**\n\nUne Rolex Submariner 124060 en full set neuve vaut ~€12k, la même sans papiers ~€9.5k.\n\n💡 **Ne jamais polir** une montre de collection — les finitions d'origine (brossé vs poli) sont essentielles à la valeur.\n\n📞 Évaluation gratuite : ${BIZ.phone1}`,
        `**Grading and condition — what it means for price:**\n\n⭐⭐⭐⭐⭐ **New / Unworn (NOS)** — Full market price, sometimes premium\n⭐⭐⭐⭐ **Excellent, full set** (box + papers + bracelets) — +15–30% vs no papers\n⭐⭐⭐ **Good condition with light wear** — Standard market price\n⭐⭐ **Heavy scratches, case polished** — -10–25% (polishing destroys collector value)\n⭐ **Marked, missing parts** — Significantly reduced value\n\n📦 **Full set = original box + papers/warranty card + original bracelet + booklet + AD receipt**\n\nA Rolex Submariner 124060 new full set ~€12k, same watch no papers ~€9.5k.\n\n💡 **Never polish** a collector watch — original finishes (brushed vs polished) are critical to value.\n\n📞 Free evaluation: ${BIZ.phone1}`
      )
    },


    // ═══ ROLEX ═══════════════════════════════════════════════════════════════════

    { id: 'submariner',
      kw: ['submariner','sub','124060','126610','126610ln','126610lv','kermit',
           'hulk','116610','116610lv','116610ln','no date sub','sub date',
           '114060','sub 41','sub 40','submariner date','submariner no date'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'submariner';
        return t(
          `**Rolex Submariner — L'icône de la plongée depuis 1953 🤿**\n\nRéférences actuelles (depuis 2020, boîtier Oyster 41mm) :\n\n🔵 **124060 No-Date** — Lunette noire, cadran noir, bracelet Oyster. Mouvement Cal. 3230. Marché : **€9 000–€12 000**\n\n🟢 **126610LN Date** — Cyclope, lunette noire/cadran noir, Cal. 3235. Marché : **€10 500–€14 000**\n\n🟩 **126610LV "Kermit"** — Lunette verte/cadran noir, hommage au "Kermit" de 1953. Marché : **€12 000–€17 000**\n\n📌 **Anciens modèles recherchés :**\n• 116610LV "Hulk" (cadran ET lunette verts, 2010–2020) → **€14k–€19k**\n• 116610LN (2010–2020, 40mm) → **€8k–€11k**\n• 16610 "transitional" (1989–2010) → €5k–€8k selon état\n\n**Mouvement :** Perpétuel automatique, 70h réserve de marche, étanche 300m, certification COSC + Superlative Chronometer\n\n💡 La Submariner est la montre de plongée la plus iconique du monde et la Rolex la plus vendue.\n\n📞 Estimation gratuite : ${BIZ.phone1}`,
          `**Rolex Submariner — The dive icon since 1953 🤿**\n\nCurrent references (since 2020, Oyster 41mm case):\n\n🔵 **124060 No-Date** — Black bezel, black dial, Oyster bracelet. Movement Cal. 3230. Market: **€9,000–€12,000**\n\n🟢 **126610LN Date** — Cyclops, black bezel/black dial, Cal. 3235. Market: **€10,500–€14,000**\n\n🟩 **126610LV "Kermit"** — Green bezel/black dial, homage to the 1953 "Kermit". Market: **€12,000–€17,000**\n\n📌 **Sought-after vintage refs:**\n• 116610LV "Hulk" (green dial AND bezel, 2010–2020) → **€14k–€19k**\n• 116610LN (2010–2020, 40mm) → **€8k–€11k**\n• 16610 "transitional" (1989–2010) → €5k–€8k depending on condition\n\n**Movement:** Perpetual automatic, 70h power reserve, waterproof 300m, COSC + Superlative Chronometer certified\n\n💡 The Submariner is the world's most iconic dive watch and Rolex's best-selling model.\n\n📞 Free estimate: ${BIZ.phone1}`
        );
      }
    },

    { id: 'daytona',
      kw: ['daytona','116500','126500','116520','panda','cosmograph',
           'daytona chronograph','rolex chrono','116519','116518',
           'white gold daytona','ceramic daytona','paul newman daytona',
           '6239','6241','6263','6265'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'daytona';
        return t(
          `**Rolex Cosmograph Daytona — Le chrono le plus convoité au monde 🏎️**\n\nRéférences actuelles :\n\n⚫ **126500LN** (2023–) — Lunette céramique noire, Cal. 4131, 40mm. Marché : **€15k–€22k**\n⚪ **126500 "Panda"** — Cadran blanc, index noirs. Marché : **€16k–€24k**\n⚫ **116500LN** (2016–2023) — Première Daytona céramique. Marché : **€14k–€21k**\n\n🥇 **Refs Or blanc :**\n• 126509 — Or blanc 18ct, lunette diamants ou céramique → €35k–€50k\n• 116509 — €28k–€40k\n\n📌 **Vintages mythiques :**\n• **Paul Newman 6239/6241/6263** — Cadran exotique, record Sotheby's : $17.8M (Newman 6239 de Paul Newman himself, 2017)\n• 6265 "Big Red" (1969–1987) — Très recherché\n\n**Mouvement Cal. 4131** — Spirale Chronergy, 72h réserve, 70 ans d'histoire\n\n💡 Liste d'attente chez les ADs : 5–10 ans. Le marché gris affiche une prime de 2–3× le prix retail.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Cosmograph Daytona — The world's most coveted chronograph 🏎️**\n\nCurrent references:\n\n⚫ **126500LN** (2023–) — Ceramic black bezel, Cal. 4131, 40mm. Market: **€15k–€22k**\n⚪ **126500 "Panda"** — White dial, black indices. Market: **€16k–€24k**\n⚫ **116500LN** (2016–2023) — First ceramic Daytona. Market: **€14k–€21k**\n\n🥇 **White gold refs:**\n• 126509 — 18ct white gold, diamond or ceramic bezel → €35k–€50k\n• 116509 — €28k–€40k\n\n📌 **Mythic vintages:**\n• **Paul Newman 6239/6241/6263** — Exotic dial, Sotheby's record: $17.8M (Newman's own 6239, 2017)\n• 6265 "Big Red" (1969–1987) — Highly sought after\n\n**Movement Cal. 4131** — Chronergy escapement, 72h power reserve, 70 years of history\n\n💡 AD waitlist: 5–10 years. Grey market trades at 2–3× retail price.\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    { id: 'gmt',
      kw: ['gmt','gmt master','gmt-master','pepsi','batman','root beer','rootbeer',
           'sprite','126710','126711','126715','116710','116713','116718',
           'gmt ii','gmt 2','two timezone','two time zone','dual time',
           'blnr','blro','jubilee gmt','oyster gmt'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'gmt';
        return t(
          `**Rolex GMT-Master II — Le voyageur depuis 1954 ✈️**\n\nCréée à l'origine pour les pilotes Pan American, elle affiche 2 fuseaux horaires simultanément.\n\nRéférences actuelles :\n\n🔴🔵 **126710BLRO "Pepsi"** — Lunette rouge/bleue, bracelet Jubilee. Marché : **€12k–€18k**\n⚫🔵 **126710BLNR "Batman"** — Lunette bleu/noir, Jubilee. Marché : **€11k–€16k**\n🟤 **126715CHNR "Root Beer"** — Or Everose, brun/noir. Marché : **€24k–€32k**\n\nAnciens modèles :\n• 116710BLNR "Batman" (2013–2019) — Marché : **€10k–€14k**\n• 116710BLRO "Pepsi" acier (2007–2019) — Marché : **€11k–€15k**\n• 116718LN "Sprite" or jaune — €25k–€35k\n• 1675 "Pussy Galore" vintage or jaune — Très recherché\n\n**Mouvement Cal. 3285** — 70h réserve, étanche 100m, Jubilee ou Oyster\n\n💡 Les surnoms colorés (Pepsi, Batman) facilitent l'identification sur le marché secondaire.\n\n📞 ${BIZ.phone1}`,
          `**Rolex GMT-Master II — The traveller since 1954 ✈️**\n\nOriginally created for Pan American pilots, it displays 2 time zones simultaneously.\n\nCurrent references:\n\n🔴🔵 **126710BLRO "Pepsi"** — Red/blue bezel, Jubilee bracelet. Market: **€12k–€18k**\n⚫🔵 **126710BLNR "Batman"** — Blue/black bezel, Jubilee. Market: **€11k–€16k**\n🟤 **126715CHNR "Root Beer"** — Everose gold, brown/black. Market: **€24k–€32k**\n\nOlder references:\n• 116710BLNR "Batman" (2013–2019) — Market: **€10k–€14k**\n• 116710BLRO "Pepsi" steel (2007–2019) — Market: **€11k–€15k**\n• 116718LN "Sprite" yellow gold — €25k–€35k\n• 1675 "Pussy Galore" vintage yellow gold — Highly sought after\n\n**Movement Cal. 3285** — 70h power reserve, waterproof 100m, Jubilee or Oyster\n\n💡 The coloured nicknames (Pepsi, Batman) make secondary market identification easy.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'datejust',
      kw: ['datejust','datejust 36','datejust 41','datejust 31','126334','126300',
           'fluted bezel','cannelée','jubilee datejust','rolesor','two-tone',
           'bicolore','turn-o-graph','116234','116200','126233'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'datejust';
        return t(
          `**Rolex Datejust — L'élégance classique depuis 1945 💠**\n\nPremière montre à affichage automatique de la date à travers un guichet — une révolution en 1945.\n\nVersions actuelles :\n\n**Datejust 41 (126300/126334)**\n• Cadran : dizaines de combinaisons (ardoise, moka, blanc, vert, bleu…)\n• Lunette : cannelée or blanc, lunette lisse acier, lunette diamants\n• Bracelet : Oyster ou Jubilee 5 maillons\n• Marché : **€6 500–€11 000** selon métaux et cadran\n\n**Datejust 36 (126200/126233 Rolesor)**\n• Modèle classique bicolore acier/or\n• Marché : **€5 500–€9 000**\n\n💡 La Datejust est la montre la plus polyvalente de Rolex — business, sport, formel. Mouvement Cal. 3235, 70h de réserve.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Datejust — Classic elegance since 1945 💠**\n\nFirst watch to display the date automatically through a window — revolutionary in 1945.\n\nCurrent versions:\n\n**Datejust 41 (126300/126334)**\n• Dial: dozens of combinations (slate, mocha, white, green, blue…)\n• Bezel: fluted white gold, smooth steel, diamond\n• Bracelet: Oyster or 5-link Jubilee\n• Market: **€6,500–€11,000** depending on metals and dial\n\n**Datejust 36 (126200/126233 Rolesor)**\n• Classic two-tone steel/gold\n• Market: **€5,500–€9,000**\n\n💡 The Datejust is Rolex's most versatile watch — business, sport, formal. Movement Cal. 3235, 70h power reserve.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'explorer',
      kw: ['explorer','explorer i','explorer ii','explorer 1','explorer 2',
           '124270','226570','16570','14270','1016','214270',
           'white explorer','orange hand','polar','explorer polar'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'explorer';
        return t(
          `**Rolex Explorer — L'alpiniste depuis 1953 🏔️**\n\n**Explorer I (124270)** — 36mm, acier, cadran noir, index en relief, bracelet Oyster. Cal. 3230, 70h. Marché : **€6 500–€9 000**\n\n**Explorer II (226570)**\n• "Polar" cadran blanc — Marché : **€8 500–€12 000**\n• "Noir" cadran noir — Marché : **€8 000–€11 000**\n• Aiguille 24h orange pour distinguer jour/nuit\n\n📌 **Histoire :** La Explorer I a accompagné Edmund Hillary et Tenzing Norgay lors de la première ascension de l'Everest le 29 mai 1953.\n\nRefs vintage recherchées : 1016 (1963–1989) → €5k–€12k selon état et tritium\n\n📞 ${BIZ.phone1}`,
          `**Rolex Explorer — The alpinist since 1953 🏔️**\n\n**Explorer I (124270)** — 36mm, steel, black dial, raised indices, Oyster bracelet. Cal. 3230, 70h. Market: **€6,500–€9,000**\n\n**Explorer II (226570)**\n• "Polar" white dial — Market: **€8,500–€12,000**\n• "Black" black dial — Market: **€8,000–€11,000**\n• 24h orange hand to distinguish day/night\n\n📌 **History:** The Explorer I accompanied Edmund Hillary and Tenzing Norgay on the first ascent of Everest on 29 May 1953.\n\nSought-after vintage refs: 1016 (1963–1989) → €5k–€12k depending on condition and tritium\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    { id: 'sea_dweller',
      kw: ['sea dweller','sea-dweller','deepsea','deep sea','126600','126660',
           'helium valve','soupape helium','116600','sd43','sd4k'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'sea_dweller';
        return t(
          `**Rolex Sea-Dweller / Deepsea — Pour les plongeurs professionnels 🌊**\n\n**Sea-Dweller 43mm (126600)** — 43mm, étanche 1 220m, soupape hélium, cadran rouge "Sea-Dweller". Marché : **€10k–€14k**\n\n**Deepsea (126660)** — 44mm, étanche **3 900m** (record absolu Rolex), cristal saphir 5.5mm, mouvement Ring Lock. Marché : **€11k–€16k**\n• Version "James Cameron" (cadran dégradé bleu/noir) — Marché : **€12k–€18k**\n\n📌 La soupape hélium évite l'éclatement du verre lors de la décompression en chambre hyperbare.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Sea-Dweller / Deepsea — For professional divers 🌊**\n\n**Sea-Dweller 43mm (126600)** — 43mm, waterproof 1,220m, helium escape valve, red "Sea-Dweller" dial. Market: **€10k–€14k**\n\n**Deepsea (126660)** — 44mm, waterproof **3,900m** (absolute Rolex record), 5.5mm sapphire crystal, Ring Lock movement. Market: **€11k–€16k**\n• "James Cameron" version (blue/black gradient dial) — Market: **€12k–€18k**\n\n📌 The helium escape valve prevents crystal shattering during decompression in hyperbaric chambers.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'yacht_master',
      kw: ['yacht master','yacht-master','126627','126621','126655','226659',
           'yachtmaster','rolesium','oysterflex','platinum bezel rolex'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'yacht_master';
        return t(
          `**Rolex Yacht-Master — Le sportswear de luxe ⛵**\n\n**YM 40 (126621)** — Acier/Everose "Rolesium", lunette platine, bracelet Oysterflex. Marché : **€13k–€18k**\n**YM 42 (226659)** — Or blanc 18ct, lunette céramique noire. Marché : **€35k–€45k**\n**YM 37** — Version femme/unisexe, Everose ou acier\n\n💡 La Yacht-Master se distingue par son cadran légèrement surélevé et sa lunette rotative bi-directionnelle en platine — finition polie unique chez Rolex.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Yacht-Master — Luxury sportswear ⛵**\n\n**YM 40 (126621)** — Steel/Everose "Rolesium", platinum bezel, Oysterflex bracelet. Market: **€13k–€18k**\n**YM 42 (226659)** — 18ct white gold, black ceramic bezel. Market: **€35k–€45k**\n**YM 37** — Ladies/unisex version, Everose or steel\n\n💡 The Yacht-Master stands out with its slightly raised dial and bi-directional rotatable platinum bezel — a unique polished finish in the Rolex lineup.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'day_date',
      kw: ['day date','day-date','president','228235','228239','228238',
           'day date 40','day date 36','228206','118235','118239',
           'rolex president','prestige rolex','ice rolex','diamond rolex'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'day_date';
        return t(
          `**Rolex Day-Date — "The President's Watch" depuis 1956 👑**\n\nPremière montre à afficher le jour en toutes lettres. **Disponible exclusivement en métaux précieux** (or jaune, or blanc, or Everose, platine).\n\n**Day-Date 40 (228235)** — Or Everose 18ct, cadran au choix. Marché : **€28k–€38k**\n**Day-Date 40 (228238)** — Or jaune 18ct. Marché : **€26k–€35k**\n**Day-Date 40 Platine (228206)** — Lunette diamants, cadran météorite. Marché : **€65k+**\n\nBracelet **President** exclusif (créé en 1956 pour Eisenhower) · Plus de 80 cadrans disponibles (nacre, onyx, météorite, malachite, aventurine…)\n\n💡 Portée par JFK, Eisenhower, Nelson Mandela, Lyndon Johnson. Symbole absolu de pouvoir.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Day-Date — "The President's Watch" since 1956 👑**\n\nFirst watch to display the day spelled out. **Available exclusively in precious metals** (yellow gold, white gold, Everose gold, platinum).\n\n**Day-Date 40 (228235)** — 18ct Everose gold, dial to choose. Market: **€28k–€38k**\n**Day-Date 40 (228238)** — 18ct yellow gold. Market: **€26k–€35k**\n**Day-Date 40 Platinum (228206)** — Diamond bezel, meteorite dial. Market: **€65k+**\n\nExclusive **President** bracelet (created in 1956 for Eisenhower) · Over 80 dials available (mother-of-pearl, onyx, meteorite, malachite, aventurine…)\n\n💡 Worn by JFK, Eisenhower, Nelson Mandela, Lyndon Johnson. The ultimate symbol of power.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'milgauss',
      kw: ['milgauss','116400','116400gv','anti-magnetic','antimagnetic',
           'lightning bolt','eclair','green crystal','verre vert milgauss'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'milgauss';
        return t(
          `**Rolex Milgauss — La montre des scientifiques ⚡**\n\nDésignée en 1956 pour les physiciens du CERN, résiste à 1 000 gauss (champs magnétiques extrêmes).\n\n**116400GV** (verre vert caractéristique) — Aiguille des secondes en éclair orange, cadran noir ou blanc. Marché : **€8k–€11k**\n**116400** (verre neutre) — Marché : **€7k–€10k**\n\n📌 **Discontinuée en 2023** — les prix montent progressivement. Blinded à l'œil du public pendant 30 ans, relancée au Salon de Bâle 2007 avec grand succès.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Milgauss — The scientist's watch ⚡**\n\nDesigned in 1956 for CERN physicists, resists 1,000 gauss (extreme magnetic fields).\n\n**116400GV** (distinctive green crystal) — Orange lightning bolt seconds hand, black or white dial. Market: **€8k–€11k**\n**116400** (clear crystal) — Market: **€7k–€10k**\n\n📌 **Discontinued in 2023** — prices rising steadily. Hidden from the public for 30 years, relaunched at Basel 2007 to great success.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'sky_dweller',
      kw: ['sky dweller','sky-dweller','326934','326935','326938','annual calendar rolex',
           'fluted rolex','ringcommand','ring command'],
      r: () => {
        ctx.brand = 'rolex'; ctx.model = 'sky_dweller';
        return t(
          `**Rolex Sky-Dweller — Le globe-trotter bizone 🌍**\n\nLa montre la plus complexe de Rolex : double fuseau horaire + calendrier annuel. Système **Ring Command** = la lunette externe règle les fonctions.\n\n**326934** (acier/blanc, lunette cannelée or blanc) — Marché : **€18k–€25k**\n**326935** (Everose, bracelet cuir) — Marché : **€22k–€30k**\n**326938** (or blanc 18ct) — Marché : **€38k–€50k**\n\n💡 Le calendrier annuel ne nécessite qu'un seul réglage par an (fin février). Le fuseau local s'affiche sur le disque 24h.\n\n📞 ${BIZ.phone1}`,
          `**Rolex Sky-Dweller — The globe-trotter dual-time 🌍**\n\nRolex's most complex watch: dual time zone + annual calendar. **Ring Command** system = the outer bezel adjusts the functions.\n\n**326934** (steel/white, fluted white gold bezel) — Market: **€18k–€25k**\n**326935** (Everose, leather strap) — Market: **€22k–€30k**\n**326938** (18ct white gold) — Market: **€38k–€50k**\n\n💡 The annual calendar only needs one correction per year (end of February). The local time zone is displayed on the 24h disc.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'rolex',
      kw: ['rolex','crown','couronne','oyster','perpetual','superlative chronometer',
           'rolex history','histoire rolex','hans wilsdorf','tudor','rolex bracelet',
           'how to buy rolex','acheter rolex','rolex ad','rolex price','prix rolex',
           'rolex steel','rolex gold','rolex value','valeur rolex'],
      r: () => {
        ctx.brand = 'rolex';
        return t(
          `**Rolex — L'horlogerie de référence mondiale 👑**\n\nFondée en 1905 à Londres par Hans Wilsdorf, aujourd'hui basée à Genève. ~1 million de montres/an, chiffre d'affaires estimé ~€9 milliards.\n\n**Collection complète :**\n🤿 Plongée : Submariner · Sea-Dweller · Deepsea\n⏱️ Chronographe : Cosmograph Daytona\n✈️ Voyage : GMT-Master II · Sky-Dweller\n🏔️ Aventure : Explorer I & II\n⚡ Technique : Milgauss\n💠 Classique : Datejust · Day-Date · Lady-Datejust\n⛵ Nautique : Yacht-Master I & II · Air-King\n\n**Fourchettes de prix (secondaire) :**\n• Entrée de gamme : Air-King ~€6k–€8k\n• Milieu : Submariner €9k–€14k · GMT €10k–€18k\n• Haut de gamme : Daytona €14k–€22k · Day-Date €26k–€50k+\n\n💡 Demandez-moi n'importe quel modèle spécifique !\n\n📞 ${BIZ.phone1}`,
          `**Rolex — The world's reference watchmaker 👑**\n\nFounded in 1905 in London by Hans Wilsdorf, now based in Geneva. ~1 million watches/year, estimated revenue ~€9 billion.\n\n**Complete collection:**\n🤿 Diving: Submariner · Sea-Dweller · Deepsea\n⏱️ Chronograph: Cosmograph Daytona\n✈️ Travel: GMT-Master II · Sky-Dweller\n🏔️ Adventure: Explorer I & II\n⚡ Technical: Milgauss\n💠 Classic: Datejust · Day-Date · Lady-Datejust\n⛵ Nautical: Yacht-Master I & II · Air-King\n\n**Price ranges (secondary market):**\n• Entry: Air-King ~€6k–€8k\n• Mid: Submariner €9k–€14k · GMT €10k–€18k\n• High-end: Daytona €14k–€22k · Day-Date €26k–€50k+\n\n💡 Ask me about any specific model!\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ AUDEMARS PIGUET ══════════════════════════════════════════════════════════

    { id: 'royal_oak',
      kw: ['royal oak','royaloak','15500','15202','15400','15300','jumbo',
           'gerald genta','genta','tapisserie','royal oak history','histoire royal oak',
           '50th anniversary','50eme anniversaire royal oak','grande tapisserie',
           'ap royal oak','royal oak steel','royal oak ref'],
      r: () => {
        ctx.brand = 'ap'; ctx.model = 'royal_oak';
        return t(
          `**Audemars Piguet Royal Oak — La montre sport-chic qui a tout changé ⬡**\n\nDesignée par **Gérald Genta** en une seule nuit en 1972, lancée à 3 300 CHF — scandale à l'époque pour une montre sport en acier. Aujourd'hui l'une des montres les plus précieuses au monde.\n\n**Références actuelles :**\n\n⬡ **15500ST.OO.1220ST** (acier, cadran ardoise/bleu) — 41mm, Cal. 4302, 70h. Marché : **€38k–€55k**\n⬡ **15202ST "Jumbo/Extra-Thin"** — 39mm, 8.1mm d'épaisseur, Cal. 2121 (partagé avec Patek 5711). **Discontinué en 2022.** Marché : **€85k–€150k**\n⬡ **26240 Chronographe** — Cadran tapisserie, 41mm. Marché : **€48k–€70k**\n⬡ **15400ST** (2012–2021) — Précurseur du 15500. Marché : **€28k–€40k**\n\n**Détails iconiques :**\n• 8 vis hexagonales sur la lunette intégrée (lunette octogonale)\n• Cadran "Grande Tapisserie" (motif chevron en relief)\n• Bracelet intégré "bracelet intégré" — révolutionnaire en 1972\n• Finition mixte : brossé (méplats) + poli (chanfreins)\n\n💎 **50e anniversaire (2022)** — Éditions spéciales séries 1, 2, 3 en acier/or/titane, très recherchées.\n\n📞 ${BIZ.phone1}`,
          `**Audemars Piguet Royal Oak — The sport-chic watch that changed everything ⬡**\n\nDesigned by **Gérald Genta** in a single night in 1972, launched at CHF 3,300 — scandalous at the time for a sport watch in steel. Today one of the world's most valuable watches.\n\n**Current references:**\n\n⬡ **15500ST.OO.1220ST** (steel, slate/blue dial) — 41mm, Cal. 4302, 70h. Market: **€38k–€55k**\n⬡ **15202ST "Jumbo/Extra-Thin"** — 39mm, 8.1mm thick, Cal. 2121 (shared with Patek 5711). **Discontinued 2022.** Market: **€85k–€150k**\n⬡ **26240 Chronograph** — Tapisserie dial, 41mm. Market: **€48k–€70k**\n⬡ **15400ST** (2012–2021) — Predecessor to 15500. Market: **€28k–€40k**\n\n**Iconic details:**\n• 8 hexagonal screws on the integrated bezel (octagonal bezel)\n• "Grande Tapisserie" dial (raised chevron pattern)\n• Integrated "integrated bracelet" — revolutionary in 1972\n• Mixed finishing: brushed (flats) + polished (bevels)\n\n💎 **50th anniversary (2022)** — Special series 1, 2, 3 in steel/gold/titanium, highly sought-after.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'offshore',
      kw: ['offshore','royal oak offshore','26470','26471','26480','26401',
           'offshore chronograph','offshore diver','offshore ref','ap offshore'],
      r: () => {
        ctx.brand = 'ap'; ctx.model = 'offshore';
        return t(
          `**Audemars Piguet Royal Oak Offshore — Le "Beast" de 1993 💪**\n\nDesigné par Emmanuel Gueit, lancé en 1993 comme une version XL musclée du Royal Oak — surnommé "The Beast" par les puristes. Boîtier 42–44mm vs 39mm du RO original.\n\n**Références phares :**\n• **26470ST Chronographe** — 42mm acier, Cal. 3126/3840. Marché : **€28k–€40k**\n• **26471SR** — Céramique/acier, cadran orange signature. Marché : **€35k–€48k**\n• **26480TI Titane** — Ultra léger, cadran bleu. Marché : **€30k–€42k**\n• **Diver 15703** — Version plongée 300m. Marché : **€22k–€32k**\n\n💡 L'Offshore est très personnalisable (caoutchouc, cuir, métal) et extrêmement populaire en éditions limitées.\n\n📞 ${BIZ.phone1}`,
          `**Audemars Piguet Royal Oak Offshore — "The Beast" since 1993 💪**\n\nDesigned by Emmanuel Gueit, launched in 1993 as an XL muscular version of the Royal Oak — nicknamed "The Beast" by purists. 42–44mm case vs 39mm original RO.\n\n**Key references:**\n• **26470ST Chronograph** — 42mm steel, Cal. 3126/3840. Market: **€28k–€40k**\n• **26471SR** — Ceramic/steel, signature orange dial. Market: **€35k–€48k**\n• **26480TI Titanium** — Ultra light, blue dial. Market: **€30k–€42k**\n• **Diver 15703** — 300m dive version. Market: **€22k–€32k**\n\n💡 The Offshore is highly customisable (rubber, leather, metal) and very popular in limited editions.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'ap',
      kw: ['audemars','audemars piguet','ap watch','ap prix','ap history',
           'le brassus','code 11.59','code1159','millenary','ap collection',
           'ap movement','ap calibre','ap complicated'],
      r: () => {
        ctx.brand = 'ap';
        return t(
          `**Audemars Piguet — Manufacture depuis 1875, Le Brassus (Vallée de Joux) ⬡**\n\nFondée par Jules-Louis Audemars et Edward-Auguste Piguet. L'une des rares manufactures entièrement familiales encore indépendantes.\n\n**Collections principales :**\n⬡ **Royal Oak** — Icône sport-luxe depuis 1972\n💪 **Royal Oak Offshore** — XL sportif depuis 1993\n🔵 **Code 11.59** — Collection contemporaine 2019\n🌊 **Royal Oak Concept** — Mouvements skeletonisés avant-garde\n⏰ **Millenary** — Cadran ovale, compteurs asymétriques\n\n**Fourchettes de prix :**\n• Code 11.59 : €22k–€35k\n• Royal Oak acier : €38k–€55k\n• Royal Oak Offshore : €25k–€48k\n• Royal Oak Jumbo : €85k–€150k\n\n💡 AP fabrique ~40 000 montres/an — parmi les plus rares du segment ultra-luxe.\n\n📞 ${BIZ.phone1}`,
          `**Audemars Piguet — Manufacture since 1875, Le Brassus (Vallée de Joux) ⬡**\n\nFounded by Jules-Louis Audemars and Edward-Auguste Piguet. One of the few still fully family-owned and independent manufactures.\n\n**Main collections:**\n⬡ **Royal Oak** — Sport-luxury icon since 1972\n💪 **Royal Oak Offshore** — XL sporty since 1993\n🔵 **Code 11.59** — Contemporary collection 2019\n🌊 **Royal Oak Concept** — Avant-garde skeletonised movements\n⏰ **Millenary** — Oval case, asymmetric counters\n\n**Price ranges:**\n• Code 11.59: €22k–€35k\n• Royal Oak steel: €38k–€55k\n• Royal Oak Offshore: €25k–€48k\n• Royal Oak Jumbo: €85k–€150k\n\n💡 AP makes ~40,000 watches/year — among the rarest in the ultra-luxury segment.\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ PATEK PHILIPPE ══════════════════════════════════════════════════════════

    { id: 'nautilus',
      kw: ['nautilus','5711','5712','5726','5980','5990','5711 1a','5711/1a',
           'nautilus discontinued','nautilus prix','nautilus value',
           'patek nautilus','tiffany nautilus','tiffany blue'],
      r: () => {
        ctx.brand = 'patek'; ctx.model = 'nautilus';
        return t(
          `**Patek Philippe Nautilus — L'objet de désir absolu depuis 1976 💙**\n\nDesignée par **Gérald Genta** (même auteur que le Royal Oak), lancée en 1976 à un prix choquant. Aujourd'hui le Saint Graal de l'horlogerie moderne.\n\n**5711/1A-010** — 40mm acier, cadran bleu rayé, Cal. 324 SC, bracelet intégré. **Discontinuée en janvier 2021.** Prix retail : €28 900. Marché actuel : **€70k–€145k** (selon état + full set)\n\n**5712/1A** — Nautilus avec complication moonphase + date. Marché : **€55k–€85k**\n**5726/1A** — Annual Calendar. Marché : **€65k–€100k**\n**5980/1AR** — Chronographe flyback Everose/acier. Marché : **€95k–€140k**\n\n🔵 **Tiffany Blue (5711/1A-018)** — Cadran vert Tiffany, 170 pièces pour 170 ans Tiffany. Vente Phillps 2021 : **$6.5M** pour une seule pièce.\n\n📌 Le cadran à lignes horizontales "en relief" est une signature inimitable.\n\nMouvement Cal. 324 SC : fin 3.3mm, 45h réserve, 30 rubis.\n\n📞 ${BIZ.phone1}`,
          `**Patek Philippe Nautilus — The ultimate object of desire since 1976 💙**\n\nDesigned by **Gérald Genta** (same designer as the Royal Oak), launched in 1976 at a shocking price. Today the Holy Grail of modern watchmaking.\n\n**5711/1A-010** — 40mm steel, blue striped dial, Cal. 324 SC, integrated bracelet. **Discontinued January 2021.** Retail price: €28,900. Current market: **€70k–€145k** (depending on condition + full set)\n\n**5712/1A** — Nautilus with moonphase + date complication. Market: **€55k–€85k**\n**5726/1A** — Annual Calendar. Market: **€65k–€100k**\n**5980/1AR** — Flyback chronograph Everose/steel. Market: **€95k–€140k**\n\n🔵 **Tiffany Blue (5711/1A-018)** — Tiffany green dial, 170 pieces for Tiffany's 170th anniversary. Phillips 2021 auction: **$6.5M** for a single piece.\n\n📌 The signature horizontally embossed dial lines are unmistakable.\n\nMovement Cal. 324 SC: thin 3.3mm, 45h power reserve, 30 jewels.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'aquanaut',
      kw: ['aquanaut','5167','5168','5164','5065','aquanaut travel time',
           'patek sport','patek rubber','aquanaut chronograph','5968'],
      r: () => {
        ctx.brand = 'patek'; ctx.model = 'aquanaut';
        return t(
          `**Patek Philippe Aquanaut — Le sport moderne depuis 1997 🌊**\n\nLancé en 1997 comme alternative plus accessible à la Nautilus, boîtier 8-côtés arrondi et bracelet tropical composite.\n\n**5167A-001** — 40mm acier, cadran noir ou olive. Marché : **€25k–€45k**\n**5168G-010** — Or blanc 18ct, cadran aqua blue. Marché : **€55k–€80k**\n**5164A Travel Time** — Fuseau horaire double. Marché : **€38k–€60k**\n**5968A Chronographe** — Très rare, très recherché. Marché : **€80k–€120k**\n\n💡 L'Aquanaut "Tiffany" 5167A-025 (cadran Tiffany blue) : adjugée $1.65M chez Sotheby's 2022.\n\n📞 ${BIZ.phone1}`,
          `**Patek Philippe Aquanaut — Modern sport since 1997 🌊**\n\nLaunched in 1997 as a more accessible alternative to the Nautilus, with a rounded octagonal case and composite tropical bracelet.\n\n**5167A-001** — 40mm steel, black or olive dial. Market: **€25k–€45k**\n**5168G-010** — 18ct white gold, aqua blue dial. Market: **€55k–€80k**\n**5164A Travel Time** — Dual time zone. Market: **€38k–€60k**\n**5968A Chronograph** — Very rare, highly sought-after. Market: **€80k–€120k**\n\n💡 The Aquanaut "Tiffany" 5167A-025 (Tiffany blue dial): sold for $1.65M at Sotheby's 2022.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'calatrava',
      kw: ['calatrava','5227','5196','5119','5153','6119','calatrava ref',
           'dress watch patek','patek dress','patek round','patek simple',
           'thin patek','montre habillée patek'],
      r: () => {
        ctx.brand = 'patek'; ctx.model = 'calatrava';
        return t(
          `**Patek Philippe Calatrava — Le dress watch ultime depuis 1932 🔵**\n\nInspirée de la Croix de Calatrava (emblème Patek depuis 1887), c'est l'archétype de la montre habillée ronde.\n\n**5227G** — Or blanc 18ct, 39mm, Cal. 324, fond miroir. Marché : **€28k–€40k**\n**5196G** — Or blanc, 37mm, Cal. 215 PS, ultra-fine. Marché : **€24k–€35k**\n**6119G** — Or blanc, cadran guilloché. Marché : **€22k–€32k**\n**5153G** — Clous de Paris guilloché. Marché : **€30k–€42k**\n\n💡 La Calatrava est le symbole de l'élégance intemporelle. Un seul cadran, sans complications inutiles — la perfection par la simplicité.\n\n📞 ${BIZ.phone1}`,
          `**Patek Philippe Calatrava — The ultimate dress watch since 1932 🔵**\n\nInspired by the Calatrava Cross (Patek emblem since 1887), it is the archetype of the round dress watch.\n\n**5227G** — 18ct white gold, 39mm, Cal. 324, mirror caseback. Market: **€28k–€40k**\n**5196G** — White gold, 37mm, Cal. 215 PS, ultra-thin. Market: **€24k–€35k**\n**6119G** — White gold, guillochéd dial. Market: **€22k–€32k**\n**5153G** — Clous de Paris guillochéd. Market: **€30k–€42k**\n\n💡 The Calatrava is the symbol of timeless elegance. One dial, no unnecessary complications — perfection through simplicity.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'patek_complications',
      kw: ['minute repeater','repetition minute','répétition minutes','sonnerie',
           'perpetual calendar','calendrier perpetuel','tourbillon patek',
           'grand complication','5270','5236','5327','5207','5531','5216',
           'sky moon','celestial','split second','rattrapante'],
      r: () => {
        ctx.brand = 'patek'; ctx.model = 'complications';
        return t(
          `**Patek Philippe Grandes Complications — Le sommet de l'horlogerie 🏆**\n\nPatek est le maître incontesté des complications. Chaque Grande Complication représente des milliers d'heures de travail.\n\n⏰ **Répétition Minutes (5207P)** — Platine, tourbillon + calendrier perpétuel + répétition minutes. Prix retail : ~€1.5M. Marché : **€2M–€4M+**\n\n📅 **Calendrier Perpétuel (5327G)** — Or blanc, Cal. 240 Q. Marché : **€85k–€120k**\n\n📅 **Annual Calendar (5396G)** — Se règle 1×/an. Marché : **€45k–€65k**\n\n🌙 **Moonphase (5396R)** — Annual cal. + moonphase. Marché : **€50k–€75k**\n\n⏱️ **Rattrapante 5370P** — Chronographe rattrapante platine. Marché : **€250k–€400k**\n\n🌌 **Celestial 6104G** — Ciel étoilé selon hémisphère, orbite lunaire. Marché : **€400k+**\n\n🏆 **Grandmaster Chime** — 20 complications dont 5 sonneries. Record absolu : Ref. 6300A vendue **$31M** chez Christie's 2019.\n\n📞 ${BIZ.phone1}`,
          `**Patek Philippe Grand Complications — The pinnacle of watchmaking 🏆**\n\nPatek is the undisputed master of complications. Each Grand Complication represents thousands of hours of work.\n\n⏰ **Minute Repeater (5207P)** — Platinum, tourbillon + perpetual calendar + minute repeater. Retail: ~€1.5M. Market: **€2M–€4M+**\n\n📅 **Perpetual Calendar (5327G)** — White gold, Cal. 240 Q. Market: **€85k–€120k**\n\n📅 **Annual Calendar (5396G)** — Corrected once a year. Market: **€45k–€65k**\n\n🌙 **Moonphase (5396R)** — Annual cal. + moonphase. Market: **€50k–€75k**\n\n⏱️ **Split-second 5370P** — Platinum rattrapante chronograph. Market: **€250k–€400k**\n\n🌌 **Celestial 6104G** — Star sky by hemisphere, lunar orbit. Market: **€400k+**\n\n🏆 **Grandmaster Chime** — 20 complications including 5 chimes. Absolute record: Ref. 6300A sold for **$31M** at Christie's 2019.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'patek',
      kw: ['patek','patek philippe','geneve','genève','stern','thierry stern',
           'patek history','histoire patek','patek collection','patek movement',
           'patek prix','patek price','patek value'],
      r: () => {
        ctx.brand = 'patek';
        return t(
          `**Patek Philippe — "You never actually own a Patek Philippe…" 🏆**\n\nFondée à Genève en 1839 par Antoine Norbert de Patek et Adrien Philippe. Entièrement familiale (famille Stern depuis 1932). ~70 000 montres/an.\n\n**Collections :**\n💙 **Nautilus** — Icône sport-luxe, marché €25k–€145k\n🌊 **Aquanaut** — Sport moderne, €25k–€120k\n🔵 **Calatrava** — Dress watch ultime, €22k–€42k\n📿 **Twenty~4** — Collection féminine\n🏆 **Grandes Complications** — Répétition, tourbillon, calendrier perpétuel\n\n**Marché secondaire :** Patek Philippe est la marque dont la valeur de revente est la plus élevée toutes marques confondues.\n\n💡 Astuce : Les modèles en acier inoxydable (5711/1A, 5167A) ont souvent une prime > or — rareté inversée.\n\n📞 ${BIZ.phone1}`,
          `**Patek Philippe — "You never actually own a Patek Philippe…" 🏆**\n\nFounded in Geneva in 1839 by Antoine Norbert de Patek and Adrien Philippe. Entirely family-owned (Stern family since 1932). ~70,000 watches/year.\n\n**Collections:**\n💙 **Nautilus** — Sport-luxury icon, market €25k–€145k\n🌊 **Aquanaut** — Modern sport, €25k–€120k\n🔵 **Calatrava** — Ultimate dress watch, €22k–€42k\n📿 **Twenty~4** — Ladies' collection\n🏆 **Grand Complications** — Repeater, tourbillon, perpetual calendar\n\n**Secondary market:** Patek Philippe has the highest resale value of any watch brand.\n\n💡 Tip: Stainless steel models (5711/1A, 5167A) often command a premium over gold — inverse rarity.\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ RICHARD MILLE ═══════════════════════════════════════════════════════════

    { id: 'rm027',
      kw: ['rm027','rm 027','rm-027','nadal tourbillon','tourbillon nadal',
           'lightest watch','montre la plus legere','20 grams','20 grammes'],
      r: () => {
        ctx.brand = 'rm'; ctx.model = 'rm027';
        return t(
          `**Richard Mille RM 027 — Le tourbillon de Rafael Nadal 🎾**\n\nCréée spécialement pour que Nadal la porte en jouant à Roland Garros — une prouesse technique absolue.\n\n• **Poids : ~20g** (montre + bracelet) — plus légère qu'une balle de tennis\n• Boîtier NTPT Carbon (fibres de carbone en couches croisées)\n• Tourbillon manuel, 70h réserve\n• Résiste aux accélérations de service tennis (~5 000G)\n• Production : **~10–15 pièces/an**\n• Marché : **€500k–€1.2M** selon numéro de série et provenance\n\n📌 RM 027.01 (2010) · RM 027.02 (2012) · RM 027.03 "Americas" (2013)\n\nNadal a porté cette montre à poignet droit pendant plus de 10 ans de Roland Garros.\n\n📞 ${BIZ.phone1}`,
          `**Richard Mille RM 027 — Rafael Nadal's tourbillon 🎾**\n\nCreated specifically for Nadal to wear while playing at Roland Garros — an absolute technical feat.\n\n• **Weight: ~20g** (watch + strap) — lighter than a tennis ball\n• NTPT Carbon case (cross-layered carbon fibre)\n• Manual tourbillon, 70h power reserve\n• Withstands tennis serve accelerations (~5,000G)\n• Production: **~10–15 pieces/year**\n• Market: **€500k–€1.2M** depending on serial number and provenance\n\n📌 RM 027.01 (2010) · RM 027.02 (2012) · RM 027.03 "Americas" (2013)\n\nNadal wore this watch on his right wrist for over 10 years at Roland Garros.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'rm011',
      kw: ['rm011','rm 011','rm-011','felipe massa','rm11','flyback chronograph rm',
           'rm011 titanium','rm011 ntpt'],
      r: () => {
        ctx.brand = 'rm'; ctx.model = 'rm011';
        return t(
          `**Richard Mille RM 011 — Le chronographe F1 de Felipe Massa 🏎️**\n\nL'une des premières RM à grande complication, lancée en 2007 en partenariat avec Felipe Massa (Ferrari F1).\n\n• Chronographe flyback + calendrier annuel\n• Boîtier titane ou NTPT Carbon, 50×40mm\n• Cal. RMAC1/RMAC3, ~70h réserve\n• Résiste à 7 000G — développé pour survivre aux impacts de F1\n• Production : ~20–30 pièces/an selon matériaux\n• Marché : **€180k–€350k** (titane) · **€280k–€480k** (NTPT)\n\n💡 Versions spéciales : "Flyback Felipe Massa", "Asia Limited Edition", "Lotus F1"\n\n📞 ${BIZ.phone1}`,
          `**Richard Mille RM 011 — Felipe Massa's F1 chronograph 🏎️**\n\nOne of the first RM grand complications, launched in 2007 in partnership with Felipe Massa (Ferrari F1).\n\n• Flyback chronograph + annual calendar\n• Titanium or NTPT Carbon case, 50×40mm\n• Cal. RMAC1/RMAC3, ~70h power reserve\n• Withstands 7,000G — developed to survive F1 impacts\n• Production: ~20–30 pieces/year depending on materials\n• Market: **€180k–€350k** (titanium) · **€280k–€480k** (NTPT)\n\n💡 Special versions: "Flyback Felipe Massa", "Asia Limited Edition", "Lotus F1"\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'rm035',
      kw: ['rm035','rm 035','rm-035','rm055','rm 055','rm052','rm 052',
           'rm056','rm 056','rm030','rm 030','rm010','rm 010'],
      r: () => {
        ctx.brand = 'rm'; ctx.model = 'rm035';
        return t(
          `**Richard Mille RM 035 / 055 — L'ultra-léger de Nadal 🎾**\n\n**RM 035 "Americas"** — Tourbillon manuel, NTPT Carbon, ~38g. Produit pour les marchés Amériques. Marché : **€350k–€600k**\n\n**RM 055 "Bubba Watson"** — Tourbillon, NTPT, manuel, version golf. Marché : **€380k–€650k**\n\n**RM 052 "Skull"** — Tourbillon, cadran tête de mort sculptée. Très recherché. Marché : **€600k–€1M**\n\n**RM 056 "Sapphire"** — Boîtier entier en verre saphir cristallisé (10 200h d'usinage). Marché : **€1.5M–€2.5M**\n\n📞 ${BIZ.phone1}`,
          `**Richard Mille RM 035 / 055 — Nadal's ultra-light 🎾**\n\n**RM 035 "Americas"** — Manual tourbillon, NTPT Carbon, ~38g. Made for Americas markets. Market: **€350k–€600k**\n\n**RM 055 "Bubba Watson"** — Tourbillon, NTPT, manual, golf version. Market: **€380k–€650k**\n\n**RM 052 "Skull"** — Tourbillon, sculpted skull dial. Highly sought after. Market: **€600k–€1M**\n\n**RM 056 "Sapphire"** — Entire case in crystallised sapphire glass (10,200h machining). Market: **€1.5M–€2.5M**\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'rm',
      kw: ['richard mille','rm watch','rm prix','rm price','richard mille history',
           'jean todt','todt richard mille','rm movement','rm carbon','rm ceramic',
           'rm bracelet','rm rubber','richard mille collection'],
      r: () => {
        ctx.brand = 'rm';
        return t(
          `**Richard Mille — L'horlogerie haute performance depuis 2001 🏎️**\n\nFondée en 2001 par Richard Mille (Français) et Dominique Guenat. Basée à Les Breuleux, Jura suisse. Production : ~5 000 montres/an — les plus rares du marché.\n\n**Collections phares :**\n🎾 **RM 027/035** — Tourbillon ultra-léger Nadal\n🏎️ **RM 011** — Chronographe F1\n💀 **RM 052** — Skull Tourbillon\n💎 **RM 056** — Boîtier saphir\n🌺 **RM 07** — Collection féminine\n⌚ **RM 67** — Automatique ultra-plat\n\n**Caractéristiques signature RM :**\n• NTPT Carbon (carbone nano)\n• Grade 5 Titanium\n• Tonneau case asymétrique\n• Architecture "skeletonisée" visible\n• Résistance aux chocs extrêmes\n\n**Fourchettes de prix :**\n• Entrée RM : €80k–€150k\n• RM complications : €200k–€600k\n• Pièces uniques / saphir : €1M–€2.5M+\n\n📞 ${BIZ.phone1}`,
          `**Richard Mille — High-performance watchmaking since 2001 🏎️**\n\nFounded in 2001 by Richard Mille (French) and Dominique Guenat. Based in Les Breuleux, Swiss Jura. Production: ~5,000 watches/year — the rarest on the market.\n\n**Flagship collections:**\n🎾 **RM 027/035** — Ultra-light Nadal tourbillon\n🏎️ **RM 011** — F1 chronograph\n💀 **RM 052** — Skull Tourbillon\n💎 **RM 056** — Sapphire case\n🌺 **RM 07** — Ladies' collection\n⌚ **RM 67** — Ultra-flat automatic\n\n**RM signature features:**\n• NTPT Carbon (nano carbon)\n• Grade 5 Titanium\n• Asymmetric tonneau case\n• Visible skeletonised architecture\n• Extreme shock resistance\n\n**Price ranges:**\n• Entry RM: €80k–€150k\n• RM complications: €200k–€600k\n• Unique pieces / sapphire: €1M–€2.5M+\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ CARTIER ══════════════════════════════════════════════════════════════════

    { id: 'santos',
      kw: ['santos','santos de cartier','santos 100','santos dumont','santos xl',
           'santos medium','wssa0018','wssa0029','santos history','1904 santos',
           'alberto santos dumont','first pilot watch'],
      r: () => {
        ctx.brand = 'cartier'; ctx.model = 'santos';
        return t(
          `**Cartier Santos — La première montre-bracelet d'aviateur, 1904 ✈️**\n\nCréée par Louis Cartier pour son ami **Alberto Santos-Dumont** (pionnier brésilien de l'aviation) qui avait besoin de lire l'heure sans lâcher les commandes de son avion. Première montre-bracelet "sport" au monde.\n\n**Santos actuels :**\n• **WSSA0018** (Moyen, acier, cadran blanc) — Marché : **€5k–€7.5k**\n• **WSSA0029** (Moyen, acier/or jaune) — Marché : **€6k–€9k**\n• **WSSA0009** (XL, acier) — Marché : **€5.5k–€8k**\n\n**Système QuickSwitch** (depuis 2018) — changement bracelet sans outil\n\n📌 Cadran carré avec vis apparentes (hommage aux vis de boîtier d'avion), index chemin de fer, aiguilles en épée.\n\n💡 La Santos est le symbole de la montre-bracelet moderne — elle a changé la façon dont les hommes portent les montres.\n\n📞 ${BIZ.phone1}`,
          `**Cartier Santos — The first aviator wristwatch, 1904 ✈️**\n\nCreated by Louis Cartier for his friend **Alberto Santos-Dumont** (Brazilian aviation pioneer) who needed to read the time without releasing his aircraft controls. The world's first "sport" wristwatch.\n\n**Current Santos:**\n• **WSSA0018** (Medium, steel, white dial) — Market: **€5k–€7.5k**\n• **WSSA0029** (Medium, steel/yellow gold) — Market: **€6k–€9k**\n• **WSSA0009** (XL, steel) — Market: **€5.5k–€8k**\n\n**QuickSwitch system** (since 2018) — bracelet change without tools\n\n📌 Square dial with visible screws (tribute to aircraft case screws), railway track indices, sword-shaped hands.\n\n💡 The Santos is the symbol of the modern wristwatch — it changed how men wear watches.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'tank',
      kw: ['tank','tank cartier','tank solo','tank must','tank louis cartier',
           'tank americaine','tank francaise','ctank','wsta0041','w5200028',
           'tank history','1917 tank','ww1 cartier'],
      r: () => {
        ctx.brand = 'cartier'; ctx.model = 'tank';
        return t(
          `**Cartier Tank — Le génie géométrique de 1917 🎖️**\n\nDesignée par Louis Cartier en 1917, inspirée de la silhouette aérienne des chars Renault FT-17 de la Première Guerre mondiale. Bracelet intégré au boîtier, lignes perpendiculaires — révolutionnaire.\n\n**Versions actuelles :**\n• **Tank Must** (2021 relaunch) — Acier, cadran vert/bordeaux/noir. Marché : **€2.5k–€4.5k** · Version solaire (sans pile)\n• **Tank Louis Cartier** — Or 18ct, ultra-classique. Marché : **€12k–€22k**\n• **Tank Française** — Maillons intégrés arrondis. Marché : **€4k–€8k**\n• **Tank Américaine** — Boîtier bombé, manchette. Marché : **€5k–€10k**\n\n📌 Portée par : Jacqueline Kennedy Onassis, Andy Warhol, Princess Diana, Yves Saint Laurent, Michelle Obama.\n\n💡 La Tank est l'une des montres les plus copiées au monde — mais rien n'égale l'original.\n\n📞 ${BIZ.phone1}`,
          `**Cartier Tank — The geometric genius of 1917 🎖️**\n\nDesigned by Louis Cartier in 1917, inspired by the aerial silhouette of Renault FT-17 tanks from World War I. Bracelet integrated into the case, perpendicular lines — revolutionary.\n\n**Current versions:**\n• **Tank Must** (2021 relaunch) — Steel, green/burgundy/black dial. Market: **€2.5k–€4.5k** · Solar version (no battery)\n• **Tank Louis Cartier** — 18ct gold, ultra-classic. Market: **€12k–€22k**\n• **Tank Française** — Rounded integrated links. Market: **€4k–€8k**\n• **Tank Américaine** — Curved case, cuff style. Market: **€5k–€10k**\n\n📌 Worn by: Jacqueline Kennedy Onassis, Andy Warhol, Princess Diana, Yves Saint Laurent, Michelle Obama.\n\n💡 The Tank is one of the most copied watches in the world — but nothing matches the original.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'ballon_bleu',
      kw: ['ballon bleu','ballon bleu de cartier','w6920046','wsbb0030',
           'round cartier','cartier sphere','balloon cartier'],
      r: () => {
        ctx.brand = 'cartier'; ctx.model = 'ballon_bleu';
        return t(
          `**Cartier Ballon Bleu — La modernité ronde depuis 2007 🔵**\n\nLancée en 2007, reconnaissable à sa couronne cabochon bleue sertie dans un arc de cercle — signature unique.\n\n**36mm acier** — Marché : **€4k–€6k**\n**40mm acier** — Marché : **€4.5k–€7k**\n**42mm acier** — Marché : **€5k–€8k**\n**Or rose 18ct (33/36mm)** — Marché : **€10k–€16k**\n**Full paved diamonds** — Marché : **€25k–€60k+**\n\n💡 La Ballon Bleu est la montre Cartier la plus vendue aujourd'hui — disponible en acier, or jaune, or rose, or blanc, et en versions joaillerie.\n\n📞 ${BIZ.phone1}`,
          `**Cartier Ballon Bleu — Modern roundness since 2007 🔵**\n\nLaunched in 2007, recognisable by its blue cabochon crown set within a circular arc — a unique signature.\n\n**36mm steel** — Market: **€4k–€6k**\n**40mm steel** — Market: **€4.5k–€7k**\n**42mm steel** — Market: **€5k–€8k**\n**18ct rose gold (33/36mm)** — Market: **€10k–€16k**\n**Full paved diamonds** — Market: **€25k–€60k+**\n\n💡 The Ballon Bleu is today's best-selling Cartier watch — available in steel, yellow gold, rose gold, white gold, and jewellery versions.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'pasha',
      kw: ['pasha','pasha de cartier','pasha chronograph','pasha 35','pasha 38',
           'pasha 41','pasha interchangeable','screw down crown pasha'],
      r: () => {
        ctx.brand = 'cartier'; ctx.model = 'pasha';
        return t(
          `**Cartier Pasha — L'aventurier depuis 1985 🏊**\n\nOriginellement créée pour le Pacha de Marrakech qui voulait une montre étanche pour nager. Couronne vissée et protégée par un cabochon — iconique.\n\n**Pasha de Cartier 35mm** — Marché : **€4k–€6.5k**\n**Pasha de Cartier 41mm** — Marché : **€5k–€8k**\n**Pasha Chronographe 41mm** — Marché : **€8k–€14k**\n\n📌 Bracelet interchangeable QuickSwitch sans outil. Disponible cuir, acier, rubber.\n\n📞 ${BIZ.phone1}`,
          `**Cartier Pasha — The adventurer since 1985 🏊**\n\nOriginally created for the Pasha of Marrakech who wanted a waterproof watch for swimming. Screw-down crown protected by a cabochon — iconic.\n\n**Pasha de Cartier 35mm** — Market: **€4k–€6.5k**\n**Pasha de Cartier 41mm** — Market: **€5k–€8k**\n**Pasha Chronograph 41mm** — Market: **€8k–€14k**\n\n📌 QuickSwitch interchangeable bracelet without tools. Available in leather, steel, rubber.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'cartier',
      kw: ['cartier','cartier history','histoire cartier','louis cartier',
           'cartier collection','cartier paris','rue de la paix',
           'cartier movement','cartier 1847','calibre de cartier',
           'rotonde cartier','panthere cartier','cartier price'],
      r: () => {
        ctx.brand = 'cartier';
        return t(
          `**Cartier — "Le joaillier des rois, le roi des joailliers" depuis 1847 💎**\n\nFondée à Paris par Louis-François Cartier en 1847, 11 rue Scribe. La maison qui a inventé la montre-bracelet moderne (Santos 1904), le bijou-montre, et la notion de "joaillerie haute horlogerie".\n\n**Collections montres :**\n✈️ **Santos** — Premier bracelet aviateur, 1904\n🎖️ **Tank** — Géométrique révolutionnaire, 1917\n🔵 **Ballon Bleu** — Icône contemporaine, 2007\n🏊 **Pasha** — Aventurier étanche, 1985\n🐆 **Panthère** — Bijou-montre féminin, 1983\n⚙️ **Rotonde / Calibre** — Collection masculine sport\n\n**Fourchettes de prix :**\n• Acier : €2.5k–€8k\n• Or 18ct : €10k–€25k\n• Joaillerie / Grande Complication : €30k–€200k+\n\n📞 ${BIZ.phone1}`,
          `**Cartier — "The jeweller of kings, the king of jewellers" since 1847 💎**\n\nFounded in Paris by Louis-François Cartier in 1847, 11 rue Scribe. The house that invented the modern wristwatch (Santos 1904), the jewellery-watch, and the concept of "high jewellery watchmaking".\n\n**Watch collections:**\n✈️ **Santos** — First aviator wristwatch, 1904\n🎖️ **Tank** — Revolutionary geometric, 1917\n🔵 **Ballon Bleu** — Contemporary icon, 2007\n🏊 **Pasha** — Waterproof adventurer, 1985\n🐆 **Panthère** — Feminine jewellery watch, 1983\n⚙️ **Rotonde / Calibre** — Masculine sport collection\n\n**Price ranges:**\n• Steel: €2.5k–€8k\n• 18ct gold: €10k–€25k\n• Jewellery / Grand Complication: €30k–€200k+\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ OMEGA ════════════════════════════════════════════════════════════════════

    { id: 'speedmaster',
      kw: ['speedmaster','moonwatch','moon watch','311.30','311.10','311.92',
           'alaska project','speedy','calibre 321','cal 321','omega chrono',
           'space watch','apollo','nasa watch','omega moon'],
      r: () => {
        ctx.brand = 'omega'; ctx.model = 'speedmaster';
        return t(
          `**Omega Speedmaster Professional — "The Moonwatch" depuis 1957 🚀**\n\nPortée lors de toutes les missions lunaires Apollo (1969–1972). Sélectionnée par la NASA après tests rigoureux en 1965. La seule montre portée sur la Lune.\n\n**311.30.42.30.01.005** — Cadran noir, lunette tachymétrique, Cal. 1861 (manuel). Marché : **€4k–€6k**\n\n**Calibre 321 relaunched (310.30.42.50.01.001)** — Réédition à l'identique avec Cal. 321 original (1969). Marché : **€6k–€9k**\n\n**Moonwatch Only sapphire (311.92...)** — Fond saphir, Cal. 3861 Master Chronometer. Marché : **€5k–€7.5k**\n\n📌 **Variantes recherchées :**\n• "Alaska Project" (rouge) — édition limitée, très rare\n• "Ultraman" (lunette orange) — €10k–€18k\n• Ref. 105.003 vintage (1963–1968) — €15k–€35k\n• Ref. 2915 (1957 original) — €30k–€80k\n\n💡 La Speedmaster est LA montre NASA. Apollos 11, 12, 13, 14, 15, 16, 17 — et la montre de James Lovell lors d'Apollo 13.\n\n📞 ${BIZ.phone1}`,
          `**Omega Speedmaster Professional — "The Moonwatch" since 1957 🚀**\n\nWorn on all Apollo lunar missions (1969–1972). Selected by NASA after rigorous testing in 1965. The only watch worn on the Moon.\n\n**311.30.42.30.01.005** — Black dial, tachymeter bezel, Cal. 1861 (manual). Market: **€4k–€6k**\n\n**Calibre 321 relaunch (310.30.42.50.01.001)** — Identical reissue with original Cal. 321 (1969). Market: **€6k–€9k**\n\n**Moonwatch Only sapphire (311.92...)** — Sapphire caseback, Cal. 3861 Master Chronometer. Market: **€5k–€7.5k**\n\n📌 **Sought-after variants:**\n• "Alaska Project" (red) — limited edition, very rare\n• "Ultraman" (orange bezel) — €10k–€18k\n• Ref. 105.003 vintage (1963–1968) — €15k–€35k\n• Ref. 2915 (1957 original) — €30k–€80k\n\n💡 The Speedmaster is THE NASA watch. Apollos 11, 12, 13, 14, 15, 16, 17 — and James Lovell's watch during Apollo 13.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'seamaster',
      kw: ['seamaster','planet ocean','seamaster 300','seamaster 300m',
           'seamaster diver','james bond watch','bond watch','210.30','220.10',
           'aqua terra','seamaster professional','seamaster 007'],
      r: () => {
        ctx.brand = 'omega'; ctx.model = 'seamaster';
        return t(
          `**Omega Seamaster — La montre de James Bond depuis 1995 🌊**\n\nDepuis GoldenEye (1995), James Bond porte une Seamaster — la montre de plongée la plus célèbre du cinéma.\n\n**Seamaster Diver 300M (210.30.42.20.01.001)**\n• 42mm, céramique, Master Chronometer, Co-Axial\n• Fond saphir, lunette unidirectionnelle\n• Marché : **€4k–€6.5k**\n\n**Planet Ocean 600M (215.30.44.21.01.001)**\n• 43.5mm, étanche 600m, bracelet acier\n• Marché : **€5k–€7.5k**\n\n**Seamaster 300 (234.30.41.21.03.001)**\n• Inspiré du vintage, acier, NATO\n• Marché : **€4.5k–€7k**\n\n**Aqua Terra 150M**\n• Sport élégant, dial "Teak concept"\n• Marché : **€3.5k–€5.5k**\n\n📞 ${BIZ.phone1}`,
          `**Omega Seamaster — James Bond's watch since 1995 🌊**\n\nSince GoldenEye (1995), James Bond has worn a Seamaster — cinema's most famous dive watch.\n\n**Seamaster Diver 300M (210.30.42.20.01.001)**\n• 42mm, ceramic, Master Chronometer, Co-Axial\n• Sapphire caseback, unidirectional bezel\n• Market: **€4k–€6.5k**\n\n**Planet Ocean 600M (215.30.44.21.01.001)**\n• 43.5mm, waterproof 600m, steel bracelet\n• Market: **€5k–€7.5k**\n\n**Seamaster 300 (234.30.41.21.03.001)**\n• Vintage-inspired, steel, NATO\n• Market: **€4.5k–€7k**\n\n**Aqua Terra 150M**\n• Elegant sport, "Teak concept" dial\n• Market: **€3.5k–€5.5k**\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'omega',
      kw: ['omega','omega watch','swatch group','omega history','omega collection',
           'omega movement','co-axial','master chronometer','omega price',
           'omega de ville','constellation omega','omega gold'],
      r: () => {
        ctx.brand = 'omega';
        return t(
          `**Omega — Excellence suisse depuis 1848 ⌚**\n\nFondée à La Chaux-de-Fonds en 1848, Omega est la marque officielle des Jeux Olympiques (chronométrage depuis 1932) et de la NASA.\n\n**Collections :**\n🚀 **Speedmaster** — "Moonwatch", NASA officielle\n🌊 **Seamaster** — James Bond, plongée\n🔵 **Constellation** — Elegance, griffes iconiques\n💠 **De Ville** — Dress watch raffinée\n⏱️ **Olympic** — Chronométrage sportif\n\n**Innovations techniques :**\n• Échappement **Co-Axial** (1999) — Réduit la friction de 50%\n• **Master Chronometer** — Résiste à 15 000 gauss (certifié METAS)\n• **Spirale Silicium** — Insensible au magnétisme\n\n**Fourchettes prix :**\n• Seamaster/Speedmaster acier : €4k–€7k\n• De Ville or : €8k–€15k\n• Complications : €15k–€35k\n\n📞 ${BIZ.phone1}`,
          `**Omega — Swiss excellence since 1848 ⌚**\n\nFounded in La Chaux-de-Fonds in 1848, Omega is the official timekeeper of the Olympic Games (since 1932) and NASA.\n\n**Collections:**\n🚀 **Speedmaster** — "Moonwatch", official NASA\n🌊 **Seamaster** — James Bond, diving\n🔵 **Constellation** — Elegance, iconic claws\n💠 **De Ville** — Refined dress watch\n⏱️ **Olympic** — Sports timekeeping\n\n**Technical innovations:**\n• **Co-Axial** escapement (1999) — Reduces friction by 50%\n• **Master Chronometer** — Resists 15,000 gauss (METAS certified)\n• **Silicon Spiral** — Insensitive to magnetism\n\n**Price ranges:**\n• Seamaster/Speedmaster steel: €4k–€7k\n• De Ville gold: €8k–€15k\n• Complications: €15k–€35k\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ OTHER MAISONS DE LUXE ════════════════════════════════════════════════════

    { id: 'iwc',
      kw: ['iwc','portugieser','portofino','pilot watch iwc','big pilot','ingenieur',
           'aquatimer iwc','iwc schaffhausen','internaltional watch','iwc price'],
      r: () => {
        ctx.brand = 'iwc';
        return t(
          `**IWC Schaffhausen — L'ingénierie horlogère depuis 1868 ⚙️**\n\nFondée à Schaffhausen (Suisse alémanique) par l'Américain Florentine Ariosto Jones. Connue pour son ingénierie rigoureuse et ses grandes tailles.\n\n**Portugieser** — Cadran propre, sous-secondes, très classique. Marché : **€8k–€18k**\n**Big Pilot 43/46mm** — Montre pilote, grande lisibilité, Cal. 52010/52110. Marché : **€9k–€20k**\n**Portofino** — Dress watch élégante. Marché : **€5k–€9k**\n**Ingénieur** — Anti-magnétique, sport. Marché : **€6k–€15k**\n**Aquatimer** — Plongée. Marché : **€5k–€10k**\n\n💡 IWC est connue pour ses lunettes externales "SafeDive" et ses mouvements Cal. 52000 à 7 jours de réserve.\n\n📞 ${BIZ.phone1}`,
          `**IWC Schaffhausen — Engineering watchmaking since 1868 ⚙️**\n\nFounded in Schaffhausen (German-speaking Switzerland) by American Florentine Ariosto Jones. Known for rigorous engineering and large case sizes.\n\n**Portugieser** — Clean dial, small seconds, very classic. Market: **€8k–€18k**\n**Big Pilot 43/46mm** — Pilot watch, great legibility, Cal. 52010/52110. Market: **€9k–€20k**\n**Portofino** — Elegant dress watch. Market: **€5k–€9k**\n**Ingénieur** — Anti-magnetic, sporty. Market: **€6k–€15k**\n**Aquatimer** — Diving. Market: **€5k–€10k**\n\n💡 IWC is known for its external "SafeDive" bezels and Cal. 52000 movements with 7-day power reserve.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'jlc',
      kw: ['jaeger','jaeger lecoultre','jaeger-lecoultre','reverso','master control',
           'polaris jlc','memovox','master ultra thin','jlc calibre',
           'atmos clock','jlc price','jlc collection'],
      r: () => {
        ctx.brand = 'jlc';
        return t(
          `**Jaeger-LeCoultre — La manufacture des manufactures depuis 1833 🏛️**\n\nFondée à Le Sentier (Vallée de Joux) — fabrique ses propres alliages, ressorts, rubis, boîtiers et mouvements. Plus de 1 400 calibres créés.\n\n**Reverso (1931)** — Boîtier pivotant Art Déco, créé pour jouer au polo. Marché : **€8k–€45k** selon version\n**Master Control** — Dress watch classique. Marché : **€6k–€12k**\n**Polaris** — Sport vintage-inspired. Marché : **€7k–€14k**\n**Master Ultra Thin** — Parmi les plus fines au monde (4.05mm). Marché : **€12k–€22k**\n**Gyrotourbillon** — Tourbillon multi-axes, pièce d'exception. Marché : **€200k+**\n\n💡 JLC fournit des mouvements à de nombreuses grandes maisons (Cartier, Vacheron, AP) — d'où le surnom "manufacture des manufactures".\n\n📞 ${BIZ.phone1}`,
          `**Jaeger-LeCoultre — The manufacture of manufactures since 1833 🏛️**\n\nFounded in Le Sentier (Vallée de Joux) — makes its own alloys, springs, rubies, cases, and movements. Over 1,400 calibres created.\n\n**Reverso (1931)** — Art Deco pivoting case, created to play polo. Market: **€8k–€45k** depending on version\n**Master Control** — Classic dress watch. Market: **€6k–€12k**\n**Polaris** — Vintage-inspired sport. Market: **€7k–€14k**\n**Master Ultra Thin** — Among the world's thinnest (4.05mm). Market: **€12k–€22k**\n**Gyrotourbillon** — Multi-axis tourbillon, exceptional piece. Market: **€200k+**\n\n💡 JLC supplies movements to many great maisons (Cartier, Vacheron, AP) — hence the nickname "manufacture of manufactures".\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'vacheron',
      kw: ['vacheron','vacheron constantin','overseas','traditionnelle','historiques',
           'patrimony','les cabinotiers','vacheron price','vacheron collection',
           'vacheron history','oldest watch brand'],
      r: () => {
        ctx.brand = 'vacheron';
        return t(
          `**Vacheron Constantin — La plus ancienne manufacture en activité continue depuis 1755 🏆**\n\nFondée à Genève par Jean-Marc Vacheron — n'a jamais arrêté la production depuis 270 ans. Membre de la "Sainte Trinité" de l'horlogerie (avec Patek et AP).\n\n**Overseas** — Sport-luxe, bracelet interchangeable, Cal. 5100. Marché : **€18k–€35k**\n**Traditionelle** — Dress watch classique Genève. Marché : **€15k–€40k**\n**Patrimony** — Ultra-minimaliste, ultra-fin. Marché : **€18k–€35k**\n**Les Cabinotiers** — Pièces uniques sur commande. Prix sur demande.\n**Tour de l'Île** (2005) — 16 complications, l'une des montres les plus complexes jamais créées. Marché : **€1.5M+**\n\n💡 Le Sceau de Genève (Poinçon de Genève) appliqué sur les mouvements Vacheron = contrôle qualité le plus exigeant au monde.\n\n📞 ${BIZ.phone1}`,
          `**Vacheron Constantin — The oldest manufacture in continuous operation since 1755 🏆**\n\nFounded in Geneva by Jean-Marc Vacheron — has never stopped production for 270 years. Member of the "Holy Trinity" of watchmaking (with Patek and AP).\n\n**Overseas** — Sport-luxury, interchangeable bracelet, Cal. 5100. Market: **€18k–€35k**\n**Traditionelle** — Classic Geneva dress watch. Market: **€15k–€40k**\n**Patrimony** — Ultra-minimalist, ultra-thin. Market: **€18k–€35k**\n**Les Cabinotiers** — Unique pieces on commission. Price on request.\n**Tour de l'Île** (2005) — 16 complications, one of the most complex watches ever made. Market: **€1.5M+**\n\n💡 The Geneva Seal (Poinçon de Genève) applied to Vacheron movements = the world's most demanding quality control.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'lange',
      kw: ['lange','a lange','a. lange','lange sohne','lange söhne','datograph',
           'lange 1','zeitwerk','saxonia','richard lange','glashütte','glashutte',
           'german watch','montre allemande','lange price','lange collection'],
      r: () => {
        ctx.brand = 'lange';
        return t(
          `**A. Lange & Söhne — La perfection allemande depuis 1845 🇩🇪**\n\nFondée à Glashütte (Saxe) par Adolf Lange en 1845. Fermée en 1948 (rideau de fer), relancée en 1994 le jour de la chute du Mur. La maison de haute horlogerie **hors de Suisse**.\n\n**Lange 1** — Affichage digital disque hors-axe, grand date, réserve de marche. Marché : **€28k–€45k**\n**Datograph Up/Down** — Chronographe flyback, le plus beau chrono selon beaucoup. Marché : **€45k–€75k**\n**Zeitwerk** — Affichage numérique mécanique (sautant). Marché : **€55k–€90k**\n**Saxonia Thin** — Ultra-fin, épuré. Marché : **€22k–€35k**\n**Richard Lange Perpetual** — Calendrier perpétuel. Marché : **€85k–€130k**\n\n💡 Toutes les montres Lange sont finies à la main deux fois (avant et après assemblage). Or blanc, or jaune, platine uniquement — jamais d'acier.\n\n📞 ${BIZ.phone1}`,
          `**A. Lange & Söhne — German perfection since 1845 🇩🇪**\n\nFounded in Glashütte (Saxony) by Adolf Lange in 1845. Closed in 1948 (Iron Curtain), relaunched in 1994 on the day the Wall fell. The haute horlogerie maison **outside Switzerland**.\n\n**Lange 1** — Off-axis disc display, large date, power reserve. Market: **€28k–€45k**\n**Datograph Up/Down** — Flyback chronograph, considered by many the most beautiful chrono. Market: **€45k–€75k**\n**Zeitwerk** — Mechanical digital (jumping) display. Market: **€55k–€90k**\n**Saxonia Thin** — Ultra-thin, pure. Market: **€22k–€35k**\n**Richard Lange Perpetual** — Perpetual calendar. Market: **€85k–€130k**\n\n💡 All Lange watches are hand-finished twice (before and after assembly). White gold, yellow gold, platinum only — never steel.\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    { id: 'breguet',
      kw: ['breguet','breguet watch','classique breguet','marine breguet',
           'tradition breguet','breguet tourbillon','abraham breguet',
           'breguet overcoil','breguet hands','guilloche breguet'],
      r: () => {
        ctx.brand = 'breguet';
        return t(
          `**Breguet — L'horloger des rois depuis 1775 👑**\n\nFondée par Abraham-Louis Breguet — l'un des plus grands génies horlogers de l'histoire. A inventé le tourbillon (1801), la montre souscription, le spiral Breguet, les aiguilles Breguet.\n\n**Classique** — Quintessence de l'horlogerie classique. Marché : **€15k–€35k**\n**Marine** — Chronographe naval. Marché : **€18k–€40k**\n**Tradition** — Tourbillon squelette. Marché : **€30k–€80k**\n**Type XX/XXI** — Chronographe militaire. Marché : **€8k–€18k**\n\n💡 Les "aiguilles Breguet" (bout évidé en lune) et le "spiral Breguet" (extrémité courbée) sont des inventions du XVIIIe siècle encore présentes sur les montres modernes.\n\n📞 ${BIZ.phone1}`,
          `**Breguet — Watchmaker to the kings since 1775 👑**\n\nFounded by Abraham-Louis Breguet — one of the greatest watchmaking geniuses in history. Invented the tourbillon (1801), the subscription watch, the Breguet overcoil, Breguet hands.\n\n**Classique** — Quintessence of classical watchmaking. Market: **€15k–€35k**\n**Marine** — Naval chronograph. Market: **€18k–€40k**\n**Tradition** — Skeleton tourbillon. Market: **€30k–€80k**\n**Type XX/XXI** — Military chronograph. Market: **€8k–€18k**\n\n💡 "Breguet hands" (hollow moon-tip) and the "Breguet overcoil" (curved hairspring end) are 18th century inventions still present on modern watches.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'hublot',
      kw: ['hublot','big bang','classic fusion','spirit of big bang','mp hublot',
           'hublot ceramic','hublot magic gold','hublot price','hublot collection',
           'jean-claude biver','biver hublot'],
      r: () => {
        ctx.brand = 'hublot';
        return t(
          `**Hublot — "Art of Fusion" depuis 1980 🔩**\n\nFondée en 1980, révolutionnée par Jean-Claude Biver (2004) avec le concept "Art of Fusion" — mélange des matériaux (or + caoutchouc, céramique + titane, bois + saphir).\n\n**Big Bang** — Iconique, nombreuses éditions. Marché : **€12k–€30k**\n**Classic Fusion** — Plus sobre, élégant. Marché : **€8k–€20k**\n**Spirit of Big Bang** — Tonneau. Marché : **€18k–€35k**\n**MP-05 LaFerrari** — Réserve 50 jours. Marché : **€120k–€200k**\n\n💡 Hublot a créé le "Magic Gold" — alliage or/céramique anti-rayures unique au monde.\n\n📞 ${BIZ.phone1}`,
          `**Hublot — "Art of Fusion" since 1980 🔩**\n\nFounded in 1980, revolutionised by Jean-Claude Biver (2004) with the "Art of Fusion" concept — mixing materials (gold + rubber, ceramic + titanium, wood + sapphire).\n\n**Big Bang** — Iconic, many editions. Market: **€12k–€30k**\n**Classic Fusion** — More understated, elegant. Market: **€8k–€20k**\n**Spirit of Big Bang** — Tonneau case. Market: **€18k–€35k**\n**MP-05 LaFerrari** — 50-day power reserve. Market: **€120k–€200k**\n\n💡 Hublot created "Magic Gold" — a unique scratch-resistant gold/ceramic alloy.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'panerai',
      kw: ['panerai','luminor','radiomir','submersible panerai','officine panerai',
           'pam panerai','pam441','pam616','panerai navy','panerai seal',
           'panerai history','italian navy watch','montre marine italienne'],
      r: () => {
        ctx.brand = 'panerai';
        return t(
          `**Officine Panerai — La montre des commandos italiens depuis 1860 ⚓**\n\nFournisseur de la Marine Italienne depuis 1860, popularisée au grand public en 1997. Montres "tool watches" massives (44–47mm), lisibilité maximale, design brutaliste.\n\n**Luminor** — Couronne protégée par pont brevet. Marché : **€5k–€12k**\n**Radiomir** — Fond vissé, lignes plus douces. Marché : **€5k–€10k**\n**Submersible** — Plongée 300m. Marché : **€6k–€15k**\n**Luminor 1950** — Version 47mm vintage. Marché : **€7k–€14k**\n\n💡 Cadrans Panerai fabriqués sous secret militaire jusqu'aux années 90 — certains contiennent du Radium et Tritium.\n\n📞 ${BIZ.phone1}`,
          `**Officine Panerai — The Italian commando watch since 1860 ⚓**\n\nSupplier to the Italian Navy since 1860, popularised to the public in 1997. Massive "tool watches" (44–47mm), maximum legibility, brutalist design.\n\n**Luminor** — Crown protected by patented bridge. Market: **€5k–€12k**\n**Radiomir** — Screwed caseback, softer lines. Market: **€5k–€10k**\n**Submersible** — 300m diving. Market: **€6k–€15k**\n**Luminor 1950** — 47mm vintage version. Market: **€7k–€14k**\n\n💡 Panerai dials were made under military secrecy until the '90s — some contain Radium and Tritium.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'tudor',
      kw: ['tudor','tudor black bay','pelagos','tudor ranger','tudor 1926',
           'tudor heritage','bb58','black bay 58','black bay 41','tudor price',
           'tudor vs rolex','tudor submariner','tudor nato'],
      r: () => {
        ctx.brand = 'tudor';
        return t(
          `**Tudor — La marque sœur de Rolex depuis 1926 🌹**\n\nFondée par Hans Wilsdorf (fondateur de Rolex) pour proposer des montres robustes à prix plus accessible. Aujourd'hui indépendante dans sa direction créative.\n\n**Black Bay 41** — Lunette aluminium, Cal. MT5602 manufacture. Marché : **€2.5k–€3.8k**\n**Black Bay 58** — 38mm, vintage-inspired, très populaire. Marché : **€2.8k–€4k**\n**Black Bay Ceramic** — Lunette céramique. Marché : **€3.5k–€5k**\n**Pelagos** — Plongée technique, titane, 500m. Marché : **€3k–€5k**\n**Ranger** — Field watch sobre. Marché : **€2k–€3.5k**\n\n💡 Tudor utilise ses propres calibres manufacture (MT5000/5602) depuis 2015 — plus autonome que jamais. Excellent rapport qualité/prix dans le segment "tool watch".\n\n📞 ${BIZ.phone1}`,
          `**Tudor — Rolex's sister brand since 1926 🌹**\n\nFounded by Hans Wilsdorf (Rolex founder) to offer robust watches at a more accessible price. Today independent in its creative direction.\n\n**Black Bay 41** — Aluminium bezel, Cal. MT5602 manufacture. Market: **€2.5k–€3.8k**\n**Black Bay 58** — 38mm, vintage-inspired, very popular. Market: **€2.8k–€4k**\n**Black Bay Ceramic** — Ceramic bezel. Market: **€3.5k–€5k**\n**Pelagos** — Technical diving, titanium, 500m. Market: **€3k–€5k**\n**Ranger** — Simple field watch. Market: **€2k–€3.5k**\n\n💡 Tudor has used its own manufacture calibres (MT5000/5602) since 2015 — more independent than ever. Excellent value-for-money in the "tool watch" segment.\n\n📞 ${BIZ.phone1}`
        );
      }
    },

    { id: 'blancpain',
      kw: ['blancpain','fifty fathoms','villeret blancpain','le brassus blancpain',
           'blancpain tourbillon','carrousel blancpain','blancpain price'],
      r: () => {
        ctx.brand = 'blancpain';
        return t(
          `**Blancpain — "Jamais une montre à quartz" depuis 1735 🔱**\n\nLa plus ancienne manufacture horlogère du monde toujours en activité. Créatrice de la montre de plongée moderne (Fifty Fathoms, 1953 — avant la Submariner).\n\n**Fifty Fathoms** — 45mm, plongée 300m, cadran mil-spec. Marché : **€16k–€28k**\n**Villeret** — Collection classique ultra-fine. Marché : **€12k–€40k**\n**Le Brassus** — Grandes complications (tourbillon, carrousel, équation du temps). Marché : **€80k–€500k+**\n\n💡 La Fifty Fathoms (1953) a précédé la Rolex Submariner de plusieurs mois — c'est la vraie première montre de plongée moderne.\n\n📞 ${BIZ.phone1}`,
          `**Blancpain — "Never a quartz watch" since 1735 🔱**\n\nThe world's oldest watch manufacture still in operation. Creator of the modern dive watch (Fifty Fathoms, 1953 — before the Submariner).\n\n**Fifty Fathoms** — 45mm, 300m diving, mil-spec dial. Market: **€16k–€28k**\n**Villeret** — Ultra-thin classic collection. Market: **€12k–€40k**\n**Le Brassus** — Grand complications (tourbillon, carrousel, equation of time). Market: **€80k–€500k+**\n\n💡 The Fifty Fathoms (1953) preceded the Rolex Submariner by several months — it is the true first modern dive watch.\n\n📞 ${BIZ.phone1}`
        );
      }
    },


    // ═══ WATCH EDUCATION ══════════════════════════════════════════════════════════

    { id: 'movements',
      kw: ['movement','mouvement','calibre','caliber','automatic','automatique',
           'manual','manual wind','remontage manuel','quartz','mechanical',
           'mécanique','how does a watch work','comment fonctionne','ebauche',
           'rotor','oscillating weight','masse oscillante','mainspring','ressort moteur',
           'power reserve','reserve de marche','escapement','echappement',
           'balance wheel','balancier','hairspring','spiral','jewels','rubis'],
      r: () => t(
        `**Les mouvements de montre — Guide expert :**\n\n⚙️ **Automatique (self-winding)** — La masse oscillante remonte le ressort moteur à chaque mouvement du poignet. Standard dans l'horlogerie de luxe. Réserve : 38–70h selon marque.\n\n🔧 **Manuel (hand-wound)** — Remonté à la main chaque jour ou 2–3 jours. Mouvement plus fin, plus pur. Rolex Daytona Cal. 4130 · Patek Calatrava · Lange Saxonia.\n\n⚡ **Quartz** — Pile électronique, très précis (±15 sec/an). Moins recherché en luxe — sauf Cartier Tank Must solaire.\n\n🌀 **Tourbillon** — Cage rotative qui compense l'effet de la gravité sur le balancier. Inventé par Breguet en 1801. Marques : Patek, AP, JLC, Lange, RM, Breguet.\n\n🔬 **Co-Axial (Omega)** — Échappement à 3 dents réduit la friction de 50%, intervalles de révision plus espacés.\n\n📊 **Certification COSC** (Chronometer) : précision ±4/−6 sec/jour. Master Chronometer (Omega) : ±0/−5 sec/jour.\n\nQuelle complication vous intéresse ?`,
        `**Watch movements — Expert guide:**\n\n⚙️ **Automatic (self-winding)** — The oscillating weight winds the mainspring with each wrist movement. Standard in luxury watchmaking. Reserve: 38–70h depending on brand.\n\n🔧 **Manual (hand-wound)** — Wound by hand every 1–3 days. Thinner, purer movement. Rolex Daytona Cal. 4130 · Patek Calatrava · Lange Saxonia.\n\n⚡ **Quartz** — Battery powered, very accurate (±15 sec/year). Less sought-after in luxury — except Cartier Tank Must solar.\n\n🌀 **Tourbillon** — Rotating cage that compensates gravity's effect on the balance wheel. Invented by Breguet in 1801. Brands: Patek, AP, JLC, Lange, RM, Breguet.\n\n🔬 **Co-Axial (Omega)** — 3-tooth escapement reduces friction by 50%, longer service intervals.\n\n📊 **COSC Certification** (Chronometer): accuracy ±4/−6 sec/day. Master Chronometer (Omega): ±0/−5 sec/day.\n\nWhich complication interests you?`
      )
    },

    { id: 'complications',
      kw: ['complication','complications','chronograph','chronographe','moonphase',
           'moon phase','phase de lune','annual calendar','calendrier annuel',
           'perpetual calendar','calendrier perpetuel','minute repeater',
           'repetition minutes','tourbillon','flyback','rattrapante','split second',
           'alarm','reveil','equation of time','equation du temps','regulator',
           'gmt complication','dual time','world time','multifuseau'],
      r: () => t(
        `**Les complications horlogères — Guide complet :**\n\n⏱️ **Chronographe** — Compteur de temps indépendant. Simple (1 bouton) · Flyback (remise à zéro instantanée) · Rattrapante (2 aiguilles superposées)\n\n🌙 **Moonphase** — Cycle lunaire (99.998% précis = 1 jour d'erreur en 577 ans pour les meilleures)\n\n📅 **Calendriers :**\n• Simple : réglage mensuel\n• Annuel (Patek) : réglage 1×/an (fin fév.)\n• Perpétuel (Patek/AP/JLC) : aucun réglage, gère les années bissextiles jusqu'en 2100\n\n🔔 **Répétition minutes** — Sonne l'heure en carillon à la demande. La plus difficile à fabriquer.\n\n🌐 **GMT / Dual Time / World Time** — 2e fuseau sur index ou disque\n\n🌀 **Tourbillon** — Anti-gravité, prestige maximum. Simple · Double axe · Triple axe (Jaeger)\n\n⏰ **Réserve de marche** — Indicateur du ressort restant\n\n💡 Une montre avec répétition minutes + tourbillon + calendrier perpétuel = "Grande Complication" (ex. Patek 5207P).`,
        `**Watch complications — Complete guide:**\n\n⏱️ **Chronograph** — Independent time counter. Simple (1 push) · Flyback (instant reset) · Rattrapante (2 superimposed hands)\n\n🌙 **Moonphase** — Lunar cycle (99.998% accurate = 1 day error in 577 years for the best)\n\n📅 **Calendars:**\n• Simple: monthly correction\n• Annual (Patek): 1×/year correction (end Feb.)\n• Perpetual (Patek/AP/JLC): no correction, manages leap years until 2100\n\n🔔 **Minute repeater** — Chimes the time on demand. The most difficult to manufacture.\n\n🌐 **GMT / Dual Time / World Time** — 2nd time zone on disc or index\n\n🌀 **Tourbillon** — Anti-gravity, maximum prestige. Single · Double axis · Triple axis (Jaeger)\n\n⏰ **Power reserve** — Indicates remaining mainspring tension\n\n💡 A watch with minute repeater + tourbillon + perpetual calendar = "Grand Complication" (e.g. Patek 5207P).`
      )
    },

    { id: 'materials',
      kw: ['material','matériau','steel','acier','gold','or','titanium','titane',
           'ceramic','céramique','platinum','platine','carbon','carbone','ntpt',
           'everose','white gold','or blanc','yellow gold','or jaune','rose gold',
           'sapphire','saphir','crystal saphir','pvd','dlc','bronze','aluminium',
           'rubber','caoutchouc','leather','cuir','nato strap','nato bracelet'],
      r: () => t(
        `**Matériaux en horlogerie de luxe :**\n\n🔩 **Acier 904L (Rolex)** — Acier "Oystersteel" plus résistant à la corrosion que le 316L standard. Plus difficile à usiner.\n\n⚪ **Acier 316L** — Standard industrie (AP, Patek, Cartier, Omega…)\n\n🔘 **Titane Grade 5** — 40% plus léger que l'acier, hypoallergénique. Utilisé par RM, IWC, AP Offshore.\n\n⚫ **Céramique haute technologie** — Extrêmement dure (9 Mohs), ne se raye pas. Rolex lunettes / AP Offshore / Hublot\n\n🥇 **Or 18ct** — 75% or + 25% alliage. Types : jaune (Cu+Ag) · blanc (Pd+Ag) · rose (Cu) · Everose (Rolex, or rose + platine, ne ternit jamais)\n\n⚗️ **Platine 950** — Le plus précieux, le plus lourd, hypoallergénique. Réservé aux pièces d'exception.\n\n🖤 **NTPT Carbon (RM)** — Couches de fibres de carbone croisées à 45°, cuites sous pression. Motif unique à chaque pièce. Ultra-léger + ultra-résistant.\n\n💎 **Saphir cristallisé** — 9 Mohs. Fond saphir standard / boîtier intégral saphir (RM 056 — 10 200h d'usinage)`,
        `**Materials in luxury watchmaking:**\n\n🔩 **904L Steel (Rolex)** — "Oystersteel" more corrosion-resistant than standard 316L. More difficult to machine.\n\n⚪ **316L Steel** — Industry standard (AP, Patek, Cartier, Omega…)\n\n🔘 **Grade 5 Titanium** — 40% lighter than steel, hypoallergenic. Used by RM, IWC, AP Offshore.\n\n⚫ **High-tech Ceramic** — Extremely hard (9 Mohs), scratch-resistant. Rolex bezels / AP Offshore / Hublot\n\n🥇 **18ct Gold** — 75% gold + 25% alloy. Types: yellow (Cu+Ag) · white (Pd+Ag) · rose (Cu) · Everose (Rolex, rose gold + platinum, never tarnishes)\n\n⚗️ **950 Platinum** — Most precious, heaviest, hypoallergenic. Reserved for exceptional pieces.\n\n🖤 **NTPT Carbon (RM)** — Carbon fibre layers crossed at 45°, pressure-cured. Unique pattern on each piece. Ultra-light + ultra-resistant.\n\n💎 **Crystallised sapphire** — 9 Mohs. Standard sapphire caseback / full sapphire case (RM 056 — 10,200h machining)`
      )
    },

    { id: 'buying_guide',
      kw: ['how to buy','how do i buy','comment acheter','buying guide','guide achat',
           'first luxury watch','première montre de luxe','which watch should i get',
           'quelle montre acheter','watch to start','starter watch','entry level',
           'what should i buy','best first watch','beginner watch','watch advice',
           'conseil achat montre','which brand','what brand'],
      r: () => t(
        `**Guide d'achat — Première montre de luxe :**\n\n💡 **Questions à se poser :**\n• Budget ? (€5k–€10k · €10k–€25k · €25k+)\n• Usage ? (sport · formel · quotidien · collection)\n• Taille de poignet ? (37mm petit · 40–41mm universel · 42–44mm grand)\n• Achat neuf vs occasion ?\n\n🏆 **Recommandations par budget :**\n\n**€5k–€10k** : Tudor Black Bay 58 · Cartier Santos acier · Omega Speedmaster · Cartier Tank · Rolex Oyster Perpetual · IWC Portofino\n\n**€10k–€20k** : Rolex Submariner · Rolex GMT Pepsi/Batman · AP Code 11.59 · IWC Big Pilot · JLC Reverso · Panerai Luminor\n\n**€20k–€50k** : Rolex Daytona · AP Royal Oak 15500 · Patek Aquanaut · Vacheron Overseas · Lange Saxonia\n\n**€50k+** : AP Royal Oak Jumbo · Patek Nautilus 5711 · Lange Datograph · Patek Complications\n\n📞 Gary vous conseille gratuitement : ${BIZ.phone1}\n👉 [Prendre rendez-vous](/prendre-rendez-vous.html)`,
        `**Buying guide — First luxury watch:**\n\n💡 **Questions to ask yourself:**\n• Budget? (€5k–€10k · €10k–€25k · €25k+)\n• Use? (sport · formal · daily · collection)\n• Wrist size? (37mm small · 40–41mm universal · 42–44mm large)\n• New vs pre-owned?\n\n🏆 **Recommendations by budget:**\n\n**€5k–€10k**: Tudor Black Bay 58 · Cartier Santos steel · Omega Speedmaster · Cartier Tank · Rolex Oyster Perpetual · IWC Portofino\n\n**€10k–€20k**: Rolex Submariner · Rolex GMT Pepsi/Batman · AP Code 11.59 · IWC Big Pilot · JLC Reverso · Panerai Luminor\n\n**€20k–€50k**: Rolex Daytona · AP Royal Oak 15500 · Patek Aquanaut · Vacheron Overseas · Lange Saxonia\n\n**€50k+**: AP Royal Oak Jumbo · Patek Nautilus 5711 · Lange Datograph · Patek Complications\n\n📞 Gary advises you for free: ${BIZ.phone1}\n👉 [Book an appointment](/prendre-rendez-vous.html)`
      )
    },


    { id: 'vintage',
      kw: ['vintage','vintages','vintage rolex','old watch','montre ancienne',
           'patina','patine','tropical dial','dial tropical','sigma dial',
           'service paper','service history','aged','aging','retro',
           'vintage submariner','vintage daytona','sixties','seventies',
           '1960s','1970s','1980s','pre-owned','preowned','second hand','used watch'],
      r: () => t(
        `**Montres vintage — Ce qu'il faut savoir :**\n\n🕰️ **L'attrait du vintage :**\nDesigns intros (tritium, cadrans "tropical"), mécaniques simples et réparables, histoires uniques, plus-values potentielles spectaculaires.\n\n📌 **Termes clés :**\n• **Patine** — Oxydation naturelle du cadran (crème, chocolat, tropicale) = valeur ajoutée si authentique\n• **Dial tropical** — Cadran Rolex tourné brun/chocolat, très rare, prime ×3–10\n• **Tritium** — Lumineux radioactif (avant ~1998), patine typique\n• **Sigma dial** — Symboles σ indiquant indices massifs\n• **Full set** — Boîte + papiers d'époque = prime ×2–3\n\n⚠️ **Risques vintage :**\n• Mouvements non-révisés (service impératif à l'achat)\n• Cadrans relustrés/refaits (détruisent 80% de la valeur)\n• Boîtiers polis (finitions d'origine perdues)\n• Faux papiers d'origine\n• Numéros de série ne correspondant pas\n\n✅ **Chez Nos Montres** : toutes les pièces vintage authentifiées et expertisées.\n\n📞 ${BIZ.phone1}`,
        `**Vintage watches — What you need to know:**\n\n🕰️ **The appeal of vintage:**\nIntro designs (tritium, "tropical" dials), simple repairable mechanics, unique histories, spectacular potential appreciation.\n\n📌 **Key terms:**\n• **Patina** — Natural dial oxidation (cream, chocolate, tropical) = added value if authentic\n• **Tropical dial** — Rolex dial turned brown/chocolate, very rare, ×3–10 premium\n• **Tritium** — Radioactive lume (before ~1998), typical patina\n• **Sigma dial** — σ symbols indicating solid metal indices\n• **Full set** — Period box + papers = ×2–3 premium\n\n⚠️ **Vintage risks:**\n• Unserviced movements (service mandatory at purchase)\n• Refinished/replaced dials (destroys 80% of value)\n• Polished cases (original finishing lost)\n• Fake period papers\n• Serial numbers not matching\n\n✅ **At Nos Montres**: all vintage pieces authenticated and expertised.\n\n📞 ${BIZ.phone1}`
      )
    },

    { id: 'water_resistance',
      kw: ['water resistant','waterproof','etanche','étanche','atm','bar',
           'metres water','swimming watch','diving watch','how deep','depth',
           'profondeur','water resistance rating','can i swim','can i shower',
           'splash resistant','rain','pluie','pool','piscine'],
      r: () => t(
        `**Résistance à l'eau — Ce que ça signifie vraiment :**\n\n💧 **30m / 3ATM** — Éclaboussures seulement. PAS de natation.\n💦 **50m / 5ATM** — Natation légère. PAS de plongée.\n🏊 **100m / 10ATM** — Natation, snorkeling. Pas de plongée sous-marine.\n🤿 **200–300m** — Plongée loisir. Submariner · Seamaster · Fifty Fathoms\n🏭 **500m+** — Plongée technique. Tudor Pelagos 500m\n🌊 **1000–3900m** — Plongée saturation. Rolex Deepsea 3900m\n\n⚠️ **Important :** Une montre à 30m peut résister à la pluie mais PAS à la pression d'une douche (jet d'eau = pression dynamique). La résistance à l'eau se dégrade avec le temps — les joints doivent être vérifiés annuellement pour les montres de plongée.\n\n✅ **Nos Montres** réalise les tests d'étanchéité après révision.\n\n📞 ${BIZ.phone1}`,
        `**Water resistance — What it really means:**\n\n💧 **30m / 3ATM** — Splashes only. NO swimming.\n💦 **50m / 5ATM** — Light swimming. NO diving.\n🏊 **100m / 10ATM** — Swimming, snorkelling. No scuba diving.\n🤿 **200–300m** — Recreational diving. Submariner · Seamaster · Fifty Fathoms\n🏭 **500m+** — Technical diving. Tudor Pelagos 500m\n🌊 **1000–3900m** — Saturation diving. Rolex Deepsea 3900m\n\n⚠️ **Important:** A 30m watch can withstand rain but NOT shower pressure (water jet = dynamic pressure). Water resistance degrades over time — gaskets must be checked annually for dive watches.\n\n✅ **Nos Montres** performs water resistance tests after servicing.\n\n📞 ${BIZ.phone1}`
      )
    },

    // ═══ CONTACT / ABOUT / PRICING ══════════════════════════════════════════════

    { id: 'contact',
      kw: ['contact','joindre','appeler','telephone','téléphone','email',
           'adresse','address','located','ou etes vous','where are you',
           'find you','comment vous trouver','boutique','shop','store',
           'rendez-vous','appointment','book','reserver','réserver',
           'horaires','hours','opening hours','heures ouverture','open'],
      r: () => t(
        `**Nos Montres — Contact & Adresse :**\n\n📍 **${BIZ.addr}**\n*(Métro Miromesnil · Ligne 9 et 13)*\n\n📞 **${BIZ.phone1}**\n📞 ${BIZ.phone2}\n📧 ${BIZ.email}\n\n🕐 **${BIZ.hours}**\n\n👉 [Prendre rendez-vous en ligne](/prendre-rendez-vous.html)\n👉 [Vendre ma montre](/vendre.html)\n👉 [Révision Rolex](/revision-Rolex-Paris.html)`,
        `**Nos Montres — Contact & Address:**\n\n📍 **${BIZ.addr}**\n*(Miromesnil Metro · Lines 9 and 13)*\n\n📞 **${BIZ.phone1}**\n📞 ${BIZ.phone2}\n📧 ${BIZ.email}\n\n🕐 **${BIZ.hoursEn}**\n\n👉 [Book an appointment](/prendre-rendez-vous.html)\n👉 [Sell my watch](/vendre.html)\n👉 [Rolex service](/revision-Rolex-Paris.html)`
      )
    },

    { id: 'about',
      kw: ['qui etes vous','qui êtes vous','who are you','about you','about us',
           'à propos','a propos','who is gary','qui est gary','gary','expert',
           'votre expertise','your expertise','experience','15 ans','15 years',
           'nos montres histoire','how long','depuis quand','since when','your story'],
      r: () => t(
        `**À propos de Nos Montres :**\n\n👤 **Gary** — Expert indépendant en montres de luxe, **${BIZ.years} ans d'expérience** sur le marché secondaire parisien.\n\n**Notre spécialité :** Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier — achat, vente, expertise, révision.\n\n📍 Basés au cœur de Paris — **${BIZ.addr}** (8ème arrondissement, à 2 min du Métro Miromesnil)\n\n**Ce qui nous distingue :**\n✅ Expertise indépendante — pas d'AD, pas de commission\n✅ Paiement immédiat à l'achat\n✅ Authentification systématique\n✅ Révision par horloger certifié\n✅ Disponible 7j/7 sur rendez-vous\n\n📞 ${BIZ.phone1} · [Rendez-vous](/prendre-rendez-vous.html)`,
        `**About Nos Montres:**\n\n👤 **Gary** — Independent luxury watch expert, **${BIZ.years} years of experience** on the Parisian secondary market.\n\n**Our speciality:** Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier — buying, selling, expertise, servicing.\n\n📍 Based in the heart of Paris — **${BIZ.addr}** (8th arrondissement, 2 min from Miromesnil Metro)\n\n**What sets us apart:**\n✅ Independent expertise — no AD, no commission\n✅ Immediate payment when buying\n✅ Systematic authentication\n✅ Service by certified watchmaker\n✅ Available 7 days/week by appointment\n\n📞 ${BIZ.phone1} · [Appointment](/prendre-rendez-vous.html)`
      )
    },

    { id: 'pricing',
      kw: ['pricing','price','prix','combien','how much','coute','coûte',
           'estimate','estimation','valeur','value','worth','cote','coter',
           'what is it worth','valeur de ma','price of my','my watch worth',
           'worth of my','estimation gratuite','free estimate','what\'s it worth'],
      r: () => t(
        `**Estimation de votre montre :**\n\n🔍 **Obtenir une estimation précise :**\n\n1️⃣ **Outil en ligne** — Entrez votre marque + modèle + référence dans ce chat pour une fourchette de marché instantanée\n\n2️⃣ **Photos par email** — Envoyez photos + référence à ${BIZ.email} → offre sous 24h\n\n3️⃣ **Rendez-vous physique** — Expertise complète, offre ferme, paiement immédiat\n👉 [Prendre rendez-vous](/prendre-rendez-vous.html)\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n\n💡 Pour une estimation précise dans ce chat, dites-moi :\n• La marque (Rolex, AP, Patek…)\n• Le modèle (Submariner, Royal Oak…)\n• La référence (ex. 126610LN)\n• L'état (neuve, bon état, rayures)\n• Avec ou sans papiers/boîte`,
        `**Watch estimation:**\n\n🔍 **Get an accurate estimate:**\n\n1️⃣ **Online tool** — Enter your brand + model + reference in this chat for an instant market range\n\n2️⃣ **Photos by email** — Send photos + reference to ${BIZ.email} → offer within 24h\n\n3️⃣ **In-person appointment** — Full expertise, firm offer, immediate payment\n👉 [Book an appointment](/prendre-rendez-vous.html)\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n\n💡 For an accurate estimate in this chat, tell me:\n• The brand (Rolex, AP, Patek…)\n• The model (Submariner, Royal Oak…)\n• The reference (e.g. 126610LN)\n• Condition (new, good, scratched)\n• With or without papers/box`
      )
    },

  ]; // end KB


  // ─── Intent detection ─────────────────────────────────────────────────────────
  function isPriceIntent(n) {
    return anyKw(n, ['prix','price','combien','how much','valeur','value','vaut',
                     'estimate','estimation','cote','coter','cost','worth',
                     'montre vaut','watch worth']);
  }
  function isInvestmentIntent(n) {
    return anyKw(n, ['hold value','holds value','worth buying','good investment',
                     'worth it','is worth buying','prendre de la valeur','investissement',
                     'invest','appreciation','appreciates','store of value']);
  }
  function hasBrand(n) {
    return anyKw(n, [
      'rolex','submariner','daytona','datejust','gmt master','gmt-master','explorer',
      'milgauss','sea dweller','deepsea','sky dweller','day-date','day date','yacht master',
      '124060','126500','126610','126710','126711','126715','126334','116500',
      'pepsi','batman','root beer','rootbeer','kermit','hulk',
      'audemars','royal oak','offshore','ap watch',
      '15500','15202','15400','26470','26471',
      'patek','nautilus','aquanaut','calatrava',
      '5711','5167','5168','5726','5712','5980',
      'richard mille','rm 011','rm 027','rm 035','rm 055','rm011','rm027','rm035',
      'cartier','ballon bleu','santos','tank','pasha',
      'omega','speedmaster','seamaster','moonwatch',
      'iwc','jaeger','vacheron','lange','breguet','hublot','panerai','tudor','blancpain',
      'rm', 'ap'
    ]);
  }

  // ─── Follow-up detection ──────────────────────────────────────────────────────
  function isFollowUp(n) {
    return anyKw(n, [
      'which one','the best one','specifically','number one','top pick','the one',
      'that one','this one','the watch','that watch','pick one','choose one',
      'reference number','ref number','the ref','what ref','which ref','reference for it',
      'ref for it','what is the reference','reference of it','its reference',
      'how much is it','what does it cost','the price','its price','how much for it',
      'can you elaborate','more details','more about it','tell me more','go on',
      'explain more','what else','and what','what about it','compared to',
      'best option','your recommendation','recommend','which is better',
      'vs','versus','or the','between','difference between',
      'what year','when was it made','who made it','who designed',
      'is it worth','should i buy it','good deal','worth the money',
      'can i wear it','how to wear','dress or sport','size','how big',
      'movement inside','what movement','caliber','what caliber','the movement',
      'available','in stock','can i get one','where to buy','how to buy it'
    ]);
  }

  // ─── Context-aware follow-up responses ───────────────────────────────────────
  const FOLLOW_UP = {

    investment: n => {
      if (anyKw(n, ['which one','specifically','number one','top pick','best one',
                    'recommend','the one','pick one','choose','single best'])) {
        return t(
          `Si je devais choisir **une seule montre** comme placement absolu, ce serait la **Patek Philippe Nautilus 5711/1A-010** :\n\n💙 Cadran bleu rayé, 40mm acier, bracelet intégré\n📌 Référence : **5711/1A-010**\n💰 Retail à la discontinuation : €28 900\n📈 Marché actuel : **€70 000–€145 000**\n🚫 **Discontinuée en janvier 2021** — Patek ne la reproduira jamais sous ce nom\n\nLa combinaison "discontinuation officielle + icône culturelle + faible production" en fait le cas le plus solide.\n\nVous souhaitez une estimation pour une 5711 que vous possédez ?\n📞 **${BIZ.phone1}**`,
          `If I had to choose **one single watch** as the absolute best investment, it would be the **Patek Philippe Nautilus 5711/1A-010**:\n\n💙 Blue striped dial, 40mm steel, integrated bracelet\n📌 Reference: **5711/1A-010**\n💰 Retail at discontinuation: €28,900\n📈 Current market: **€70,000–€145,000**\n🚫 **Discontinued January 2021** — Patek will never reproduce it under this name\n\nThe combination of "official discontinuation + cultural icon + low production" makes it the strongest case.\n\nDo you own a 5711 and want an estimate?\n📞 **${BIZ.phone1}**`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref'])) {
        return t(
          `Les références clés des montres d'investissement :\n\n• **Patek Nautilus** → 5711/1A-010 (acier/bleu) · 5711/1A-011 (acier/vert)\n• **Rolex Daytona** → 116500LN (noir) · 116500LN "Panda" (blanc)\n• **AP Royal Oak Jumbo** → 15202ST.OO.1240ST.01\n• **AP Royal Oak 41mm** → 15500ST.OO.1220ST\n\nQuelle marque vous intéresse en priorité ?`,
          `Key references for investment watches:\n\n• **Patek Nautilus** → 5711/1A-010 (steel/blue) · 5711/1A-011 (steel/green)\n• **Rolex Daytona** → 116500LN (black) · 116500LN "Panda" (white)\n• **AP Royal Oak Jumbo** → 15202ST.OO.1240ST.01\n• **AP Royal Oak 41mm** → 15500ST.OO.1220ST\n\nWhich brand interests you most?`
        );
      }
      return null;
    },

    submariner: n => {
      if (anyKw(n, ['which one','best one','recommend','pick one','specifically'])) {
        return t(
          `Parmi les Submariner, je recommande selon votre objectif :\n\n🏆 **Investissement** → **126610LV "Kermit"** (lunette verte) — la plus recherchée du lineup actuel\n⌚ **Usage quotidien** → **124060 No-Date** — plus épurée, moins encombrante, cote solide\n💰 **Budget** → **116610LN** (ancienne génération 40mm) — moins chère à l'entrée\n\nQuelle est votre priorité — porter au quotidien ou placer ?`,
          `Among Submariners, my recommendation depends on your goal:\n\n🏆 **Investment** → **126610LV "Kermit"** (green bezel) — the most sought-after in the current lineup\n⌚ **Daily wear** → **124060 No-Date** — cleaner, less obtrusive, solid value\n💰 **Budget entry** → **116610LN** (old 40mm generation) — lower entry price\n\nWhat's your priority — daily wear or investment?`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références Submariner actuelles :\n\n• **124060** — No-Date, lunette/cadran noirs, 41mm (2020–)\n• **126610LN** — Date, lunette/cadran noirs, 41mm (2020–)\n• **126610LV** — Date, lunette verte "Kermit", cadran noir, 41mm (2020–)\n\nAnciennes très recherchées :\n• **116610LV "Hulk"** — cadran ET lunette verts (2010–2020)\n• **116610LN** — 40mm, lunette/cadran noirs (2010–2020)`,
          `Current Submariner references:\n\n• **124060** — No-Date, black bezel/dial, 41mm (2020–)\n• **126610LN** — Date, black bezel/dial, 41mm (2020–)\n• **126610LV** — Date, green "Kermit" bezel, black dial, 41mm (2020–)\n\nHighly sought-after older refs:\n• **116610LV "Hulk"** — green dial AND bezel (2010–2020)\n• **116610LN** — 40mm, black bezel/dial (2010–2020)`
        );
      }
      if (anyKw(n, ['how much','price','worth','cost','valeur'])) {
        return t(
          `Prix actuels Submariner (marché secondaire) :\n\n• 124060 No-Date → **€9 000–€12 000**\n• 126610LN → **€10 500–€14 000**\n• 126610LV "Kermit" → **€12 000–€17 000**\n• 116610LV "Hulk" → **€14 000–€19 000**\n\nPour votre montre spécifique : 📞 ${BIZ.phone1}`,
          `Current Submariner prices (secondary market):\n\n• 124060 No-Date → **€9,000–€12,000**\n• 126610LN → **€10,500–€14,000**\n• 126610LV "Kermit" → **€12,000–€17,000**\n• 116610LV "Hulk" → **€14,000–€19,000**\n\nFor your specific watch: 📞 ${BIZ.phone1}`
        );
      }
      return null;
    },

    daytona: n => {
      if (anyKw(n, ['which one','best one','recommend','pick one','specifically'])) {
        return t(
          `La Daytona la plus recherchée du marché actuel est la **126500LN "Panda"** (cadran blanc, index noirs) :\n\n📌 Ref : **126500LN** (cadran blanc) ou **126500LN** (cadran noir)\n💰 Marché "Panda" : **€16 000–€24 000**\n\nPour l'investissement pur, la **116500LN** (2016–2023, première céramique) reste très liquide à **€14 000–€21 000**.\n\nAvez-vous une Daytona à estimer ? 📞 ${BIZ.phone1}`,
          `The most sought-after Daytona on the current market is the **126500LN "Panda"** (white dial, black indices):\n\n📌 Ref: **126500LN** (white dial) or **126500LN** (black dial)\n💰 "Panda" market: **€16,000–€24,000**\n\nFor pure investment, the **116500LN** (2016–2023, first ceramic) remains very liquid at **€14,000–€21,000**.\n\nDo you have a Daytona to estimate? 📞 ${BIZ.phone1}`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références Daytona :\n\n**Actuelles (2023–)**\n• **126500LN** — lunette céramique noire, cadran noir ou "Panda" (blanc)\n\n**Récentes (2016–2023)**\n• **116500LN** — première Daytona céramique, très recherchée\n\n**Or blanc**\n• **126509** — or blanc, lunette céramique ou diamants\n• **116509** — version précédente\n\n**Vintages mythiques**\n• **6239 / 6241 / 6263 / 6265** — "Paul Newman" era`,
          `Daytona references:\n\n**Current (2023–)**\n• **126500LN** — ceramic black bezel, black or "Panda" (white) dial\n\n**Recent (2016–2023)**\n• **116500LN** — first ceramic Daytona, highly sought-after\n\n**White gold**\n• **126509** — white gold, ceramic or diamond bezel\n• **116509** — previous version\n\n**Mythic vintages**\n• **6239 / 6241 / 6263 / 6265** — "Paul Newman" era`
        );
      }
      return null;
    },

    nautilus: n => {
      if (anyKw(n, ['which one','best one','recommend','pick one','specifically',
                    'most sought','most wanted','the one to buy'])) {
        return t(
          `La **Nautilus 5711/1A-010** (cadran bleu) est unanimement considérée comme la montre d'investissement ultime de l'ère moderne :\n\n📌 **Référence : 5711/1A-010**\n💙 Cadran bleu rayé horizontal, 40mm, acier 316L\n📅 **Discontinuée : janvier 2021** — jamais plus reproduite sous ce nom\n💰 Retail : €28 900 → Marché : **€70 000–€145 000**\n\n📌 La version cadran blanc **5711/1A-011** est également très demandée (sortie juste avant la discontinuation, tirage très limité).\n\nVous en avez une ? 📞 ${BIZ.phone1}`,
          `The **Nautilus 5711/1A-010** (blue dial) is universally considered the ultimate investment watch of the modern era:\n\n📌 **Reference: 5711/1A-010**\n💙 Horizontal striped blue dial, 40mm, 316L steel\n📅 **Discontinued: January 2021** — never to be reproduced under this name\n💰 Retail: €28,900 → Market: **€70,000–€145,000**\n\n📌 The white dial **5711/1A-011** is also highly sought-after (released just before discontinuation, very limited run).\n\nDo you own one? 📞 ${BIZ.phone1}`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références Nautilus :\n\n• **5711/1A-010** — acier, cadran bleu *(la plus recherchée)*\n• **5711/1A-011** — acier, cadran blanc (tirage limité avant disco.)\n• **5712/1A-001** — acier, moonphase + date\n• **5726/1A-014** — acier, annual calendar\n• **5980/1AR-001** — Everose/acier, chronographe flyback\n• **5726A-014** — acier, annual calendar\n\nToutes discontinuées ou en très forte demande.`,
          `Nautilus references:\n\n• **5711/1A-010** — steel, blue dial *(the most sought-after)*\n• **5711/1A-011** — steel, white dial (limited run before disco.)\n• **5712/1A-001** — steel, moonphase + date\n• **5726/1A-014** — steel, annual calendar\n• **5980/1AR-001** — Everose/steel, flyback chronograph\n• **5726A-014** — steel, annual calendar\n\nAll discontinued or in very high demand.`
        );
      }
      return null;
    },

    royal_oak: n => {
      if (anyKw(n, ['which one','best one','recommend','pick one','specifically',
                    'most sought','most valuable','the one to buy'])) {
        return t(
          `Il y a deux réponses selon votre budget :\n\n👑 **Ultime (budget illimité)** : **Royal Oak 15202ST "Jumbo"**\n📌 Ref : 15202ST.OO.1240ST.01\n💰 Marché : **€85 000–€150 000**\nDiscontinué 2022 · Cal. 2121 partagé avec la Patek 5711 · 8.1mm d'épaisseur\n\n⭐ **Meilleur rapport valeur/accessibilité** : **Royal Oak 15500ST**\n📌 Ref : 15500ST.OO.1220ST.01\n💰 Marché : **€38 000–€55 000**\nActuel · Cal. 4302 · 41mm · Icône moderne\n\nVous souhaitez en vendre une ? 📞 ${BIZ.phone1}`,
          `Two answers depending on your budget:\n\n👑 **Ultimate (unlimited budget)**: **Royal Oak 15202ST "Jumbo"**\n📌 Ref: 15202ST.OO.1240ST.01\n💰 Market: **€85,000–€150,000**\nDiscontinued 2022 · Cal. 2121 shared with Patek 5711 · 8.1mm thick\n\n⭐ **Best value/accessibility**: **Royal Oak 15500ST**\n📌 Ref: 15500ST.OO.1220ST.01\n💰 Market: **€38,000–€55,000**\nCurrent · Cal. 4302 · 41mm · Modern icon\n\nLooking to sell one? 📞 ${BIZ.phone1}`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références Royal Oak clés :\n\n• **15202ST** "Jumbo/Extra-Thin" — 39mm, Cal. 2121 *(discontinué 2022)*\n• **15500ST** — 41mm, Cal. 4302 *(actuel)*\n• **15400ST** — 41mm, Cal. 3120 *(2012–2021)*\n• **15300ST** — 39mm, Cal. 3120 *(2005–2012)*\n• **26240ST** — Chronographe 41mm\n• **26470ST** — Offshore Chronographe 42mm\n• **15703ST** — Offshore Diver 42mm`,
          `Key Royal Oak references:\n\n• **15202ST** "Jumbo/Extra-Thin" — 39mm, Cal. 2121 *(discontinued 2022)*\n• **15500ST** — 41mm, Cal. 4302 *(current)*\n• **15400ST** — 41mm, Cal. 3120 *(2012–2021)*\n• **15300ST** — 39mm, Cal. 3120 *(2005–2012)*\n• **26240ST** — Chronograph 41mm\n• **26470ST** — Offshore Chronograph 42mm\n• **15703ST** — Offshore Diver 42mm`
        );
      }
      return null;
    },

    gmt: n => {
      if (anyKw(n, ['which one','best one','recommend','pick one','specifically'])) {
        return t(
          `La GMT la plus iconique et recherchée est le **126710BLRO "Pepsi"** (lunette rouge/bleue) :\n\n📌 Ref : **126710BLRO**\n🔴🔵 Lunette céramique bicolore rouge/bleue\n⌚ 40mm, bracelet Jubilee 5 maillons\n💰 Marché : **€12 000–€18 000**\n\nLe "Batman" (**126710BLNR**, bleu/noir) est légèrement moins cher mais tout aussi populaire.\n\nPour une estimation de votre GMT : 📞 ${BIZ.phone1}`,
          `The most iconic and sought-after GMT is the **126710BLRO "Pepsi"** (red/blue bezel):\n\n📌 Ref: **126710BLRO**\n🔴🔵 Red/blue ceramic bicolour bezel\n⌚ 40mm, 5-link Jubilee bracelet\n💰 Market: **€12,000–€18,000**\n\nThe "Batman" (**126710BLNR**, blue/black) is slightly less expensive but equally popular.\n\nFor an estimate on your GMT: 📞 ${BIZ.phone1}`
        );
      }
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références GMT-Master II :\n\n• **126710BLRO** — "Pepsi" rouge/bleu, Jubilee *(actuel)*\n• **126710BLNR** — "Batman" bleu/noir, Jubilee *(actuel)*\n• **126715CHNR** — "Root Beer" Everose, brun/noir *(actuel)*\n• **116710BLNR** — "Batman" (2013–2019)\n• **116710BLRO** — "Pepsi" acier (2007–2019)\n• **116718LN** — "Sprite" or jaune, lunette noire\n• **16710** — Génération précédente (aluminium)`,
          `GMT-Master II references:\n\n• **126710BLRO** — "Pepsi" red/blue, Jubilee *(current)*\n• **126710BLNR** — "Batman" blue/black, Jubilee *(current)*\n• **126715CHNR** — "Root Beer" Everose, brown/black *(current)*\n• **116710BLNR** — "Batman" (2013–2019)\n• **116710BLRO** — "Pepsi" steel (2007–2019)\n• **116718LN** — "Sprite" yellow gold, black bezel\n• **16710** — Previous generation (aluminium)`
        );
      }
      return null;
    },

    rm027: n => {
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number'])) {
        return t(
          `Références RM 027 :\n\n• **RM 027.01** (2010) — Première édition Nadal\n• **RM 027.02** (2012) — Évolution technique\n• **RM 027.03 "Americas"** (2013) — Édition marché Amériques\n\nChaque édition est numérotée — les premiers numéros valent plus.`,
          `RM 027 references:\n\n• **RM 027.01** (2010) — First Nadal edition\n• **RM 027.02** (2012) — Technical evolution\n• **RM 027.03 "Americas"** (2013) — Americas market edition\n\nEach edition is numbered — lower serial numbers command a premium.`
        );
      }
      return null;
    },

  };

  // ─── Main router ─────────────────────────────────────────────────────────────
  function getResponse(userInput) {
    const n = norm(userInput);

    // Live price from Worker: price intent + brand + NOT investment topic
    if (isPriceIntent(n) && hasBrand(n) && !isInvestmentIntent(n)) {
      return '__WORKER__';
    }

    // KB scan — first match wins, track context
    for (const entry of KB) {
      if (anyKw(n, entry.kw)) {
        ctx.lastEntry = entry.id;
        return entry.r();
      }
    }

    // ── Follow-up / contextual intelligence ──────────────────────────────────
    // Try topic-specific follow-up handler first
    if (ctx.lastEntry && FOLLOW_UP[ctx.lastEntry]) {
      const fu = FOLLOW_UP[ctx.lastEntry](n);
      if (fu) return fu;
    }

    // Generic follow-up when we have brand/model context
    if (isFollowUp(n) && ctx.lastEntry) {
      // Reference question — handle generically across any model
      if (anyKw(n, ['reference','ref ','the ref','what ref','reference number',
                    'reference of it','ref for it','its reference'])) {
        const refs = {
          submariner: '124060 (no-date) · 126610LN (date, black) · 126610LV (date, Kermit green)',
          daytona:    '126500LN (ceramic, current) · 116500LN (2016–2023)',
          gmt:        '126710BLRO "Pepsi" · 126710BLNR "Batman" · 126715CHNR "Root Beer"',
          nautilus:   '5711/1A-010 (blue) · 5711/1A-011 (white) — both discontinued 2021',
          royal_oak:  '15202ST "Jumbo" (discontinued) · 15500ST (current, 41mm)',
          aquanaut:   '5167A-001 (steel, black) · 5168G-010 (white gold, blue)',
          offshore:   '26470ST (chronograph) · 26471SR (ceramic/steel) · 26480TI (titanium)',
          speedmaster:'311.30.42.30.01.005 (manual, Moonwatch) · 310.30.42.50.01.001 (Cal.321)',
          seamaster:  '210.30.42.20.01.001 (Diver 300M) · 215.30.44.21.01.001 (Planet Ocean)',
          santos:     'WSSA0018 (medium steel) · WSSA0029 (medium steel/gold) · WSSA0009 (XL)',
          tank:       'WSTA0041 (Tank Must) · W5200028 (Tank Louis Cartier gold)',
        };
        const modelRef = refs[ctx.model] || refs[ctx.lastEntry];
        if (modelRef) {
          return t(
            `Références pour ${ctx.model || ctx.lastEntry} :\n\n📌 ${modelRef}\n\nVous avez une pièce spécifique à estimer ? 📞 ${BIZ.phone1}`,
            `References for ${ctx.model || ctx.lastEntry}:\n\n📌 ${modelRef}\n\nDo you have a specific piece to estimate? 📞 ${BIZ.phone1}`
          );
        }
      }

      // "Which one is best" generically
      if (anyKw(n, ['which one','best one','specifically','top pick','recommend',
                    'most sought','number one','pick one'])) {
        const brandName = { rolex:'Rolex', ap:'Audemars Piguet', patek:'Patek Philippe',
                            rm:'Richard Mille', cartier:'Cartier', omega:'Omega' }[ctx.brand];
        if (brandName) {
          return t(
            `Pouvez-vous préciser — parmi les ${brandName}, quel est votre priorité : **investissement**, **usage quotidien**, ou **prestige** ? Je pourrai vous donner une recommandation précise.\n\n📞 Ou discutez directement avec Gary : ${BIZ.phone1}`,
            `Could you specify — among ${brandName} watches, what is your priority: **investment**, **daily use**, or **prestige**? I'll give you a precise recommendation.\n\n📞 Or speak directly with Gary: ${BIZ.phone1}`
          );
        }
      }
    }

    // Brand/model context — give a targeted prompt
    if (ctx.brand) {
      const brandName = { rolex:'Rolex', ap:'Audemars Piguet', patek:'Patek Philippe',
                          rm:'Richard Mille', cartier:'Cartier', omega:'Omega',
                          iwc:'IWC', jlc:'Jaeger-LeCoultre', vacheron:'Vacheron Constantin',
                          lange:'A. Lange & Söhne', tudor:'Tudor' }[ctx.brand] || ctx.brand;
      const modelStr = ctx.model ? ` ${ctx.model}` : '';
      return t(
        `Sur la **${brandName}${modelStr}**, je peux vous renseigner sur :\n• La référence exacte\n• Le prix du marché secondaire\n• L'histoire et les spécifications\n• La révision / l'entretien\n• La comparaison avec un autre modèle\n\nQuelle information cherchez-vous ?\n📞 ${BIZ.phone1}`,
        `About the **${brandName}${modelStr}**, I can tell you about:\n• The exact reference\n• Secondary market price\n• History and specifications\n• Service / maintenance\n• Comparison with another model\n\nWhat information are you looking for?\n📞 ${BIZ.phone1}`
      );
    }

    // Smart generic fallback
    return t(
      `Je ne suis pas sûr de comprendre — mais posez-moi n'importe quelle question sur les montres de luxe !\n\n💡 **Essayez par exemple :**\n• _"Quelle est la meilleure Rolex ?"_\n• _"Référence de la Submariner ?"_\n• _"Combien vaut ma Nautilus 5711 ?"_\n• _"Quelle montre acheter pour 20 000€ ?"_\n• _"Je veux vendre ma Daytona"_\n\n📞 **${BIZ.phone1}** — Gary répond directement`,
      `I'm not quite sure I understand — but ask me anything about luxury watches!\n\n💡 **Try for example:**\n• _"What is the best Rolex?"_\n• _"Submariner reference number?"_\n• _"How much is my Nautilus 5711 worth?"_\n• _"Which watch to buy for €20,000?"_\n• _"I want to sell my Daytona"_\n\n📞 **${BIZ.phone1}** — Gary answers directly`
    );
  }


  // ─── UI RENDER ────────────────────────────────────────────────────────────────
  function render() {
    const style = document.createElement('style');
    style.textContent = `
      #nm-chat-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;
        width:60px;height:60px;border-radius:50%;background:#1a1a1a;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        box-shadow:0 4px 20px rgba(0,0,0,.45);transition:transform .2s;}
      #nm-chat-bubble:hover{transform:scale(1.08);}
      #nm-chat-bubble svg{width:28px;height:28px;fill:none;stroke:#c9a84c;stroke-width:2;}
      #nm-chat-window{position:fixed;bottom:96px;right:24px;z-index:9999;
        width:380px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 120px);
        background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.22);
        display:none;flex-direction:column;overflow:hidden;font-family:'Inter',sans-serif;}
      #nm-chat-header{background:#1a1a1a;padding:16px 18px;display:flex;
        align-items:center;gap:12px;}
      #nm-chat-header .logo{width:36px;height:36px;border-radius:50%;
        background:#c9a84c;display:flex;align-items:center;justify-content:center;
        font-size:16px;font-weight:700;color:#1a1a1a;}
      #nm-chat-header .info{flex:1;}
      #nm-chat-header .name{color:#fff;font-size:14px;font-weight:600;}
      #nm-chat-header .status{color:#c9a84c;font-size:11px;margin-top:2px;}
      #nm-chat-header .close-btn{background:none;border:none;color:#888;
        font-size:20px;cursor:pointer;padding:0 4px;line-height:1;}
      #nm-chat-messages{flex:1;overflow-y:auto;padding:16px;
        display:flex;flex-direction:column;gap:10px;background:#f8f7f5;}
      .nm-msg{max-width:88%;padding:10px 13px;border-radius:12px;
        font-size:13.5px;line-height:1.55;word-break:break-word;}
      .nm-msg.bot{background:#fff;border:1px solid #e8e3d8;border-radius:12px 12px 12px 2px;
        color:#1a1a1a;align-self:flex-start;}
      .nm-msg.user{background:#1a1a1a;color:#fff;border-radius:12px 12px 2px 12px;
        align-self:flex-end;}
      .nm-msg strong{font-weight:700;}
      .nm-msg a{color:#c9a84c;text-decoration:underline;}
      .nm-msg ul,.nm-msg ol{margin:6px 0 0 16px;padding:0;}
      .nm-msg li{margin-bottom:3px;}
      .nm-typing{display:flex;gap:4px;padding:10px 14px;background:#fff;
        border:1px solid #e8e3d8;border-radius:12px 12px 12px 2px;align-self:flex-start;width:52px;}
      .nm-typing span{width:7px;height:7px;background:#c9a84c;border-radius:50%;
        animation:nm-bounce .9s infinite;}
      .nm-typing span:nth-child(2){animation-delay:.15s;}
      .nm-typing span:nth-child(3){animation-delay:.3s;}
      @keyframes nm-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
      #nm-chat-input-row{padding:12px 14px;background:#fff;
        border-top:1px solid #eee;display:flex;gap:8px;align-items:center;}
      #nm-chat-input{flex:1;border:1px solid #ddd;border-radius:22px;
        padding:9px 14px;font-size:13px;outline:none;background:#fafafa;
        transition:border-color .2s;}
      #nm-chat-input:focus{border-color:#c9a84c;}
      #nm-chat-send{background:#1a1a1a;color:#fff;border:none;
        border-radius:50%;width:36px;height:36px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:background .2s;}
      #nm-chat-send:hover{background:#c9a84c;}
      #nm-chat-send svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.2;}
      @media(max-width:440px){#nm-chat-window{width:calc(100vw - 16px);right:8px;bottom:80px;}}
    `;
    document.head.appendChild(style);

    // Bubble
    const bubble = document.createElement('div');
    bubble.id = 'nm-chat-bubble';
    bubble.title = t('Estimation en direct', 'Live estimate');
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(bubble);

    // Chat window
    const win = document.createElement('div');
    win.id = 'nm-chat-window';
    const headerStatus = t('Expert · Estimation instantanée', 'Expert · Instant estimate');
    const inputPlaceholder = t('Ex: valeur de ma Rolex Submariner…', 'E.g. value of my Rolex Submariner…');
    win.innerHTML = `
      <div id="nm-chat-header">
        <div class="logo">NM</div>
        <div class="info">
          <div class="name">Nos Montres Expert</div>
          <div class="status">● ${headerStatus}</div>
        </div>
        <button class="close-btn" id="nm-close">✕</button>
      </div>
      <div id="nm-chat-messages"></div>
      <div id="nm-chat-input-row">
        <input id="nm-chat-input" type="text" placeholder="${inputPlaceholder}" autocomplete="off" />
        <button id="nm-chat-send"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </div>`;
    document.body.appendChild(win);

    const msgs   = win.querySelector('#nm-chat-messages');
    const input  = win.querySelector('#nm-chat-input');
    const sendBtn= win.querySelector('#nm-chat-send');
    const closeBtn=win.querySelector('#nm-close');

    function md(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$1" target="_blank">$2</a>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2">$1</a>')
        .replace(/\n/g,'<br>');
    }
    function addMsg(text, who) {
      const el = document.createElement('div');
      el.className = `nm-msg ${who}`;
      el.innerHTML = who === 'bot' ? md(text) : text.replace(/</g,'&lt;');
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function showTyping() {
      const el = document.createElement('div');
      el.className = 'nm-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }
    function fixLinks(text) {
      return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    }

    function send() {
      const raw = input.value.trim();
      if (!raw) return;
      addMsg(raw, 'user');
      input.value = '';
      const typing = showTyping();

      const result = getResponse(raw);

      if (result === '__WORKER__') {
        fetch(WORKER_URL + '?q=' + encodeURIComponent(raw))
          .then(r => r.json())
          .then(data => {
            typing.remove();
            addMsg(data.message || t('Prix non disponible.','Price not available.'), 'bot');
          })
          .catch(() => {
            typing.remove();
            addMsg(t('Service temporairement indisponible. Appelez-nous : ' + BIZ.phone1,
                     'Service temporarily unavailable. Call us: ' + BIZ.phone1), 'bot');
          });
      } else {
        setTimeout(() => {
          typing.remove();
          addMsg(result, 'bot');
        }, 420 + Math.random() * 300);
      }
    }

    // Greet on open
    function openChat() {
      win.style.display = 'flex';
      bubble.style.display = 'none';
      if (!msgs.children.length) {
        const typing = showTyping();
        setTimeout(() => {
          typing.remove();
          addMsg(t(
            `Bonjour ! 👋 Je suis l'assistant expert horloger de **Nos Montres**.\n\nJe connais en détail : Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier · Omega · IWC · Jaeger-LeCoultre · Vacheron Constantin · A. Lange & Söhne · Breguet · Hublot · Panerai · Tudor et bien plus.\n\nPosez-moi n'importe quelle question sur les montres, ou dites-moi quelle montre vous souhaitez estimer 💰`,
            `Hello! 👋 I'm the expert watch advisor at **Nos Montres**.\n\nI know in detail: Rolex · Audemars Piguet · Patek Philippe · Richard Mille · Cartier · Omega · IWC · Jaeger-LeCoultre · Vacheron Constantin · A. Lange & Söhne · Breguet · Hublot · Panerai · Tudor and many more.\n\nAsk me anything about watches, or tell me which watch you'd like to estimate 💰`
          ), 'bot');
        }, 600);
      }
      input.focus();
    }

    bubble.addEventListener('click', openChat);
    closeBtn.addEventListener('click', () => {
      win.style.display = 'none';
      bubble.style.display = 'flex';
    });
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }

  render();
})();
