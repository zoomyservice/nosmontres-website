(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  // ─── Language helper ────────────────────────────────────────────────────────
  function lang() {
    return (window.NM && window.NM.lang) ? window.NM.lang : 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  // ─── Keyword matching ────────────────────────────────────────────────────────
  // Short keywords (≤4 chars) must match as whole words to prevent false positives
  // e.g. "hi" must not match "history", "philippe", "ship"
  function norm(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function kwMatch(n, kw) {
    const nkw = norm(kw);
    if (nkw.length <= 4) {
      // word-boundary match: whole word only
      const re = new RegExp('(?:^|\\s)' + nkw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)');
      return re.test(n);
    }
    return n.includes(nkw);
  }

  // ─── Knowledge Base ─────────────────────────────────────────────────────────
  // PRIORITY ORDER MATTERS — first match wins.
  // sell/investment/authenticity/condition must come BEFORE brand entries
  // so "fake rolex" → authenticity, "rolex investment" → investment
  const KB = {

    // ── GREETING (word-boundary only — "hi" must not match "history") ─────────
    greeting: {
      keywords: ['bonjour', 'bonsoir', 'salut', 'allo', 'hello', 'hey', 'hola', 'coucou',
                 'good morning', 'good evening', 'good afternoon',
                 'hi', 'yo'],
      response: () => t(
        `Bonjour ! 👋 Je suis l'assistant Nos Montres.\n\nJe peux vous aider avec :\n• 💰 Estimation de votre montre en temps réel\n• 🏷️ Infos sur Rolex, AP, Patek, Richard Mille, Cartier\n• 📋 Comment vendre votre montre\n• 🔍 Authenticité et état\n\nQue puis-je faire pour vous ?`,
        `Hello! 👋 I'm the Nos Montres assistant.\n\nI can help you with:\n• 💰 Real-time watch valuation\n• 🏷️ Info on Rolex, AP, Patek, Richard Mille, Cartier\n• 📋 How to sell your watch\n• 🔍 Authenticity and condition\n\nHow can I help you?`
      )
    },

    // ── SELL / BUYBACK (before brands so "sell my rolex" → sell, not rolex) ───
    sell: {
      keywords: ['vendre', 'sell', 'céder', 'revendre', 'racheter', 'rachat', 'buyback',
                 'buy my', 'buy back', 'je veux vendre', 'how to sell', 'comment vendre',
                 'offre de rachat', 'get an offer', 'will you buy', 'can you buy',
                 'vous achetez', 'vous rachetez', 'achetez ma', 'will you pay',
                 'how much will you', 'pay me for', 'offer for my', 'offre pour',
                 'selling my watch', 'selling my', 'je revends', 'can you make an offer',
                 'make me an offer', 'do you buy', 'do you purchase'],
      response: () => t(
        `Nous rachetons les montres de luxe au meilleur prix du marché ! 🎯\n\n**Notre processus :**\n1. Estimez votre montre gratuitement → [Page Vendre](/vendre.html)\n2. Offre ferme sous 24h\n3. Remise en main propre à Bruxelles ou envoi sécurisé\n4. Paiement immédiat\n\nNous achetons : Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n👉 [Obtenir mon estimation gratuite](/vendre.html)`,
        `We buy luxury watches at the best market price! 🎯\n\n**Our process:**\n1. Get a free estimate → [Sell page](/vendre.html)\n2. Firm offer within 24h\n3. Hand-delivery in Brussels or secure shipping\n4. Immediate payment\n\nWe buy: Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n👉 [Get my free estimate](/vendre.html)`
      )
    },

    // ── INVESTMENT (before brands so "rolex investment" → investment) ─────────
    investment: {
      keywords: ['invest', 'investment', 'investir', 'investissement', 'appreciation',
                 'plus-value', 'best watch', 'meilleure montre', 'quelle montre',
                 'store of value', 'placement', 'buy watch', 'acheter montre',
                 'appreciates', 'appreciate', 'watches appreciate', 'portfolio',
                 'return on investment', 'is a watch a good', 'should i buy',
                 'which watch to buy', 'which watch should', 'watch is best',
                 'which watch is', 'valeur augmente',
                 'prendre de la valeur', 'montre qui prend', 'watches vs',
                 'best luxury', 'watch to buy', 'luxury watch to', 'holds value',
                 'hold value', 'good investment', 'holds its value',
                 'worth buying', 'worth it', 'is worth buying', 'worth the price'],
      response: () => t(
        `**Montres comme investissement — notre avis d'expert :**\n\n🏆 **Meilleures montres à titre de placement :**\n1. **Patek Philippe Nautilus 5711** — 5–10× prix boutique sur le marché secondaire\n2. **Rolex Daytona 116500LN** — Liste d'attente, forte demande\n3. **AP Royal Oak 15202 / 15500** — Marché très actif\n4. **Richard Mille** — Éditions limitées, très liquides\n\n📊 **Ce qui fait monter la valeur :** édition limitée / discontinuée, papiers + boîte d'origine, état pristine, forte demande.\n\n⚠️ Toutes les montres ne s'apprécient pas — privilégiez les grandes maisons avec historique prouvé.`,
        `**Watches as investments — our expert view:**\n\n🏆 **Best watches as investments:**\n1. **Patek Philippe Nautilus 5711** — 5–10× retail on secondary market\n2. **Rolex Daytona 116500LN** — Waitlist, strong demand\n3. **AP Royal Oak 15202 / 15500** — Very active market\n4. **Richard Mille** — Limited editions, highly liquid\n\n📊 **What drives value up:** limited/discontinued edition, original papers + box, pristine condition, high demand vs low supply.\n\n⚠️ Not all watches appreciate — stick to major maisons with a proven value track record.`
      )
    },

    // ── AUTHENTICITY (before brands so "fake rolex" → authenticity) ───────────
    authenticity: {
      keywords: ['authentic', 'authentique', 'fake', 'faux', 'counterfeit', 'contrefaçon',
                 'genuine', 'verify', 'vérifier', 'légit', 'legit',
                 'copie', 'real watch', 'is it real', 'is this real', 'est vraie', 'est fausse',
                 'is it fake', 'spot a fake', 'how to spot', 'tell if real',
                 'comment savoir', 'is my watch real', 'is this real',
                 'réelle', 'fausse', 'vraie', 'trust', 'real'],
      response: () => t(
        `**Comment vérifier l'authenticité d'une montre de luxe :**\n\n🔍 **Points clés :**\n• **Numéro de série** — gravé entre les cornes, unique à chaque montre\n• **Mouvement** — rotor silencieux, balancier précis visible au fond de boîte\n• **Cadran** — typographie parfaite, aucune faute d'orthographe\n• **Couronne & poussoirs** — finition impeccable, bonne résistance\n• **Papiers d'origine** — boîte, garantie, facture\n\n⚠️ En cas de doute, faites expertiser par un professionnel avant achat ou vente.\n\n✅ Chez Nos Montres, nous authentifions chaque pièce avant toute transaction.`,
        `**How to verify a luxury watch's authenticity:**\n\n🔍 **Key points:**\n• **Serial number** — engraved between the lugs, unique to each watch\n• **Movement** — silent rotor, precise balance wheel visible through caseback\n• **Dial** — perfect typography, no spelling errors\n• **Crown & pushers** — impeccable finishing, proper resistance\n• **Original papers** — box, warranty card, receipt\n\n⚠️ When in doubt, have it authenticated by a professional before any purchase or sale.\n\n✅ At Nos Montres, we authenticate every piece before any transaction.`
      )
    },

    // ── CONDITION / PAPERS ────────────────────────────────────────────────────
    condition: {
      keywords: ['condition', 'état', 'papers', 'papiers', 'boite', 'boîte', 'box',
                 'sans papiers', 'without papers', 'avec papiers', 'with papers',
                 'unworn', 'neuve', 'mint', 'scratches', 'rayures',
                 'does condition matter', 'does box matter', 'no papers',
                 'used watch', 'occasion watch', 'pre-owned', 'pre owned',
                 'wear marks', 'polished', 'service history', 'full set',
                 'original papers', 'original box', 'original receipt'],
      response: () => t(
        `**État et papiers — leur impact sur la valeur :**\n\n✨ **Neuve / Jamais portée :** +12–15% sur le prix de base\n📄 **Avec papiers & boîte complète :** Valeur maximale (+8–15% vs sans papiers)\n📦 **Sans papiers :** Réduction de 7–8%\n🔧 **Rayures légères :** Réduction minime\n⚠️ **Polissage non original :** Réduit la valeur (surtout AP et RM)\n\nNos estimations sur la [page Vendre](/vendre.html) prennent tout cela en compte automatiquement.`,
        `**Condition and papers — their impact on value:**\n\n✨ **New / Unworn:** +12–15% on the base price\n📄 **With papers & full box:** Maximum value (+8–15% vs no papers)\n📦 **Without papers:** 7–8% reduction\n🔧 **Light scratches:** Minimal reduction\n⚠️ **Non-original polishing:** Reduces value (especially AP and RM)\n\nOur estimates on the [Sell page](/vendre.html) account for all of this automatically.`
      )
    },

    // ── ROLEX ─────────────────────────────────────────────────────────────────
    rolex: {
      keywords: ['rolex', 'submariner', 'daytona', 'datejust', 'gmt master', 'gmt-master',
                 'sky-dweller', 'milgauss', 'yacht-master', 'oyster perpetual', 'explorer',
                 'what is the submariner', 'tell me about rolex', 'about rolex',
                 'rolex brand', 'rolex watches', 'rolex history', 'rolex reputation',
                 'rolex popular', 'rolex special', 'best rolex'],
      response: () => t(
        `**Rolex** est la référence absolue du marché de la montre de luxe.\n\n🏆 **Modèles les plus recherchés :**\n• **Submariner 124060** — Plongée iconique, ~€11k–€15k d'occasion\n• **Daytona 116500LN** — Chronographe de légende, ~€14k–€21k\n• **GMT-Master II "Pepsi"** — Deux fuseaux, ~€13.5k–€18k\n• **Datejust 41** — Élégance intemporelle, ~€9.5k–€13.5k\n\n📈 Rolex est considérée comme un placement sûr — certains modèles s'apprécient avec le temps.\n\n💡 Vous avez une Rolex ? Dites-moi la référence pour une estimation en direct !`,
        `**Rolex** is the absolute benchmark of the luxury watch market.\n\n🏆 **Most sought-after models:**\n• **Submariner 124060** — Iconic diver, ~€11k–€15k used\n• **Daytona 116500LN** — Legendary chronograph, ~€14k–€21k\n• **GMT-Master II "Pepsi"** — Two time zones, ~€13.5k–€18k\n• **Datejust 41** — Timeless elegance, ~€9.5k–€13.5k\n\n📈 Rolex is considered a safe investment — some models appreciate over time.\n\n💡 Got a Rolex? Tell me the reference for a live estimate!`
      )
    },

    // ── AUDEMARS PIGUET ───────────────────────────────────────────────────────
    ap: {
      keywords: ['audemars', 'piguet', 'royal oak', '15500', '15202', '15400',
                 '26331', 'offshore', 'code 11.59', 'what is ap', 'ap watch',
                 'tell me about ap', 'about audemars', 'audemars history',
                 'audemars brand', 'ap brand', 'why is ap', 'is audemars'],
      response: () => t(
        `**Audemars Piguet** — l'inventeur de la montre sport de luxe en acier.\n\n⌚ **Modèles phares :**\n• **Royal Oak 15500** — L'icône moderne, ~€38k–€50k d'occasion\n• **Royal Oak 15202** — Ultrathin 39mm, ~€85k–€145k\n• **Royal Oak 15400** — Version précédente, ~€26k–€42k\n• **Royal Oak Offshore** — Sport extrême, prix selon référence\n\n🔑 Dessinée en 1972 par Gérald Genta, la Royal Oak a révolutionné l'horlogerie de luxe avec son acier poli-brossé et son octogone iconique.\n\n💡 Vous avez une AP ? Dites-moi la référence pour une estimation !`,
        `**Audemars Piguet** — the inventor of the luxury steel sports watch.\n\n⌚ **Key models:**\n• **Royal Oak 15500** — The modern icon, ~€38k–€50k used\n• **Royal Oak 15202** — Ultrathin 39mm, ~€85k–€145k\n• **Royal Oak 15400** — Previous generation, ~€26k–€42k\n• **Royal Oak Offshore** — Extreme sport, price varies by ref\n\n🔑 Designed in 1972 by Gérald Genta, the Royal Oak revolutionised luxury watchmaking with its polished-brushed steel and iconic octagon.\n\n💡 Got an AP? Tell me the reference for an estimate!`
      )
    },

    // ── PATEK PHILIPPE ────────────────────────────────────────────────────────
    patek: {
      keywords: ['patek', 'philippe', 'nautilus', '5711', '5726', '5167', '5980',
                 'aquanaut', 'calatrava', 'grand complication',
                 'tell me about patek', 'about patek', 'patek brand',
                 'patek history', 'why is patek', 'is patek', 'what is patek',
                 'what is the nautilus', 'nautilus info'],
      response: () => t(
        `**Patek Philippe** — *"Vous ne possédez jamais une Patek Philippe, vous la gardez pour la prochaine génération."*\n\n💎 **Modèles emblématiques :**\n• **Nautilus 5711/1A** — Le Saint Graal, ~€76k–€148k\n• **Nautilus 5167/1A** — Aquanaut, ~€36k–€58k\n• **Calatrava** — Élégance classique, selon modèle\n\n📈 Parmi les meilleures montres en terme d'investissement — la 5711 vaut 5–10× son prix boutique sur le marché secondaire.\n\n💡 Vous avez une Patek ? Dites-moi la référence pour une estimation en direct !`,
        `**Patek Philippe** — *"You never actually own a Patek Philippe, you merely look after it for the next generation."*\n\n💎 **Iconic models:**\n• **Nautilus 5711/1A** — The holy grail, ~€76k–€148k\n• **Nautilus 5167/1A** — Contemporary Aquanaut, ~€36k–€58k\n• **Calatrava** — Classic elegance, varies by model\n\n📈 Among the best watches as investments — the 5711 is worth 5–10× retail on the secondary market.\n\n💡 Got a Patek? Tell me the reference for a live estimate!`
      )
    },

    // ── RICHARD MILLE ─────────────────────────────────────────────────────────
    rm: {
      keywords: ['richard mille', 'rm 011', 'rm 035', 'rm 055', 'rm 027', 'rm 027', 'rm 030',
                 'rm011', 'rm035', 'rm055',
                 'tell me about richard', 'about richard mille', 'richard mille brand',
                 'richard mille watches', 'why is richard mille', 'richard mille history'],
      response: () => t(
        `**Richard Mille** — l'avant-garde de l'horlogerie haute technologie.\n\n🏎️ **Modèles populaires :**\n• **RM 011** — Felipe Massa flyback, ~€170k–€340k\n• **RM 035** — Ultraléger Rafael Nadal, ~€140k–€270k\n• **RM 055** — Bubba Watson, sans chiffres\n\n⚡ Matériaux aérospatiaux (NTPT, titane, carbone) associés à une mécanique de haute précision. Éditions très limitées — liquidité et valeur stables.\n\n💡 Vous avez une Richard Mille ? Dites-moi le modèle pour une estimation !`,
        `**Richard Mille** — the avant-garde of high-tech watchmaking.\n\n🏎️ **Popular models:**\n• **RM 011** — Felipe Massa flyback, ~€170k–€340k\n• **RM 035** — Rafael Nadal ultralight, ~€140k–€270k\n• **RM 055** — Bubba Watson, no numerals\n\n⚡ Aerospace materials (NTPT, titanium, carbon) combined with precision mechanics. Very limited editions — stable liquidity and value.\n\n💡 Got a Richard Mille? Tell me the model for an estimate!`
      )
    },

    // ── CARTIER ───────────────────────────────────────────────────────────────
    cartier: {
      keywords: ['cartier', 'santos', 'tank', 'pasha', 'ballon bleu', 'panthère',
                 'drive de cartier', 'tell me about cartier', 'about cartier',
                 'cartier brand', 'cartier history', 'cartier watches', 'what is cartier'],
      response: () => t(
        `**Cartier** — la maison joaillière devenue maître horloger.\n\n💛 **Modèles populaires :**\n• **Santos de Cartier** — La première montre-bracelet de l'aviation (1904)\n• **Tank** — Icône intemporelle depuis 1917\n• **Ballon Bleu** — Rondeur contemporaine et élégante\n• **Pasha** — Sportif et distinctif\n\nCartier se revend bien sur le marché secondaire, surtout les éditions limitées et les modèles sport en acier.\n\n💡 Vous avez une Cartier ? Dites-moi le modèle pour une estimation !`,
        `**Cartier** — the jewellery house turned master watchmaker.\n\n💛 **Popular models:**\n• **Santos de Cartier** — The first pilot's wristwatch (1904)\n• **Tank** — A timeless icon since 1917\n• **Ballon Bleu** — Contemporary and elegant curves\n• **Pasha** — Sporty and distinctive\n\nCartier resells well on the secondary market, especially limited editions and steel sports models.\n\n💡 Got a Cartier? Tell me the model for an estimate!`
      )
    },

    // ── PRICING / VALUATION (after brand entries — so "5711 price" → patek, not here) ──
    pricing: {
      keywords: ['prix', 'price', 'combien', 'how much', 'valeur', 'value', 'vaut',
                 'worth', 'estimate', 'estimation', 'cote', 'côte', 'coter',
                 'secondary market', 'marché secondaire', 'cotes',
                 'give me an estimate', 'estimation gratuite', 'what is it worth',
                 'what are prices', 'what are watch prices',
                 'valuation', 'appraisal', 'appraised', 'cost',
                 'how do i know what my watch is worth', 'what my watch is worth'],
      response: () => t(
        `Je peux estimer la valeur de votre montre en temps réel ! 💰\n\nDites-moi simplement la marque et le modèle (ex: **"Rolex Submariner 124060"**) et je récupère les prix du marché secondaire en direct.\n\nOu pour une estimation personnalisée avec papiers / état, rendez-vous sur notre **[page Vendre](/vendre.html)**.`,
        `I can estimate your watch's value in real time! 💰\n\nJust tell me the brand and model (e.g. **"Rolex Submariner 124060"**) and I'll pull live secondary market prices.\n\nOr for a personalised estimate based on condition and papers, visit our **[Sell page](/vendre.html)**.`
      )
    },

    // ── CONTACT / APPOINTMENT ─────────────────────────────────────────────────
    contact: {
      keywords: ['contact', 'appointment', 'rendez-vous', 'rdv', 'meeting',
                 'phone', 'téléphone', 'email', 'whatsapp', 'book',
                 'réserver', 'how to reach', 'reach you', 'come to you',
                 'can i meet', 'meet you', 'meet in person', 'visit you',
                 'find you', 'where to find', 'adresse', 'address',
                 'get in touch', 'joindre', 'rejoindre',
                 'visit in person', 'can i come', 'come visit', 'come see',
                 'in person', 'drop by', 'venir vous voir', 'passer vous voir',
                 'located', 'where are you located', 'your location'],
      response: () => t(
        `**Prendre rendez-vous :**\n\n📅 Nous opérons sur rendez-vous uniquement — service personnalisé et discret garanti.\n\n👉 [Réserver un rendez-vous](/prendre-rendez-vous.html)\n\n📍 **Localisation :** Bruxelles — l'adresse exacte est communiquée à la confirmation du RDV.\n\nPour une première approche, obtenez d'abord votre estimation sur la [page Vendre](/vendre.html).`,
        `**Book an appointment:**\n\n📅 We operate by appointment only — personalised and discreet service guaranteed.\n\n👉 [Book an appointment](/prendre-rendez-vous.html)\n\n📍 **Location:** Brussels — exact address shared upon appointment confirmation.\n\nFor a first step, get your estimate on the [Sell page](/vendre.html) first.`
      )
    },

    // ── ABOUT NOS MONTRES ─────────────────────────────────────────────────────
    about: {
      keywords: ['nos montres', 'qui êtes', 'who are you', 'qui sommes', 'about you',
                 'votre boutique', 'your shop', 'à propos', 'company', 'société',
                 'bruxelles', 'brussels', 'belgique', 'belgium', 'qui vous',
                 'where are you', 'where are you based', 'where are you located',
                 'based in', 'you guys', 'your company', 'what do you do',
                 'what you do', 'your service', 'votre service',
                 'vous êtes qui', 'que faites', 'êtes-vous', 'faites vous',
                 'qui êtes-vous', 'vous faites quoi'],
      response: () => t(
        `**Nos Montres** est un service d'achat-vente de montres de luxe basé à Bruxelles 🇧🇪\n\n🎯 **Ce que nous faisons :**\n• Rachat au meilleur prix du marché\n• Expertise et authentification\n• Service discret sur rendez-vous\n• Paiement immédiat\n\n⌚ Nous traitons : Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n✅ Transparence totale — nous expliquons comment nous arrivons au prix proposé.\n\n→ [En savoir plus](/a-propos.html)`,
        `**Nos Montres** is a luxury watch buying and selling service based in Brussels 🇧🇪\n\n🎯 **What we do:**\n• Purchase at the best market price\n• Expert authentication\n• Discreet, appointment-only service\n• Immediate payment\n\n⌚ We handle: Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n✅ Full transparency — we explain exactly how we arrive at the price we offer.\n\n→ [Learn more about us](/a-propos.html)`
      )
    }

  };

  // ─── Worker price lookup ────────────────────────────────────────────────────
  // isPriceIntent: excludes "worth" alone (e.g. "is it worth buying" ≠ price query)
  // hasBrand: includes model names + popular refs so "submariner price", "nautilus price",
  // "5711 how much", "15500 price", "santos how much" all trigger the Worker
  function isPriceIntent(n) {
    return ['prix', 'price', 'combien', 'how much', 'valeur', 'value', 'vaut',
            'estimate', 'estimation', 'cote', 'coter',
            'cost', 'watch worth', 'montre vaut'].some(kw => kwMatch(n, kw));
  }

  function hasBrand(n) {
    return [
      'rolex', 'submariner', 'daytona', 'datejust', 'gmt master', 'gmt-master',
      '124060', '126500', '126610', '126710', '126334', '116500',
      'audemars', 'royal oak', 'offshore',
      '15500', '15202', '15400', '26331',
      'patek', 'nautilus', 'aquanaut', 'calatrava',
      '5711', '5167', '5726', '5980',
      'richard mille', 'cartier', 'ballon bleu', 'santos',
      'rm 011', 'rm 035', 'rm 055', 'rm011', 'rm035',
      // short tokens — word-boundary matched via kwMatch (≤4 chars)
      'ap', 'rm'
    ].some(b => kwMatch(n, b));
  }

  async function fetchWorkerPrice(query) {
    try {
      const res = await fetch(`${WORKER_URL}/?q=${encodeURIComponent(query)}`);
      const d = await res.json();
      if (d && d.lowPrice && d.highPrice) return d;
    } catch (_) {}
    return null;
  }

  // ─── Response engine ────────────────────────────────────────────────────────
  function matchKB(n) {
    for (const key in KB) {
      if (KB[key].keywords.some(kw => kwMatch(n, kw))) {
        return KB[key].response();
      }
    }
    return null;
  }

  function fallback() {
    return t(
      `Je ne suis pas sûr de comprendre. Voici ce que je peux faire :\n\n• 💰 **Estimer votre montre** — dites-moi la marque et le modèle\n• 🏷️ **Infos sur une marque** — Rolex, AP, Patek, RM, Cartier\n• 📋 **Vendre votre montre** — notre processus de rachat\n• 📅 **Prendre rendez-vous** — expertise en personne\n\nOu essayez notre [page Vendre](/vendre.html) pour une estimation instantanée !`,
      `I'm not sure I understand. Here's what I can help with:\n\n• 💰 **Estimate your watch** — tell me the brand and model\n• 🏷️ **Brand info** — Rolex, AP, Patek, RM, Cartier\n• 📋 **Sell your watch** — our buyback process\n• 📅 **Book an appointment** — in-person assessment\n\nOr try our [Sell page](/vendre.html) for an instant estimate!`
    );
  }

  async function getResponse(text) {
    const n = norm(text);

    // 1. Price intent + brand → live Worker price
    //    BOTH conditions required: "what is rolex" has brand but no price intent → KB, not Worker
    //    Investment intent overrides: "does rolex hold value" → investment KB, not Worker
    const isInvestmentIntent = ['hold value','holds value','worth buying',
                                'good investment','worth it','is worth buying'].some(p => n.includes(p));
    if (isPriceIntent(n) && hasBrand(n) && !isInvestmentIntent) {
      const data = await fetchWorkerPrice(text);
      if (data) {
        const lo = data.lowPrice.toLocaleString('fr-FR');
        const hi = data.highPrice.toLocaleString('fr-FR');
        const label = data.label || text;
        return t(
          `💰 **Estimation marché pour ${label} :**\n\nAnnonce la moins chère : **€${lo}**\nAnnonce la plus chère : **€${hi}**\n\n_Prix du marché secondaire, occasion avec papiers._\n\nPour une estimation ajustée selon l'état et les papiers de votre montre → [page Vendre](/vendre.html)`,
          `💰 **Market estimate for ${label}:**\n\nCheapest listing: **€${lo}**\nMost expensive listing: **€${hi}**\n\n_Secondary market prices, used with papers._\n\nFor an estimate adjusted for your watch's condition and papers → [Sell page](/vendre.html)`
        );
      }
    }

    // 2. KB keyword match (priority order guaranteed by object key order above)
    const kbResponse = matchKB(n);
    if (kbResponse) return kbResponse;

    // 3. Fallback
    return fallback();
  }

  // ─── Format markdown in bot messages ───────────────────────────────────────
  function formatMd(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // ─── CSS ────────────────────────────────────────────────────────────────────
  const css = `
    #nm-chat-btn {
      position: fixed; bottom: 28px; right: 24px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg, #A07936, #8a6528);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 24px rgba(160,121,54,0.5);
      transition: transform 0.2s, box-shadow 0.2s;
      -webkit-tap-highlight-color: transparent; touch-action: manipulation;
      font-size: 22px; line-height: 1;
    }
    #nm-chat-btn:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(160,121,54,0.65); }
    #nm-chat-badge {
      position: absolute; top: -3px; right: -3px;
      width: 18px; height: 18px; background: #C9A86A; border-radius: 50%;
      font-size: 11px; font-weight: 700; color: #1A1A1A;
      display: flex; align-items: center; justify-content: center;
    }
    #nm-chat-window {
      position: fixed; bottom: 100px; right: 24px; z-index: 9998;
      width: 365px; max-height: 590px;
      background: #141414; border-radius: 16px;
      border: 1px solid rgba(160,121,54,0.2);
      box-shadow: 0 12px 48px rgba(0,0,0,0.65);
      display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(18px) scale(0.97);
      pointer-events: none;
      transition: opacity 0.26s, transform 0.26s cubic-bezier(0.34,1.2,0.64,1);
    }
    #nm-chat-window.open {
      opacity: 1; transform: translateY(0) scale(1); pointer-events: all;
    }
    #nm-chat-header {
      display: flex; align-items: center; gap: 10px; padding: 14px 16px;
      background: linear-gradient(135deg, #1a1409 0%, #1e1b11 100%);
      border-bottom: 1px solid rgba(160,121,54,0.18); flex-shrink: 0;
    }
    #nm-chat-header-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #A07936, #C9A86A);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0;
    }
    #nm-chat-header-info { flex: 1; }
    #nm-chat-header-name {
      font-family: 'Jost','Inter',sans-serif; font-size: 13px;
      font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #C9A86A;
    }
    #nm-chat-header-status { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
    #nm-chat-close {
      background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.35);
      padding: 4px; border-radius: 6px; display: flex; transition: color 0.2s;
    }
    #nm-chat-close:hover { color: #C9A86A; }
    #nm-chat-messages {
      flex: 1; overflow-y: auto; padding: 16px 14px;
      display: flex; flex-direction: column; gap: 10px; scroll-behavior: smooth;
    }
    #nm-chat-messages::-webkit-scrollbar { width: 3px; }
    #nm-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #nm-chat-messages::-webkit-scrollbar-thumb { background: rgba(160,121,54,0.25); border-radius: 4px; }
    .nm-msg {
      max-width: 87%; padding: 10px 13px; border-radius: 12px;
      font-size: 13.5px; line-height: 1.6; font-family: 'Jost','Inter',sans-serif; word-break: break-word;
    }
    .nm-msg-bot {
      background: #1e1e1e; color: rgba(255,255,255,0.86);
      border-bottom-left-radius: 3px; align-self: flex-start;
      border: 1px solid rgba(160,121,54,0.12);
    }
    .nm-msg-bot p { margin: 0 0 6px; }
    .nm-msg-bot p:last-child { margin-bottom: 0; }
    .nm-msg-bot a { color: #C9A86A; text-decoration: none; }
    .nm-msg-bot a:hover { text-decoration: underline; }
    .nm-msg-bot strong { color: #C9A86A; font-weight: 600; }
    .nm-msg-bot em { color: rgba(255,255,255,0.55); font-style: italic; }
    .nm-msg-user {
      background: linear-gradient(135deg, #A07936, #7d5c22);
      color: #fff; border-bottom-right-radius: 3px; align-self: flex-end;
    }
    .nm-msg-typing { display: flex; align-items: center; gap: 5px; padding: 12px 14px; }
    .nm-dot { width: 6px; height: 6px; background: rgba(160,121,54,0.65); border-radius: 50%; animation: nm-bounce 1.2s infinite; }
    .nm-dot:nth-child(2) { animation-delay: 0.2s; }
    .nm-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes nm-bounce { 0%,60%,100% { transform:translateY(0); opacity:0.4; } 30% { transform:translateY(-5px); opacity:1; } }
    #nm-chat-quick {
      padding: 8px 12px 4px; display: flex; flex-wrap: wrap; gap: 5px; flex-shrink: 0;
      border-top: 1px solid rgba(160,121,54,0.1);
    }
    .nm-quick-btn {
      background: rgba(160,121,54,0.1); border: 1px solid rgba(160,121,54,0.28);
      border-radius: 20px; color: #C9A86A; font-size: 11.5px; font-family: 'Jost','Inter',sans-serif;
      padding: 5px 11px; cursor: pointer; transition: background 0.2s; white-space: nowrap;
    }
    .nm-quick-btn:hover { background: rgba(160,121,54,0.22); }
    #nm-chat-form {
      padding: 10px 12px 12px; display: flex; gap: 8px;
      border-top: 1px solid rgba(160,121,54,0.1); flex-shrink: 0;
    }
    #nm-chat-input {
      flex: 1; background: #1e1e1e; border: 1px solid rgba(160,121,54,0.18);
      border-radius: 10px; color: #fff; font-size: 16px; font-family: 'Jost','Inter',sans-serif;
      touch-action: manipulation;
      padding: 9px 13px; outline: none; resize: none; line-height: 1.4;
      max-height: 80px; transition: border-color 0.2s;
    }
    #nm-chat-input::placeholder { color: rgba(255,255,255,0.26); font-size: 13px; }
    #nm-chat-input:focus { border-color: rgba(160,121,54,0.48); }
    #nm-chat-send {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, #A07936, #8a6528);
      border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; align-self: flex-end; transition: opacity 0.2s, transform 0.15s;
    }
    #nm-chat-send:hover { opacity: 0.85; transform: scale(1.05); }
    @media (hover: none) and (pointer: coarse) {
      #nm-chat-window { transform: translateY(20px); transition: transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.22s; }
      #nm-chat-window.open { transform: translateY(0); }
    }
    @media (max-width: 480px) {
      #nm-chat-window { right: 10px; bottom: 90px; width: calc(100vw - 20px); }
      #nm-chat-btn { bottom: 20px; right: 16px; }
    }
    /* Attention bubble */
    #nm-chat-bubble {
      position: fixed; bottom: 100px; right: 14px; z-index: 9997;
      background: linear-gradient(135deg, #A07936, #8a6528);
      color: #fff; padding: 9px 15px; border-radius: 16px 16px 4px 16px;
      font-size: 13px; font-weight: 600; line-height: 1.3;
      font-family: 'Jost','Inter',sans-serif;
      box-shadow: 0 4px 22px rgba(160,121,54,0.55);
      white-space: nowrap; cursor: pointer;
      animation: nm-bubble-in 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards;
      -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    }
    #nm-chat-bubble::after {
      content: ''; position: absolute; bottom: -7px; right: 18px;
      width: 0; height: 0;
      border-left: 7px solid transparent; border-right: 4px solid transparent;
      border-top: 8px solid #A07936;
    }
    @keyframes nm-bubble-in { from { opacity:0; transform:translateY(14px) scale(0.9); } to { opacity:1; transform:translateY(0) scale(1); } }
    .nm-bubble-out { animation: nm-bubble-out 0.25s ease forwards !important; }
    @keyframes nm-bubble-out { to { opacity:0; transform:translateY(8px) scale(0.92); } }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ─── Build DOM ───────────────────────────────────────────────────────────────
  const qFr = [
    { q: 'estimation valeur montre',        label: '💰 Estimer' },
    { q: 'comment vendre ma montre rachat', label: '📦 Vendre' },
    { q: 'rolex watches',                   label: '⌚ Rolex' },
    { q: 'audemars piguet royal oak',       label: '🏆 AP' },
    { q: 'patek philippe nautilus',         label: '💎 Patek' },
    { q: 'meilleure montre investissement', label: '📈 Investir' }
  ];
  const qEn = [
    { q: 'estimate my watch value',         label: '💰 Estimate' },
    { q: 'sell my watch buyback',           label: '📦 Sell' },
    { q: 'rolex watches',                   label: '⌚ Rolex' },
    { q: 'audemars piguet royal oak',       label: '🏆 AP' },
    { q: 'patek philippe nautilus',         label: '💎 Patek' },
    { q: 'best watch investment',           label: '📈 Invest' }
  ];

  function buildQuickBtns() {
    const qs = lang() === 'en' ? qEn : qFr;
    return qs.map(b => `<button class="nm-quick-btn" data-q="${b.q}">${b.label}</button>`).join('');
  }

  document.body.insertAdjacentHTML('beforeend', `
    <button id="nm-chat-btn" aria-label="Chat Nos Montres">
      <span id="nm-chat-badge" style="display:none">1</span>
      ⌚
    </button>
    <div id="nm-chat-window" role="dialog" aria-label="Nos Montres Chat">
      <div id="nm-chat-header">
        <div id="nm-chat-header-avatar">⌚</div>
        <div id="nm-chat-header-info">
          <div id="nm-chat-header-name">Nos Montres</div>
          <div id="nm-chat-header-status">Expert · Estimation instantanée</div>
        </div>
        <button id="nm-chat-close" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div id="nm-chat-messages"></div>
      <div id="nm-chat-quick">${buildQuickBtns()}</div>
      <form id="nm-chat-form" autocomplete="off">
        <textarea id="nm-chat-input" placeholder="${lang() === 'en' ? 'E.g. value of my Rolex Submariner…' : 'Ex: valeur de ma Rolex Submariner…'}" rows="1"></textarea>
        <button type="submit" id="nm-chat-send" aria-label="Send">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  `);

  // ─── Elements ────────────────────────────────────────────────────────────────
  const btn      = document.getElementById('nm-chat-btn');
  const win      = document.getElementById('nm-chat-window');
  const closeBtn = document.getElementById('nm-chat-close');
  const messages = document.getElementById('nm-chat-messages');
  const form     = document.getElementById('nm-chat-form');
  const input    = document.getElementById('nm-chat-input');
  let isOpen = false, greeted = false;

  function refreshQuickBtns() {
    const q = document.getElementById('nm-chat-quick');
    if (q) q.innerHTML = buildQuickBtns();
    bindQuickBtns();
  }

  function bindQuickBtns() {
    document.querySelectorAll('.nm-quick-btn').forEach(b => {
      b.addEventListener('click', () => sendMessage(b.dataset.q));
    });
  }
  bindQuickBtns();

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function addMsg(html, role) {
    const el = document.createElement('div');
    el.className = 'nm-msg ' + (role === 'user' ? 'nm-msg-user' : 'nm-msg-bot');
    if (role === 'user') {
      el.textContent = html;
    } else {
      el.innerHTML = '<p>' + formatMd(html) + '</p>';
    }
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'nm-msg nm-msg-bot nm-msg-typing';
    el.id = 'nm-typing';
    el.innerHTML = '<div class="nm-dot"></div><div class="nm-dot"></div><div class="nm-dot"></div>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('nm-typing');
    if (t) t.remove();
  }

  function toggleQuick(show) {
    const q = document.getElementById('nm-chat-quick');
    if (q) q.style.display = show ? 'flex' : 'none';
  }

  // ─── Send ─────────────────────────────────────────────────────────────────
  function sendMessage(text) {
    text = text.trim();
    if (!text) return;
    toggleQuick(false);
    addMsg(text, 'user');
    input.value = '';
    input.style.height = 'auto';
    showTyping();
    getResponse(text).then(resp => {
      removeTyping();
      addMsg(resp, 'bot');
    });
  }

  // ─── Open / Close ─────────────────────────────────────────────────────────
  const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  let _lockedY = 0;
  function lockScroll()   { _lockedY = window.scrollY; document.body.style.cssText += ';position:fixed;top:-'+_lockedY+'px;width:100%;overflow-y:scroll'; }
  function unlockScroll() { document.body.style.position=''; document.body.style.top=''; document.body.style.width=''; document.body.style.overflowY=''; window.scrollTo(0,_lockedY); }

  function openChat() {
    isOpen = true;
    dismissBubble();
    win.classList.add('open');
    document.getElementById('nm-chat-badge').style.display = 'none';
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
    </svg>`;
    if (!greeted) {
      greeted = true;
      refreshQuickBtns();
      setTimeout(() => {
        addMsg(
          lang() === 'en'
            ? "Hello! 👋 I'm the Nos Montres assistant.\n\nI can give you live market prices for any luxury watch, explain how to sell yours, or answer any question about Rolex, Audemars Piguet, Patek Philippe, Richard Mille or Cartier.\n\nWhat can I help you with?"
            : "Bonjour ! 👋 Je suis l'assistant Nos Montres.\n\nJe peux vous donner les prix du marché en temps réel pour n'importe quelle montre de luxe, vous expliquer comment vendre la vôtre, ou répondre à toute question sur Rolex, Audemars Piguet, Patek Philippe, Richard Mille ou Cartier.\n\nComment puis-je vous aider ?",
          'bot'
        );
        toggleQuick(true);
      }, 300);
    }
    if (isTouch) { lockScroll(); } else { input.focus(); }
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    btn.innerHTML = `<span id="nm-chat-badge" style="display:none">1</span>⌚`;
    if (isTouch) unlockScroll();
  }

  // ─── Events ────────────────────────────────────────────────────────────────
  btn.addEventListener('click',  () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  form.addEventListener('submit', e => { e.preventDefault(); sendMessage(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; });

  // ─── Attention bubble ──────────────────────────────────────────────────────
  function dismissBubble() {
    const b = document.getElementById('nm-chat-bubble');
    if (!b) return;
    b.classList.add('nm-bubble-out');
    setTimeout(() => b && b.parentNode && b.parentNode.removeChild(b), 260);
  }

  const bubble = document.createElement('div');
  bubble.id = 'nm-chat-bubble';
  bubble.textContent = lang() === 'en' ? 'Estimate your watch live 💰' : 'Estimez votre montre en direct 💰';
  bubble.setAttribute('role', 'button');
  bubble.setAttribute('aria-label', 'Ouvrir le chat');
  document.body.appendChild(bubble);
  bubble.addEventListener('click', () => { dismissBubble(); openChat(); });
  const bubbleTimer = setTimeout(() => dismissBubble(), 9000);
  bubble.addEventListener('click', () => clearTimeout(bubbleTimer));

})();
