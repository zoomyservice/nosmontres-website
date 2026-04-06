(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  // ─── Language helper ─────────────────────────────────────────────────────────
  // Checks NM.lang first, then localStorage fallback — fixes timing issue where
  // NM.init() hasn't run yet when the chatbot IIFE executes.
  function lang() {
    if (window.NM && window.NM.lang) return window.NM.lang;
    return localStorage.getItem('nm_lang') || 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  // ─── BUSINESS FACTS ──────────────────────────────────────────────────────────
  const BIZ = {
    addr:    '46 rue de Miromesnil, 75008 Paris',
    phone1:  '01 81 80 08 47',
    phone2:  '06 22 80 70 14',
    email:   'contact.nosmontres@gmail.com',
    hours:   '7j/7 sur rendez-vous',
    hoursEn: '7 days / week, by appointment',
    years:   '15+',
  };

  // ─── Keyword matching ────────────────────────────────────────────────────────
  function norm(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function kwMatch(n, kw) {
    const nkw = norm(kw);
    if (nkw.length <= 4) {
      const re = new RegExp('(?:^|\\s)' + nkw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)');
      return re.test(n);
    }
    return n.includes(nkw);
  }

  // ─── Knowledge Base ──────────────────────────────────────────────────────────
  // Priority: sell/services/investment/authenticity/condition → specific models → generic brands → pricing → contact → about
  const KB = {

    // ── GREETING ────────────────────────────────────────────────────────────────
    greeting: {
      keywords: ['bonjour','bonsoir','salut','allo','hello','hey','hola','coucou',
                 'good morning','good evening','good afternoon','hi','yo'],
      response: () => t(
        `Bonjour ! 👋 Je suis l'assistant **Nos Montres**.\n\nJe peux vous aider avec :\n• 💰 Estimation en temps réel de votre montre (Rolex, AP, Patek, RM, Cartier)\n• 📋 Vendre votre montre — rachat immédiat, meilleur prix\n• 🔧 Révision & réparation Rolex / Audemars Piguet\n• 🏷️ Tout savoir sur nos marques et modèles\n• 📅 Prendre rendez-vous — ${BIZ.addr}\n\nQue puis-je faire pour vous ?`,
        `Hello! 👋 I'm the **Nos Montres** assistant.\n\nI can help you with:\n• 💰 Live market estimates (Rolex, AP, Patek, RM, Cartier)\n• 📋 Sell your watch — immediate buyback at the best price\n• 🔧 Rolex / Audemars Piguet service & repair\n• 🏷️ Everything about our brands and models\n• 📅 Book an appointment — ${BIZ.addr}\n\nHow can I help you?`
      )
    },

    // ── SELL / BUYBACK ───────────────────────────────────────────────────────────
    sell: {
      keywords: ['vendre','sell','céder','revendre','racheter','rachat','buyback',
                 'buy my','buy back','je veux vendre','how to sell','comment vendre',
                 'offre de rachat','get an offer','will you buy','can you buy',
                 'vous achetez','vous rachetez','achetez ma','will you pay',
                 'how much will you','pay me for','offer for my','offre pour',
                 'selling my watch','selling my','je revends','can you make an offer',
                 'make me an offer','do you buy','do you purchase','reprise'],
      response: () => t(
        `Nous rachetons les montres de luxe au **meilleur prix du marché** ! 🎯\n\n**Notre processus :**\n1. Estimez votre montre gratuitement → [Page Vendre](/vendre.html)\n2. Offre ferme sous 24h\n3. Rendez-vous en boutique — **${BIZ.addr}**\n4. **Paiement immédiat** par virement bancaire sécurisé — aucune commission\n\n✅ Nous achetons : Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n\n👉 [Obtenir mon estimation gratuite](/vendre.html)`,
        `We buy luxury watches at the **best market price**! 🎯\n\n**Our process:**\n1. Free online estimate → [Sell page](/vendre.html)\n2. Firm offer within 24h\n3. Appointment at **${BIZ.addr}**\n4. **Immediate payment** by secure bank transfer — zero commission\n\n✅ We buy: Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier.\n\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n\n👉 [Get my free estimate](/vendre.html)`
      )
    },

    // ── SERVICES: REVISION / REPAIR / BATTERY ────────────────────────────────────
    services: {
      keywords: ['révision','revision','service watch','repair','réparation','entretien',
                 'maintenance','réviser','réparer','nettoyer','nettoyage','cleaning',
                 'overhaul','battery','pile','changement de pile','battery replacement',
                 'battery change','waterproof','étanchéité','mouvement','movement repair',
                 'service rolex','service ap','service audemars','révision rolex',
                 'révision ap','reparation rolex','révision montre','watchmaker','horloger'],
      response: () => t(
        `**Services horlogerie — Nos Montres, ${BIZ.addr} :**\n\n🔧 **Révision Rolex** — Démontage complet, ultrasons, pièces d'origine, lubrification, tests (timegrapher + étanchéité) → [Révision Rolex](/revision-Rolex-Paris.html)\n\n🔧 **Révision Audemars Piguet** — Même protocole expert pour AP → [Révision AP](/revision-Audemars-Piguet-Paris.html)\n\n🔩 **Réparation Rolex** — Couronne, glace, bracelet, cadran → [Réparation Rolex](/reparation-Rolex-Paris.html)\n\n🔋 **Changement de pile** — Service rapide, toutes marques → [Changement pile](/changement-de-pile-de-montre.html)\n\n🕐 **${BIZ.hours}** · 📞 **${BIZ.phone1}**\n\n👉 [Prendre rendez-vous](/prendre-rendez-vous.html)`,
        `**Watch services — Nos Montres, ${BIZ.addr}:**\n\n🔧 **Rolex service** — Full disassembly, ultrasonic cleaning, original parts, lubrication, tests (timegrapher + water resistance) → [Rolex Service](/revision-Rolex-Paris.html)\n\n🔧 **Audemars Piguet service** — Same expert protocol for AP → [AP Service](/revision-Audemars-Piguet-Paris.html)\n\n🔩 **Rolex repair** — Crown, crystal, bracelet, dial → [Repair](/reparation-Rolex-Paris.html)\n\n🔋 **Battery replacement** — Fast service, all brands → [Battery change](/changement-de-pile-de-montre.html)\n\n🕐 **${BIZ.hoursEn}** · 📞 **${BIZ.phone1}**\n\n👉 [Book an appointment](/prendre-rendez-vous.html)`
      )
    },

    // ── INVESTMENT ───────────────────────────────────────────────────────────────
    investment: {
      keywords: ['invest','investment','investir','investissement','appreciation',
                 'plus-value','best watch','meilleure montre','quelle montre',
                 'store of value','placement','buy watch','acheter montre',
                 'appreciates','appreciate','watches appreciate','portfolio',
                 'return on investment','is a watch a good','should i buy',
                 'which watch to buy','which watch should','watch is best',
                 'which watch is','valeur augmente','prendre de la valeur',
                 'montre qui prend','watches vs','best luxury','watch to buy',
                 'luxury watch to','holds value','hold value','good investment',
                 'holds its value','worth buying','worth it','is worth buying','worth the price'],
      response: () => t(
        `**Montres comme investissement — avis d'expert Gary :**\n\n🏆 **Top placements (marché secondaire 2024–2025) :**\n1. **Patek Philippe Nautilus 5711/1A** — Retail €28.9k → secondaire €76k–€148k (5–10×)\n2. **Rolex Daytona 116500LN** — Liste d'attente 5–10 ans, ~€14k–€21k\n3. **AP Royal Oak 15202ST "Jumbo"** — Discontinué, ~€85k–€150k\n4. **AP Royal Oak 15500ST** — Icône moderne, ~€38k–€55k\n5. **Richard Mille RM 011/027/035** — Éditions limitées, très liquides\n\n📊 **Ce qui crée de la valeur :** édition limitée ou discontinuée · papiers + boîte d'origine · état neuf/pristine · forte demande\n\n⚠️ Toutes les montres ne s'apprécient pas — consulter Gary pour un conseil personnalisé.\n\n📞 ${BIZ.phone1} · [Prendre rendez-vous](/prendre-rendez-vous.html)`,
        `**Watches as investments — Gary's expert view:**\n\n🏆 **Top picks (secondary market 2024–2025):**\n1. **Patek Philippe Nautilus 5711/1A** — Retail €28.9k → secondary €76k–€148k (5–10×)\n2. **Rolex Daytona 116500LN** — 5–10 year waitlist at AD, ~€14k–€21k\n3. **AP Royal Oak 15202ST "Jumbo"** — Discontinued, ~€85k–€150k\n4. **AP Royal Oak 15500ST** — Modern icon, ~€38k–€55k\n5. **Richard Mille RM 011/027/035** — Limited editions, highly liquid\n\n📊 **What drives value:** limited/discontinued edition · original papers + box · new/pristine condition · high demand vs low supply\n\n⚠️ Not all watches appreciate — ask Gary for personalised advice.\n\n📞 ${BIZ.phone1} · [Book an appointment](/prendre-rendez-vous.html)`
      )
    },

    // ── AUTHENTICITY ─────────────────────────────────────────────────────────────
    authenticity: {
      keywords: ['authentic','authentique','fake','faux','counterfeit','contrefaçon',
                 'genuine','verify','vérifier','légit','legit','copie',
                 'real watch','is it real','is this real','est vraie','est fausse',
                 'is it fake','spot a fake','how to spot','tell if real',
                 'comment savoir','is my watch real','réelle','fausse','vraie','trust','real'],
      response: () => t(
        `**Vérifier l'authenticité d'une montre de luxe :**\n\n🔍 **Points clés :**\n• **Numéro de série** — gravé entre les cornes (Rolex) ou au fond de boîte (AP, Patek), unique à chaque pièce\n• **Mouvement** — rotor silencieux, balancier précis, aucune vibration parasite\n• **Cadran** — typographie parfaite, relief des index, luminova appliqué avec soin\n• **Couronne & fond** — résistance caractéristique, filetage précis\n• **Poids** — une vraie montre est sensiblement plus lourde qu'un faux\n• **Papiers d'origine** — boîte, carte de garantie, facture AD\n\n⚠️ En cas de doute, faites expertiser avant tout achat ou vente.\n✅ **Nos Montres authentifie 100% des pièces** avant toute transaction.\n\n📍 ${BIZ.addr} · 📞 ${BIZ.phone1}`,
        `**How to verify a luxury watch's authenticity:**\n\n🔍 **Key points:**\n• **Serial number** — engraved between the lugs (Rolex) or on caseback (AP, Patek), unique to each piece\n• **Movement** — silent rotor, precise balance wheel, no parasitic vibration\n• **Dial** — perfect typography, applied index relief, carefully applied lume\n• **Crown & caseback** — characteristic resistance, precise threading\n• **Weight** — a genuine watch is noticeably heavier than a fake\n• **Original papers** — box, warranty card, AD receipt\n\n⚠️ When in doubt, get it authenticated before any purchase or sale.\n✅ **Nos Montres authenticates 100% of pieces** before any transaction.\n\n📍 ${BIZ.addr} · 📞 ${BIZ.phone1}`
      )
    },

    // ── CONDITION / PAPERS ───────────────────────────────────────────────────────
    condition: {
      keywords: ['condition','état','papers','papiers','boite','boîte','box',
                 'sans papiers','without papers','avec papiers','with papers',
                 'unworn','neuve','mint','scratches','rayures',
                 'does condition matter','does box matter','no papers',
                 'used watch','occasion watch','pre-owned','pre owned',
                 'wear marks','polished','service history','full set',
                 'original papers','original box','original receipt'],
      response: () => t(
        `**État et papiers — leur impact sur la valeur :**\n\n✨ **Neuve / Jamais portée :** +12–15% sur le prix de base\n📄 **Full set (papiers + boîte + bracelet d'origine) :** valeur maximale, +8–15% vs sans papiers\n📦 **Sans papiers :** −7–8%\n🔧 **Rayures légères :** impact minime\n⚠️ **Polissage non-original :** réduit la valeur (AP et RM surtout) — évitez absolument de polir\n🔩 **Vis Torx AP manquantes / bracelet remplacé :** impact négatif significatif\n\n💡 Notre [page Vendre](/vendre.html) calcule automatiquement le prix selon l'état et les papiers.`,
        `**Condition and papers — impact on value:**\n\n✨ **New / Unworn:** +12–15% on base price\n📄 **Full set (papers + box + original bracelet):** maximum value, +8–15% vs no papers\n📦 **Without papers:** −7–8%\n🔧 **Light scratches:** minimal impact\n⚠️ **Non-original polishing:** reduces value (especially AP and RM) — never polish\n🔩 **Missing AP Torx screws / replaced bracelet:** significant negative impact\n\n💡 Our [Sell page](/vendre.html) automatically calculates price based on condition and papers.`
      )
    },

    // ════════════════════════════════════════════════════════════════════════════
    // ROLEX — specific models first, then generic
    // ════════════════════════════════════════════════════════════════════════════

    submariner: {
      keywords: ['submariner','124060','126610','126610ln','126610lv','kermit',
                 'hulk sub','no-date sub','no date sub','sub 41',
                 'what is submariner','tell me about submariner','about submariner',
                 'submariner history','submariner design'],
      response: () => t(
        `**Rolex Submariner** — la montre de plongée la plus iconique au monde. 🤿\n\n**Références actuelles (2020+) :**\n• **124060** — Sans date, 41mm, lunette céramique noire, Cal. 3230 · ~€11k–€15k\n• **126610LN** — Avec date, lunette noire "LN" (lunette noire), Cal. 3235 · ~€12.5k–€17k\n• **126610LV** — Avec date, lunette verte "Kermit", Cal. 3235 · ~€14k–€20k\n\n**Caractéristiques :** 41mm Oystersteel, étanche 300m, glace saphir, bracelet Oyster ou Jubilé.\n\n**Avant 2020 (très prisées) :**\n• 114060 (no-date 40mm) · 116610LN (date 40mm) · 116610LV (Kermit 40mm)\n\n📈 Parmi les Rolex les plus liquides — revente rapide, valeur stable.\n\n💡 Dites-moi votre référence exacte pour une estimation en direct !`,
        `**Rolex Submariner** — the world's most iconic dive watch. 🤿\n\n**Current references (2020+):**\n• **124060** — No-date, 41mm, black ceramic bezel, Cal. 3230 · ~€11k–€15k\n• **126610LN** — Date, black bezel, Cal. 3235 · ~€12.5k–€17k\n• **126610LV** — Date, green "Kermit" bezel, Cal. 3235 · ~€14k–€20k\n\n**Specs:** 41mm Oystersteel, 300m water resistance, sapphire crystal, Oyster or Jubilee bracelet.\n\n**Pre-2020 (highly sought):**\n• 114060 (no-date 40mm) · 116610LN (date 40mm) · 116610LV (Kermit 40mm)\n\n📈 Among the most liquid Rolex — fast resale and stable value.\n\n💡 Tell me your exact reference for a live estimate!`
      )
    },

    daytona: {
      keywords: ['daytona','116500','116500ln','126500','126500ln','cosmograph',
                 'panda rolex','paul newman','what is daytona','tell me about daytona',
                 'about daytona','daytona chronograph'],
      response: () => t(
        `**Rolex Daytona** — le chronographe de légende, le plus difficile à obtenir. 🏎️\n\n**Références :**\n• **116500LN** — Acier, lunette céramique, cadran noir ou blanc "Panda" · ~€14k–€21k\n• **126500LN** — Nouvelle génération (2023), Cal. 4131, boîtier 40mm · ~€18k–€28k\n• **116503** — Rolesor (acier + or jaune) · ~€15k–€22k\n• **116519LN** — Or blanc · ~€35k–€55k\n\n**Pourquoi la Daytona est unique :**\n• Liste d'attente revendeur agréé : **5 à 10 ans**\n• Demande mondiale >>> offre\n• Premier chronographe Rolex en production continue depuis 1963\n• Cadran "Panda" (blanc + sous-cadrans noirs) = version la plus recherchée\n• Nommée d'après les 24h de Daytona\n\n📈 La Daytona acier est l'une des montres les plus difficiles à obtenir au monde.\n\n💡 Vous avez une Daytona ? [Estimez-la ici](/vendre.html)`,
        `**Rolex Daytona** — the legendary chronograph, the hardest to obtain. 🏎️\n\n**References:**\n• **116500LN** — Steel, ceramic bezel, black or white "Panda" dial · ~€14k–€21k\n• **126500LN** — New generation (2023), Cal. 4131, 40mm case · ~€18k–€28k\n• **116503** — Rolesor (steel + yellow gold) · ~€15k–€22k\n• **116519LN** — White gold · ~€35k–€55k\n\n**Why the Daytona is unique:**\n• Waitlist at authorised dealer: **5 to 10 years**\n• Global demand far exceeds supply\n• Rolex's chronograph in continuous production since 1963\n• "Panda" dial (white + black subdials) = most sought-after variant\n• Named after the Daytona 24 Hours race\n\n📈 The steel Daytona is one of the hardest watches to obtain anywhere in the world.\n\n💡 Got a Daytona? [Estimate it here](/vendre.html)`
      )
    },

    gmt: {
      keywords: ['gmt master','gmt-master','gmt master ii','pepsi rolex','batman rolex',
                 'root beer','rootbeer','126710','126711','126715',
                 'blnr','blro','chnr','deux fuseaux','two timezone',
                 'what is the gmt','tell me about gmt','about gmt','gmt watch'],
      response: () => t(
        `**Rolex GMT-Master II** — la montre des pilotes et grands voyageurs. ✈️\n\n**Surnoms & références :**\n• **"Pepsi" 126710BLRO** — Lunette céramique rouge/bleue · ~€16k–€24k\n• **"Batman" 126710BLNR** — Lunette céramique noire/bleue · ~€13k–€18.5k\n• **"Root Beer" 126711CHNR** — Bicolore Everose/acier, brun/noir · ~€20k–€32k\n• **"Root Beer" 126715CHNR** — Or Everose intégral · ~€35k–€55k\n• **"Sprite" 126720VTNR** — Lunette verte/noire, gaucher · ~€15k–€22k\n\n**Fonctionnalité :** affichage simultané de **3 fuseaux horaires**, aiguille GMT 24h, lunette bidirectionnelle. Calibre 3285.\n\n📈 Le "Pepsi" et le "Root Beer" sont les variantes les plus rares et les plus prisées.\n\n💡 Donnez-moi votre référence exacte pour une estimation !`,
        `**Rolex GMT-Master II** — the pilots' and travellers' watch. ✈️\n\n**Nicknames & references:**\n• **"Pepsi" 126710BLRO** — Red/blue ceramic bezel · ~€16k–€24k\n• **"Batman" 126710BLNR** — Black/blue ceramic bezel · ~€13k–€18.5k\n• **"Root Beer" 126711CHNR** — Two-tone Everose/steel, brown/black · ~€20k–€32k\n• **"Root Beer" 126715CHNR** — Full Everose gold · ~€35k–€55k\n• **"Sprite" 126720VTNR** — Green/black bezel, left-handed · ~€15k–€22k\n\n**Function:** simultaneous display of **3 time zones**, 24h GMT hand, bidirectional bezel. Calibre 3285.\n\n📈 The "Pepsi" and "Root Beer" are the rarest and most sought-after variants.\n\n💡 Tell me your exact reference for an estimate!`
      )
    },

    datejust: {
      keywords: ['datejust','date just','126300','126334','126331','126233',
                 'fluted bezel','jubilee bracelet','what is datejust','tell me about datejust'],
      response: () => t(
        `**Rolex Datejust** — l'élégance intemporelle depuis 1945. ⌚\n\n**Références 41mm actuelles :**\n• **126300** — Acier, lunette lisse · ~€8k–€11k\n• **126334** — Acier / or blanc, lunette cannelée · ~€10k–€14k\n• **126331** — Rolesor (acier + or jaune), lunette cannelée · ~€11k–€15k\n\n**Références 36mm :**\n• **126200** — Acier · ~€7k–€10k\n• **126233** — Rolesor · ~€9k–€13k\n\n**Points clés :**\n• Première montre à date au guichet (1945)\n• Bracelet Oyster ou Jubilé (Jubilé est l'original)\n• Cadran "Wimbledon" (multi-couleurs) très recherché\n\n💡 Donnez-moi votre référence exacte pour une estimation précise !`,
        `**Rolex Datejust** — timeless elegance since 1945. ⌚\n\n**Current 41mm references:**\n• **126300** — Steel, smooth bezel · ~€8k–€11k\n• **126334** — Steel / white gold, fluted bezel · ~€10k–€14k\n• **126331** — Rolesor (steel + yellow gold), fluted bezel · ~€11k–€15k\n\n**36mm references:**\n• **126200** — Steel · ~€7k–€10k\n• **126233** — Rolesor · ~€9k–€13k\n\n**Key facts:**\n• First watch with a date window (1945)\n• Oyster or Jubilee bracelet (Jubilee is the original)\n• "Wimbledon" dial (multicolour) is highly sought-after\n\n💡 Tell me your exact reference for an accurate estimate!`
      )
    },

    rolex: {
      keywords: ['rolex','sky-dweller','milgauss','yacht-master','oyster perpetual',
                 'explorer','day-date','air-king','sea-dweller','deepsea',
                 'tell me about rolex','about rolex','rolex brand','rolex watches',
                 'rolex history','rolex reputation','rolex popular','best rolex',
                 'what is rolex','rolex overview'],
      response: () => t(
        `**Rolex** — la référence absolue de l'horlogerie de luxe. 👑\n\n**Modèles emblématiques :**\n• **Submariner** — Plongée iconique, 124060 / 126610 · ~€11k–€20k\n• **Daytona** — Chronographe légendaire, 116500LN · ~€14k–€21k\n• **GMT-Master II** — Voyageur, "Pepsi" / "Batman" · ~€13k–€24k\n• **Datejust** — Élégance classique · ~€8k–€15k\n• **Sky-Dweller** — Complication annuelle · ~€18k–€28k\n• **Day-Date** — "La présidentielle", or uniquement · ~€32k–€65k\n• **Explorer II** — Spéléologues et explorateurs · ~€9k–€14k\n\n🏭 Fondée à Genève en 1905 par Hans Wilsdorf. Calibres maison depuis les années 1950. Acier chirurgical propriétaire "Oystersteel".\n\n📈 Rolex est la montre qui conserve le mieux sa valeur sur le marché secondaire.\n\n💡 Donnez-moi une référence pour une estimation en direct !`,
        `**Rolex** — the absolute benchmark of luxury watchmaking. 👑\n\n**Iconic models:**\n• **Submariner** — Iconic diver, 124060 / 126610 · ~€11k–€20k\n• **Daytona** — Legendary chronograph, 116500LN · ~€14k–€21k\n• **GMT-Master II** — Traveller, "Pepsi" / "Batman" · ~€13k–€24k\n• **Datejust** — Classic elegance · ~€8k–€15k\n• **Sky-Dweller** — Annual complication · ~€18k–€28k\n• **Day-Date** — "The Presidential", gold only · ~€32k–€65k\n• **Explorer II** — Spelunkers and explorers · ~€9k–€14k\n\n🏭 Founded in Geneva in 1905 by Hans Wilsdorf. In-house calibres since the 1950s. Proprietary surgical steel "Oystersteel".\n\n📈 Rolex is the watch that best holds its value on the secondary market.\n\n💡 Tell me a reference for a live estimate!`
      )
    },

    // ════════════════════════════════════════════════════════════════════════════
    // AUDEMARS PIGUET — specific models first
    // ════════════════════════════════════════════════════════════════════════════

    royal_oak: {
      keywords: ['royal oak','15500','15500st','15202','15202st','15400','15400st',
                 'jumbo royal oak','jumbo ap','ultrathin ap','39mm ap','royal oak 41',
                 'what is royal oak','tell me about royal oak','about royal oak',
                 'royal oak history','royal oak design','gerald genta','gérald genta',
                 '8 vis','8 screws','tapisserie'],
      response: () => t(
        `**Audemars Piguet Royal Oak** — l'acier qui a révolutionné l'horlogerie. 👑\n\n**Références clés :**\n• **15500ST** — Royal Oak 41mm, cadran bleu ou gris, Cal. 4302 · ~€38k–€55k\n• **15202ST "Jumbo"** — 39mm ultrafin, la version originale 1972, **DISCONTINUÉE** · ~€85k–€150k\n• **15400ST** — Génération précédente 41mm · ~€26k–€42k\n\n**L'histoire :**\nDessinée en 1972 par **Gérald Genta** en seulement 24h (selon la légende). La Royal Oak brise tous les codes : acier chirurgical poli-brossé, lunette octogonale à **8 vis hexagonales**, cadran "tapisserie" — une montre sport en acier vendue **plus cher que les montres or** de l'époque.\n\n📈 La 15202 "Jumbo" (discontinuée) est désormais l'AP la plus recherchée sur le secondaire.\n\n💡 Donnez-moi votre référence pour une estimation en direct !`,
        `**Audemars Piguet Royal Oak** — the steel that revolutionised watchmaking. 👑\n\n**Key references:**\n• **15500ST** — Royal Oak 41mm, blue or grey dial, Cal. 4302 · ~€38k–€55k\n• **15202ST "Jumbo"** — 39mm ultra-thin, the original 1972 version, **DISCONTINUED** · ~€85k–€150k\n• **15400ST** — Previous generation 41mm · ~€26k–€42k\n\n**The story:**\nDesigned in 1972 by **Gérald Genta** in just 24 hours (legend has it). The Royal Oak broke every rule: polished-brushed steel, octagonal bezel with **8 hexagonal screws**, "tapisserie" dial — a steel sports watch **priced higher than gold watches** of its time.\n\n📈 The 15202 "Jumbo" (discontinued) is now the most sought-after AP on the secondary market.\n\n💡 Tell me your reference for a live estimate!`
      )
    },

    offshore: {
      keywords: ['offshore','royal oak offshore','26331','26470','offshore chronograph',
                 'offshore diver','what is offshore','tell me about offshore','ap offshore'],
      response: () => t(
        `**Audemars Piguet Royal Oak Offshore** — la Royal Oak en version extrême. 🏋️\n\n**Caractéristiques :**\n• Boîtier plus grand (42–44mm), plus robuste que la Royal Oak\n• Couronne vissée protégée par un garde-couronne\n• Versions chronographe, plongée, tourbillon\n\n**Références populaires :**\n• **26331ST** — Offshore Chronograph 44mm acier · ~€22k–€38k\n• **26470ST** — Offshore 42mm sans chrono · ~€18k–€28k\n• **26405CE** — Offshore Diver céramique · ~€25k–€40k\n\n📈 L'Offshore est très liquide sur le secondaire — surtout les éditions limitées et versions titane.\n\n💡 Donnez-moi votre référence pour une estimation !`,
        `**Audemars Piguet Royal Oak Offshore** — the Royal Oak taken to the extreme. 🏋️\n\n**Features:**\n• Larger case (42–44mm), more robust than the Royal Oak\n• Protected screwed crown with crown guard\n• Chronograph, diver, and tourbillon variants\n\n**Popular references:**\n• **26331ST** — Offshore Chronograph 44mm steel · ~€22k–€38k\n• **26470ST** — Offshore 42mm without chrono · ~€18k–€28k\n• **26405CE** — Offshore Diver ceramic · ~€25k–€40k\n\n📈 The Offshore is very liquid on the secondary market — especially limited editions and titanium versions.\n\n💡 Tell me your reference for an estimate!`
      )
    },

    ap: {
      keywords: ['audemars','piguet','code 11.59','millenary','jules audemars',
                 'what is ap','ap watch','tell me about ap','about audemars',
                 'audemars history','audemars brand','ap brand','why is ap',
                 'is audemars','audemars piguet'],
      response: () => t(
        `**Audemars Piguet** — fondée en 1875 au Brassus, Vallée de Joux 🇨🇭\n\n**Collections :**\n• **Royal Oak** (1972) — Sport acier iconique · €38k–€150k\n• **Royal Oak Offshore** — Version extrême 42–44mm · ~€18k–€38k\n• **Code 11.59** — Contemporain, rond, 41mm · ~€22k–€45k\n• **Millenary** — Cadran décalé, forme ovale · ~€18k–€35k\n\n🏭 Fabrique ses propres calibres depuis 1875. ~40 000 montres produites par an au Brassus.\n\n**À savoir :** AP ne vend que via ses boutiques officielles — pas de réseau multi-marques. Les demandes peuvent prendre des années. La Royal Oak Jumbo (15202) est désormais pratiquement introuvable chez les AD.\n\n💡 Donnez-moi votre modèle pour une estimation !`,
        `**Audemars Piguet** — founded in 1875 in Le Brassus, Vallée de Joux 🇨🇭\n\n**Collections:**\n• **Royal Oak** (1972) — Iconic steel sports watch · €38k–€150k\n• **Royal Oak Offshore** — Extreme 42–44mm version · ~€18k–€38k\n• **Code 11.59** — Contemporary, round, 41mm · ~€22k–€45k\n• **Millenary** — Off-centred dial, oval case · ~€18k–€35k\n\n🏭 Makes its own calibres since 1875. ~40,000 watches produced per year in Le Brassus.\n\n**Note:** AP only sells through official boutiques — no multi-brand retailers. Purchase requests can take years. The Royal Oak Jumbo (15202) is now practically impossible to find at ADs.\n\n💡 Tell me your model for an estimate!`
      )
    },

    // ════════════════════════════════════════════════════════════════════════════
    // PATEK PHILIPPE — specific models first
    // ════════════════════════════════════════════════════════════════════════════

    nautilus: {
      keywords: ['nautilus','5711','5712','5726','nautilus 5711','5711 1a',
                 'what is nautilus','tell me about nautilus','about nautilus',
                 'nautilus history','why is nautilus','nautilus info'],
      response: () => t(
        `**Patek Philippe Nautilus** — le Saint Graal de la montre de luxe. 💎\n\n**Références emblématiques :**\n• **5711/1A-010** — Acier, cadran bleu, **DISCONTINUÉE mars 2021** · ~€76k–€148k (retail était €28.9k !)\n• **5712/1A** — Nautilus avec phase de lune, cal. 240 PS IRM C LU · ~€55k–€95k\n• **5726/1A** — Nautilus calendrier annuel · ~€60k–€110k\n• **5711/1P** — Platine, cadran noir, très rare · >€250k\n\n**Pourquoi la 5711 est unique :**\n• Annoncée discontinuée en 2021 → explosion immédiate à +300% sur le marché secondaire\n• Dessinée par **Gérald Genta** en 1976 (même créateur que la Royal Oak AP)\n• Boîtier intégré, portillons latéraux caractéristiques, cadran guilloché "Clous de Paris"\n\n📈 La plus grande plus-value récente de l'horlogerie mondiale.\n\n💡 Vous avez une 5711 ? [Estimez-la maintenant](/vendre.html)`,
        `**Patek Philippe Nautilus** — the holy grail of luxury watches. 💎\n\n**Iconic references:**\n• **5711/1A-010** — Steel, blue dial, **DISCONTINUED March 2021** · ~€76k–€148k (retail was €28.9k!)\n• **5712/1A** — Nautilus with moonphase, cal. 240 PS IRM C LU · ~€55k–€95k\n• **5726/1A** — Nautilus annual calendar · ~€60k–€110k\n• **5711/1P** — Platinum, black dial, very rare · >€250k\n\n**Why the 5711 is unique:**\n• Announced discontinued in 2021 → immediate +300% explosion on the secondary market\n• Designed by **Gérald Genta** in 1976 (same creator as the Royal Oak)\n• Integrated bracelet, characteristic side porthole links, "Clous de Paris" guilloché dial\n\n📈 The greatest value appreciation in recent watchmaking history.\n\n💡 Got a 5711? [Estimate it now](/vendre.html)`
      )
    },

    aquanaut: {
      keywords: ['aquanaut','5167','5168','5164','aquanaut patek',
                 'what is aquanaut','tell me about aquanaut','about aquanaut'],
      response: () => t(
        `**Patek Philippe Aquanaut** — la sportive contemporaine de Patek. 🌊\n\n**Références :**\n• **5167A** — Acier, cadran noir, bracelet composite · ~€36k–€58k\n• **5167R** — Or rose, cadran marron · ~€55k–€90k\n• **5168G** — Or blanc, cadran bleu · ~€65k–€110k\n• **5164A** — Aquanaut Travel Time, double fuseau · ~€55k–€90k\n\n**Caractéristiques :**\n• Bracelet composite original (brevet Patek) — confortable et résistant\n• Étanche 120m\n• Cal. 324 S C (5167A)\n• Design inspiré du Nautilus, lancé en 1997\n\n📈 La 5167A acier est très demandée — délais longs chez les AD.\n\n💡 Vous avez une Aquanaut ? [Estimez-la ici](/vendre.html)`,
        `**Patek Philippe Aquanaut** — Patek's contemporary sports watch. 🌊\n\n**References:**\n• **5167A** — Steel, black dial, composite strap · ~€36k–€58k\n• **5167R** — Rose gold, brown dial · ~€55k–€90k\n• **5168G** — White gold, blue dial · ~€65k–€110k\n• **5164A** — Aquanaut Travel Time, dual time zone · ~€55k–€90k\n\n**Features:**\n• Original composite strap (Patek patent) — comfortable and resistant\n• 120m water resistance\n• Cal. 324 S C (5167A)\n• Design inspired by the Nautilus, launched in 1997\n\n📈 The steel 5167A is highly sought — long waiting times at authorised dealers.\n\n💡 Got an Aquanaut? [Estimate it here](/vendre.html)`
      )
    },

    calatrava: {
      keywords: ['calatrava','5196','5227','5196p','calatrava patek',
                 'what is calatrava','tell me about calatrava','dress watch patek'],
      response: () => t(
        `**Patek Philippe Calatrava** — la quintessence de la montre habillée. 🎩\n\n**Références :**\n• **5196P** — Platine, cadran blanc, 37mm, cal. 215 PS · ~€28k–€40k\n• **5227G** — Or blanc, fond saphir, 39mm · ~€38k–€55k\n• **5120G** — Or blanc, index bâtons · ~€25k–€35k\n\n**L'histoire :**\nLancée en 1932, la Calatrava est le modèle fondateur de Patek Philippe. Son design épuré, sa lunette fine et ses index bâtons incarnent le style "dress watch" à son état le plus pur.\n\n💡 Moins volatile que la Nautilus, mais très appréciée des collectionneurs sérieux.\n\n💡 Donnez-moi votre référence pour une estimation !`,
        `**Patek Philippe Calatrava** — the quintessence of the dress watch. 🎩\n\n**References:**\n• **5196P** — Platinum, white dial, 37mm, cal. 215 PS · ~€28k–€40k\n• **5227G** — White gold, sapphire caseback, 39mm · ~€38k–€55k\n• **5120G** — White gold, baton indices · ~€25k–€35k\n\n**History:**\nLaunched in 1932, the Calatrava is Patek Philippe's founding model. Its clean design, slim bezel and baton indices embody "dress watch" style in its purest form.\n\n💡 Less volatile than the Nautilus, but highly valued by serious collectors.\n\n💡 Tell me your reference for an estimate!`
      )
    },

    patek: {
      keywords: ['patek','philippe','grand complication','complications',
                 'tell me about patek','about patek','patek brand','patek history',
                 'why is patek','what is patek','patek overview',
                 'twenty 4','gondolo','chronograph patek'],
      response: () => t(
        `**Patek Philippe** — *"Vous ne possédez jamais une Patek Philippe, vous la gardez pour la prochaine génération."* 💎\n\n**Collections :**\n• **Nautilus** (sport, 1976) — Saint Graal, 5711 discontinuée · €76k–€148k\n• **Aquanaut** (sport, 1997) — Bracelet composite · €36k–€110k\n• **Calatrava** (habillée, 1932) — Fondateur de la maison · €25k–€55k\n• **Grandes Complications** — Perpetual calendar, tourbillon, sonnerie · €150k+\n• **Twenty~4** — Collection femme\n\n🏭 Fondée en 1839 à Genève par Antoine Norbert de Patek et Adrien Philippe. Manufacture indépendante (famille Stern depuis 1932). Détient le record aux enchères horlogères — Grandmaster Chime : **31 millions CHF** (2019).\n\n📈 Parmi les meilleures maisons en terme de valeur à la revente, tous modèles confondus.\n\n💡 Donnez-moi votre référence pour une estimation !`,
        `**Patek Philippe** — *"You never actually own a Patek Philippe, you merely look after it for the next generation."* 💎\n\n**Collections:**\n• **Nautilus** (sport, 1976) — Holy grail, 5711 discontinued · €76k–€148k\n• **Aquanaut** (sport, 1997) — Composite strap · €36k–€110k\n• **Calatrava** (dress, 1932) — The house's founding model · €25k–€55k\n• **Grand Complications** — Perpetual calendar, tourbillon, striking · €150k+\n• **Twenty~4** — Ladies' collection\n\n🏭 Founded in Geneva in 1839 by Antoine Norbert de Patek and Adrien Philippe. Independent manufacture (Stern family since 1932). Watchmaking auction record: Grandmaster Chime **CHF 31 million** (2019).\n\n📈 Among the best maisons for resale value — across all models.\n\n💡 Tell me your reference for an estimate!`
      )
    },

    // ════════════════════════════════════════════════════════════════════════════
    // RICHARD MILLE — specific models first
    // ════════════════════════════════════════════════════════════════════════════

    rm027: {
      keywords: ['rm 027','rm027','rm-027','nadal tourbillon','tourbillon nadal',
                 'rafael nadal watch','what is rm 027','rm 27'],
      response: () => t(
        `**Richard Mille RM 027** — la montre la plus légère jamais portée en compétition. 🎾\n\n**Rafael Nadal** la porte à Roland Garros depuis 2010.\n\n**Caractéristiques :**\n• Tourbillon manuel, boîtier NTPT carbone feuilleté\n• Poids total : **~20 grammes** (montre + bracelet)\n• Résiste aux chocs d'un service à 200 km/h\n• Production ultra-limitée : quelques dizaines par série\n\n💰 **Prix marché secondaire : ~€500 000 – €1 200 000+**\n\nL'une des montres les plus exclusives et les plus chères au monde.\n\n💡 Vous en avez une ? Contactez Gary immédiatement :\n📞 **${BIZ.phone1}** · 📧 ${BIZ.email}`,
        `**Richard Mille RM 027** — the lightest watch ever worn in competition. 🎾\n\n**Rafael Nadal** has worn it at Roland Garros since 2010.\n\n**Features:**\n• Manual tourbillon, NTPT layered carbon case\n• Total weight: **~20 grams** (watch + strap)\n• Withstands the shock of a serve at 200 km/h\n• Ultra-limited production: a few dozen per series\n\n💰 **Secondary market price: ~€500,000 – €1,200,000+**\n\nOne of the most exclusive and expensive watches in the world.\n\n💡 Got one? Contact Gary immediately:\n📞 **${BIZ.phone1}** · 📧 ${BIZ.email}`
      )
    },

    rm011: {
      keywords: ['rm 011','rm011','rm-011','felipe massa','flyback rm',
                 'what is rm 011','tell me about rm 011','rm 11'],
      response: () => t(
        `**Richard Mille RM 011** — le chronographe flyback emblématique. 🏎️\n\n**Associé à Felipe Massa** (Formule 1), lancé en 2007.\n\n**Caractéristiques :**\n• Chronographe flyback avec quantième annuel\n• Boîtier titane grade 5, NTPT carbone ou Or Rouge selon version\n• Mouvement squelette visible, architecture "tonneau"\n• Cal. RMAC1, ~50h de réserve de marche\n\n💰 **Prix marché secondaire : ~€170 000 – €340 000**\n(Versions NTPT ou or peuvent dépasser €500k)\n\n📈 Très stable en valeur, fort taux de liquidité.\n\n💡 Vous avez une RM 011 ? [Estimez-la ici](/vendre.html)`,
        `**Richard Mille RM 011** — the emblematic flyback chronograph. 🏎️\n\n**Associated with Felipe Massa** (Formula 1), launched in 2007.\n\n**Features:**\n• Flyback chronograph with annual calendar\n• Grade 5 titanium, NTPT carbon or Rose Gold case depending on version\n• Visible skeletonised movement, "tonneau" architecture\n• Cal. RMAC1, ~50h power reserve\n\n💰 **Secondary market price: ~€170,000 – €340,000**\n(NTPT or gold versions can exceed €500k)\n\n📈 Very stable in value, high liquidity rate.\n\n💡 Got an RM 011? [Estimate it here](/vendre.html)`
      )
    },

    rm035: {
      keywords: ['rm 035','rm035','rm-035','nadal americas','what is rm 035','rm 35'],
      response: () => t(
        `**Richard Mille RM 035** — ultraléger, créé pour Rafael Nadal. 🎾\n\n**Caractéristiques :**\n• Boîtier NTPT Carbon ou titane grade 5\n• Calibre RMUL3 ultraléger\n• Résiste à des chocs extrêmes\n• Verre saphir antireflet\n\n💰 **Prix marché secondaire : ~€140 000 – €270 000**\n\nLa version NTPT (carbone feuilleté) commande une prime significative vs titane.\n\n💡 Vous avez une RM 035 ? [Estimez-la ici](/vendre.html)`,
        `**Richard Mille RM 035** — ultra-lightweight, created for Rafael Nadal. 🎾\n\n**Features:**\n• NTPT Carbon or grade 5 titanium case\n• RMUL3 ultralight calibre\n• Extreme shock resistance\n• Anti-reflective sapphire crystal\n\n💰 **Secondary market price: ~€140,000 – €270,000**\n\nThe NTPT (layered carbon) version commands a significant premium over titanium.\n\n💡 Got an RM 035? [Estimate it here](/vendre.html)`
      )
    },

    rm: {
      keywords: ['richard mille','rm 055','rm055','rm 030','bubba watson',
                 'tell me about richard','about richard mille','richard mille brand',
                 'richard mille watches','why is richard mille','richard mille history',
                 'what is richard mille','richard mille overview'],
      response: () => t(
        `**Richard Mille** — l'avant-garde de l'horlogerie haute technologie. ⚡\n\n**Modèles emblématiques :**\n• **RM 027** — Tourbillon Rafael Nadal, ~20g · €500k–€1.2M\n• **RM 011** — Flyback Felipe Massa · €170k–€340k\n• **RM 035** — Ultraléger Nadal Americas · €140k–€270k\n• **RM 055** — Bubba Watson, sans chiffres · €140k–€250k\n\n**Ce qui rend RM unique :**\n• Matériaux aérospatiaux : NTPT carbon, titane grade 5, TPT Quartz\n• Génie mécanique visible (mouvement squelette)\n• Chaque référence limitée à quelques centaines d'exemplaires\n• Port quotidien en conditions extrêmes (tennis, golf, voile, F1)\n\n🏭 Fondée en 2001 aux Breuleux, Jura. ~5 000 montres par an.\n\n💡 Donnez-moi votre modèle pour une estimation précise !`,
        `**Richard Mille** — the avant-garde of high-tech watchmaking. ⚡\n\n**Iconic models:**\n• **RM 027** — Rafael Nadal tourbillon, ~20g · €500k–€1.2M\n• **RM 011** — Felipe Massa flyback · €170k–€340k\n• **RM 035** — Nadal Americas ultralight · €140k–€270k\n• **RM 055** — Bubba Watson, no numerals · €140k–€250k\n\n**What makes RM unique:**\n• Aerospace materials: NTPT carbon, grade 5 titanium, TPT Quartz\n• Visible mechanical genius (skeletonised movement)\n• Each reference limited to a few hundred pieces\n• Daily wear in extreme conditions (tennis, golf, sailing, F1)\n\n🏭 Founded in 2001 in Les Breuleux, Jura. ~5,000 watches per year.\n\n💡 Tell me your model for a precise estimate!`
      )
    },

    // ════════════════════════════════════════════════════════════════════════════
    // CARTIER — specific models first
    // ════════════════════════════════════════════════════════════════════════════

    ballon_bleu: {
      keywords: ['ballon bleu','balloon bleu','ballon blue',
                 'what is ballon bleu','tell me about ballon bleu','ballon cartier'],
      response: () => t(
        `**Cartier Ballon Bleu** — l'élégance contemporaine par excellence. 💛\n\n**Références populaires :**\n• **WSBB0003** — Acier, 40mm, bracelet acier · ~€5.5k–€8k\n• **WSBB0002** — Acier, 36mm · ~€5k–€7k\n• **W6920068** — Acier, 42mm · ~€6k–€9k\n• Versions or rose/blanc disponibles (+prime significative)\n\n**Design :** Boîtier "ballon" aux contours arrondis, cabochon bleu saphir sur la couronne — signature Cartier. Lancée en 2007.\n\n💡 Donnez-moi votre référence pour une estimation précise !`,
        `**Cartier Ballon Bleu** — contemporary elegance at its finest. 💛\n\n**Popular references:**\n• **WSBB0003** — Steel, 40mm, steel bracelet · ~€5.5k–€8k\n• **WSBB0002** — Steel, 36mm · ~€5k–€7k\n• **W6920068** — Steel, 42mm · ~€6k–€9k\n• Rose/white gold versions available (+significant premium)\n\n**Design:** "Balloon" case with rounded contours, blue sapphire cabochon on the crown — Cartier's signature. Launched in 2007.\n\n💡 Tell me your reference for an accurate estimate!`
      )
    },

    santos: {
      keywords: ['santos','santos de cartier','wssa0018','wssa0061',
                 'what is santos','tell me about santos','pilot watch cartier',
                 'first wristwatch','first aviator watch'],
      response: () => t(
        `**Santos de Cartier** — la première montre-bracelet de l'aviation. ✈️\n\n**L'histoire :** Créée en **1904** par Louis Cartier pour l'aviateur brésilien Alberto Santos-Dumont, qui avait besoin de lire l'heure en vol (impossible avec une montre de poche).\n\n**Références actuelles :**\n• **WSSA0018** — Santos Medium acier, cadran blanc · ~€5k–€7k\n• **WSSA0061** — Santos Large acier, cadran blanc · ~€5.5k–€8k\n• Système d'interchange bracelet/strap (breveté)\n\n**Points clés :** Boîtier carré, vis apparentes, bracelet intégré — style reconnaissable entre tous.\n\n💡 Vous avez une Santos ? Donnez-moi la référence !`,
        `**Santos de Cartier** — the world's first pilot's wristwatch. ✈️\n\n**History:** Created in **1904** by Louis Cartier for Brazilian aviator Alberto Santos-Dumont, who needed to read the time while flying (impossible with a pocket watch).\n\n**Current references:**\n• **WSSA0018** — Santos Medium steel, white dial · ~€5k–€7k\n• **WSSA0061** — Santos Large steel, white dial · ~€5.5k–€8k\n• Interchangeable bracelet/strap system (patented)\n\n**Key points:** Square case, exposed screws, integrated bracelet — unmistakable style.\n\n💡 Got a Santos? Tell me the reference!`
      )
    },

    tank: {
      keywords: ['cartier tank','tank watch','tank must','tank louis','tank solo',
                 'what is the tank','tank cartier history','cartier tank watch'],
      response: () => t(
        `**Cartier Tank** — icône de style depuis 1917. 🎨\n\n**L'histoire :** Dessinée par Louis Cartier en **1917**, inspirée des chars d'assaut Renault FT de la Première Guerre mondiale (vue de dessus).\n\n**Collections :**\n• **Tank Must** — Acier, cadran romain, la plus accessible · ~€2.5k–€4.5k\n• **Tank Louis Cartier** — Or, la version historique · ~€8k–€18k\n• **Tank Solo** — Acier, sobre · ~€2.5k–€3.5k\n• **Tank Américaine** — Boîtier incurvé, version luxe\n\n🌟 Portée par Jackie Kennedy, Princess Diana, Andy Warhol, François Mitterrand.\n\n💡 Vous avez une Tank ? Donnez-moi le modèle !`,
        `**Cartier Tank** — a style icon since 1917. 🎨\n\n**History:** Designed by Louis Cartier in **1917**, inspired by the Renault FT tanks of World War I (viewed from above).\n\n**Collections:**\n• **Tank Must** — Steel, Roman dial, most accessible · ~€2.5k–€4.5k\n• **Tank Louis Cartier** — Gold, the historic version · ~€8k–€18k\n• **Tank Solo** — Steel, understated · ~€2.5k–€3.5k\n• **Tank Américaine** — Curved case, luxury version\n\n🌟 Worn by Jackie Kennedy, Princess Diana, Andy Warhol, François Mitterrand.\n\n💡 Got a Tank? Tell me the model!`
      )
    },

    cartier: {
      keywords: ['cartier','pasha','panthère','drive de cartier',
                 'tell me about cartier','about cartier',
                 'cartier brand','cartier history','cartier watches','what is cartier',
                 'cartier overview'],
      response: () => t(
        `**Cartier** — la maison joaillière devenue maître horloger. 💛\n\n**Collections horlogères :**\n• **Santos** (1904) — Première montre d'aviation · ~€5k–€8k\n• **Tank** (1917) — Icône rectangulaire · ~€2.5k–€18k\n• **Ballon Bleu** (2007) — Courbes contemporaines · ~€5k–€9k\n• **Pasha** (1985) — Sportif, cadran rond, chiffres arabes · ~€4k–€8k\n• **Panthère** — Rectangulaire, très féminine\n\n🏭 Fondée à Paris en 1847. Groupe Richemont depuis 1988.\n\n📈 Cartier se revend bien — modèles acier en édition limitée et pièces or avec papiers en tête.\n\n💡 Vous avez une Cartier ? Donnez-moi le modèle !`,
        `**Cartier** — the jewellery house that became a master watchmaker. 💛\n\n**Watch collections:**\n• **Santos** (1904) — First aviation wristwatch · ~€5k–€8k\n• **Tank** (1917) — Timeless rectangular icon · ~€2.5k–€18k\n• **Ballon Bleu** (2007) — Contemporary curves · ~€5k–€9k\n• **Pasha** (1985) — Sporty, round dial, Arabic numerals · ~€4k–€8k\n• **Panthère** — Rectangular, very feminine\n\n🏭 Founded in Paris in 1847. Richemont Group since 1988.\n\n📈 Cartier resells well — steel models in limited editions and gold pieces with papers lead the way.\n\n💡 Got a Cartier? Tell me the model!`
      )
    },

    // ── PRICING / VALUATION ──────────────────────────────────────────────────────
    pricing: {
      keywords: ['prix','price','combien','how much','valeur','value','vaut',
                 'worth','estimate','estimation','cote','côte','coter',
                 'secondary market','marché secondaire','cotes',
                 'give me an estimate','estimation gratuite','what is it worth',
                 'what are prices','what are watch prices',
                 'valuation','appraisal','appraised','cost',
                 'how do i know what my watch is worth','what my watch is worth'],
      response: () => t(
        `Je peux estimer la valeur de votre montre en temps réel ! 💰\n\nDites-moi la **marque + modèle** (ex : *"Rolex Submariner 124060"*, *"Patek Nautilus 5711"*) et je récupère les prix du marché secondaire en direct.\n\nOu pour une estimation personnalisée avec l'état et les papiers :\n👉 **[Page Vendre](/vendre.html)** — outil gratuit, résultat instantané\n\n📞 Ou appelez **Gary** : **${BIZ.phone1}**`,
        `I can estimate your watch's value in real time! 💰\n\nTell me the **brand + model** (e.g. *"Rolex Submariner 124060"*, *"Patek Nautilus 5711"*) and I'll pull live secondary market prices.\n\nOr for a personalised estimate based on condition and papers:\n👉 **[Sell page](/vendre.html)** — free tool, instant result\n\n📞 Or call **Gary**: **${BIZ.phone1}**`
      )
    },

    // ── CONTACT / APPOINTMENT ────────────────────────────────────────────────────
    contact: {
      keywords: ['contact','appointment','rendez-vous','rdv','meeting',
                 'phone','téléphone','email','whatsapp','book',
                 'réserver','how to reach','reach you','come to you',
                 'can i meet','meet you','meet in person','visit you',
                 'find you','where to find','adresse','address',
                 'get in touch','joindre','rejoindre',
                 'visit in person','can i come','come visit','come see',
                 'in person','drop by','venir vous voir','passer vous voir',
                 'located','where are you located','your location',
                 'where are you','how do i contact','how to contact'],
      response: () => t(
        `**Prendre rendez-vous — Nos Montres :**\n\n📍 **Adresse :** ${BIZ.addr}\n📞 **Tél :** ${BIZ.phone1}\n📱 **Mobile :** ${BIZ.phone2}\n📧 **Email :** ${BIZ.email}\n🕐 **Disponibilité :** ${BIZ.hours}\n\nNous opérons **sur rendez-vous uniquement** — service personnalisé et discret garanti. Chaque RDV est dédié entièrement à votre projet.\n\n👉 [Réserver en ligne](/prendre-rendez-vous.html)`,
        `**Book an appointment — Nos Montres:**\n\n📍 **Address:** ${BIZ.addr}\n📞 **Phone:** ${BIZ.phone1}\n📱 **Mobile:** ${BIZ.phone2}\n📧 **Email:** ${BIZ.email}\n🕐 **Availability:** ${BIZ.hoursEn}\n\nWe operate **by appointment only** — personalised and discreet service guaranteed. Each appointment is dedicated entirely to your project.\n\n👉 [Book online](/prendre-rendez-vous.html)`
      )
    },

    // ── ABOUT NOS MONTRES ────────────────────────────────────────────────────────
    about: {
      keywords: ['nos montres','qui êtes','who are you','qui sommes','about you',
                 'votre boutique','your shop','à propos','company','société',
                 'paris','paris 8','paris 8ème','miromesnil','8th arrondissement',
                 'you guys','your company','what do you do',
                 'what you do','your service','votre service',
                 'vous êtes qui','que faites','êtes-vous','faites vous',
                 'qui êtes-vous','vous faites quoi','gary','fondateur','founder',
                 'who is gary','qui est gary','années expérience','years experience',
                 'boutique paris','watch shop paris','where are you based'],
      response: () => t(
        `**Nos Montres** — expert en montres de luxe à Paris 8ème 🇫🇷\n\n👤 **Fondateur :** Gary · **${BIZ.years} ans d'expertise** en horlogerie de luxe\n📍 **${BIZ.addr}**\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n🕐 ${BIZ.hours}\n\n🎯 **Ce que nous faisons :**\n• Rachat Rolex, AP, Patek, RM, Cartier — meilleur prix du marché\n• Estimation gratuite en ligne ou sur RDV\n• Paiement immédiat, aucune commission\n• Révision & réparation Rolex et Audemars Piguet\n• 100% des montres expertisées et authentifiées\n\n✅ *Service sur mesure, discret, par un passionné.*\n\n→ [En savoir plus](/a-propos.html) · [Prendre RDV](/prendre-rendez-vous.html)`,
        `**Nos Montres** — luxury watch expert in Paris 8th 🇫🇷\n\n👤 **Founder:** Gary · **${BIZ.years} years of expertise** in luxury watchmaking\n📍 **${BIZ.addr}**\n📞 **${BIZ.phone1}** · ${BIZ.phone2}\n📧 ${BIZ.email}\n🕐 ${BIZ.hoursEn}\n\n🎯 **What we do:**\n• Buyback of Rolex, AP, Patek, RM, Cartier — best market price\n• Free estimate online or by appointment\n• Immediate payment, zero commission\n• Rolex and Audemars Piguet service & repair\n• 100% of watches expertised and authenticated\n\n✅ *Tailored, discreet service by a passionate expert.*\n\n→ [Learn more](/a-propos.html) · [Book an appointment](/prendre-rendez-vous.html)`
      )
    }

  };

  // ─── Worker price lookup ──────────────────────────────────────────────────────
  function isPriceIntent(n) {
    return ['prix','price','combien','how much','valeur','value','vaut',
            'estimate','estimation','cote','coter',
            'cost','watch worth','montre vaut'].some(kw => kwMatch(n, kw));
  }

  function hasBrand(n) {
    return [
      // Rolex
      'rolex','submariner','daytona','datejust','gmt master','gmt-master',
      '124060','126500','126610','126710','126711','126715','126334','116500',
      'pepsi','batman','root beer','rootbeer','kermit','hulk',
      // AP
      'audemars','royal oak','offshore',
      '15500','15202','15400','26331','26470',
      // Patek
      'patek','nautilus','aquanaut','calatrava',
      '5711','5167','5168','5726','5712','5980','5164',
      // RM
      'richard mille','rm 011','rm 027','rm 035','rm 055','rm011','rm027','rm035',
      // Cartier
      'cartier','ballon bleu','santos',
      // short tokens — word-boundary via kwMatch (≤4 chars)
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

  // ─── Response engine ──────────────────────────────────────────────────────────
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
      `Je ne suis pas sûr de comprendre. Je peux vous aider avec :\n\n• 💰 **Estimation** — donnez-moi la marque et le modèle\n• 🏷️ **Infos marque** — Rolex, AP, Patek, RM, Cartier\n• 🔧 **Services** — révision, réparation, pile\n• 📋 **Vendre votre montre** — rachat immédiat\n• 📅 **Nous trouver** — ${BIZ.addr}, ${BIZ.phone1}\n\nEssayez notre [page Vendre](/vendre.html) pour une estimation instantanée !`,
      `I'm not sure I understand. I can help with:\n\n• 💰 **Estimate** — tell me the brand and model\n• 🏷️ **Brand info** — Rolex, AP, Patek, RM, Cartier\n• 🔧 **Services** — service, repair, battery\n• 📋 **Sell your watch** — immediate buyback\n• 📅 **Find us** — ${BIZ.addr}, ${BIZ.phone1}\n\nTry our [Sell page](/vendre.html) for an instant estimate!`
    );
  }

  async function getResponse(text) {
    const n = norm(text);

    // 1. Price intent + brand → live Worker price
    //    Investment intent overrides (e.g. "does rolex hold value" → investment KB)
    const isInvestmentIntent = ['hold value','holds value','worth buying',
                                'good investment','worth it','is worth buying'].some(p => n.includes(p));
    if (isPriceIntent(n) && hasBrand(n) && !isInvestmentIntent) {
      const data = await fetchWorkerPrice(text);
      if (data) {
        const lo = data.lowPrice.toLocaleString('fr-FR');
        const hi = data.highPrice.toLocaleString('fr-FR');
        const label = data.label || text;
        return t(
          `💰 **Estimation marché pour ${label} :**\n\nAnnonce la moins chère : **€${lo}**\nAnnonce la plus chère : **€${hi}**\n\n_Prix du marché secondaire en direct._\n\n→ [Estimation ajustée état & papiers](/vendre.html) · [Vendre cette montre](/vendre.html)`,
          `💰 **Market estimate for ${label}:**\n\nCheapest listing: **€${lo}**\nMost expensive listing: **€${hi}**\n\n_Live secondary market prices._\n\n→ [Estimate adjusted for condition & papers](/vendre.html) · [Sell this watch](/vendre.html)`
        );
      }
    }

    // 2. KB keyword match
    const kbResponse = matchKB(n);
    if (kbResponse) return kbResponse;

    // 3. Fallback
    return fallback();
  }

  // ─── Format markdown in bot messages ─────────────────────────────────────────
  function formatMd(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  // ─── CSS ──────────────────────────────────────────────────────────────────────
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

  // ─── Build DOM ────────────────────────────────────────────────────────────────
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

  const headerStatus = t('Expert · Estimation instantanée', 'Expert · Instant estimate');
  const inputPlaceholder = t('Ex: valeur de ma Rolex Submariner…', 'E.g. value of my Rolex Submariner…');

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
          <div id="nm-chat-header-status">${headerStatus}</div>
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
        <textarea id="nm-chat-input" placeholder="${inputPlaceholder}" rows="1"></textarea>
        <button type="submit" id="nm-chat-send" aria-label="Send">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  `);

  // ─── Elements ──────────────────────────────────────────────────────────────────
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

  // ─── Helpers ───────────────────────────────────────────────────────────────────
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

  // ─── Send ──────────────────────────────────────────────────────────────────────
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

  // ─── Open / Close ──────────────────────────────────────────────────────────────
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
          t(
            `Bonjour ! 👋 Je suis l'assistant Nos Montres.\n\nJe peux vous donner les **prix du marché en temps réel** pour n'importe quelle montre de luxe, vous expliquer comment vendre la vôtre, ou répondre à toute question sur Rolex, AP, Patek, RM ou Cartier.\n\nComment puis-je vous aider ?`,
            `Hello! 👋 I'm the Nos Montres assistant.\n\nI can give you **live market prices** for any luxury watch, explain how to sell yours, or answer any question about Rolex, AP, Patek, RM or Cartier.\n\nHow can I help you?`
          ),
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

  // ─── Events ────────────────────────────────────────────────────────────────────
  btn.addEventListener('click',  () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);
  form.addEventListener('submit', e => { e.preventDefault(); sendMessage(input.value); });
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); } });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 80) + 'px'; });

  // ─── Attention bubble ───────────────────────────────────────────────────────────
  function dismissBubble() {
    const b = document.getElementById('nm-chat-bubble');
    if (!b) return;
    b.classList.add('nm-bubble-out');
    setTimeout(() => b && b.parentNode && b.parentNode.removeChild(b), 260);
  }

  const bubble = document.createElement('div');
  bubble.id = 'nm-chat-bubble';
  bubble.textContent = t('Estimez votre montre en direct 💰', 'Estimate your watch live 💰');
  bubble.setAttribute('role', 'button');
  bubble.setAttribute('aria-label', 'Ouvrir le chat');
  document.body.appendChild(bubble);
  bubble.addEventListener('click', () => { dismissBubble(); openChat(); });
  const bubbleTimer = setTimeout(() => dismissBubble(), 9000);
  bubble.addEventListener('click', () => clearTimeout(bubbleTimer));

})();
