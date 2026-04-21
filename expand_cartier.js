const fs = require('fs');
const path = require('path');

// Read the chatbot file
const chatbotPath = path.join(__dirname, 'js', 'chatbot.js');
let content = fs.readFileSync(chatbotPath, 'utf8');

// Find insertion point: after cartier_love entry
const insertionMarker = `    { id:'cartier_love', kw:['love cartier','love bracelet','love ring','b6035517','b6047317','cartier love bracelet','vis cartier','tournevis cartier','love gold','love acier','love or','love diamond','love prix'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Cartier Love Bracelet : bijou iconique depuis 1969. Or jaune 18ct ~6 500€, or rose ~6 500€, or blanc ~6 500€. Acier ~2 000–3 000€ marché seconde main. Contactez-nous pour disponibilité.\`,
        \`Cartier Love Bracelet: iconic jewel since 1969. Yellow gold 18ct ~€6,500, rose gold ~€6,500, white gold ~€6,500. Steel ~€2,000–3,000 on secondary market. Contact us for availability.\`
      );} },`;

const insertionIndex = content.indexOf(insertionMarker);
if (insertionIndex === -1) {
  console.error('ERROR: Could not find cartier_love insertion point');
  process.exit(1);
}

const insertAfterIndex = insertionIndex + insertionMarker.length;

// New Cartier entries
const newEntries = `

    // SANTOS COLLECTION
    { id:'cartier_santos_medium', kw:['santos medium','santos 35','santos 35.1mm','santos acier medium','cartier santos 35'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Medium'; return t(
        \`Cartier Santos Moyen (35.1mm, acier, cal. 1847 MC) : le classique sport revisité. Boîtier acier inoxydable, bracelet QuickSwitch intégré. Mouvement automatique 42h réserve, 100m étanchéité. ~9 500–11 000€ neuf. Design 1904, modernisé avec l'acier brossé et le verre saphir bombé. Couronne octogonale brevetée. Référence W2SA0018, collection contemporaine incontournable.\`,
        \`Cartier Santos Medium (35.1mm, steel, cal. 1904 MC): the iconic sports watch redesigned. Stainless steel case, integrated QuickSwitch bracelet. Automatic movement 42-hour reserve, 100m water resistance. ~€9,500–11,000 new. 1904 design, modernized with brushed steel and domed sapphire crystal. Patented octagonal crown. Reference W2SA0018, essential contemporary collection.\`
      );} },

    { id:'cartier_santos_large', kw:['santos large','santos 39','santos 39.8mm','santos acier grand','cartier santos 39','santos wssa0018'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Large'; return t(
        \`Cartier Santos Grand (39.8mm, acier, cal. 1847 MC) : la version masculine du classique sport. Boîtier acier inoxydable, bracelet QuickSwitch, lunette sculptée. Mouvement automatique 42h réserve, 100m étanchéité. ~10 500–12 500€ neuf. Références WSSA0018. Cadran bleu ou blanc, index appliqués, aiguilles épées. Léger et confortable malgré les 39.8mm. Choix premium pour le poignet masculin.\`,
        \`Cartier Santos Large (39.8mm, steel, cal. 1904 MC): the masculine version of the iconic sports watch. Stainless steel case, QuickSwitch bracelet, sculpted bezel. Automatic movement 42-hour reserve, 100m water resistance. ~€10,500–12,500 new. Reference WSSA0018. Blue or white dial, applied indices, sword hands. Light and comfortable despite 39.8mm case. Premium choice for men's wrists.\`
      );} },

    { id:'cartier_santos_skeleton', kw:['santos skeleton','santos squelette','santos adlc','santos pvm','cartier skeleton santos'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Skeleton'; return t(
        \`Cartier Santos Skeleton (39.8mm, ADLC carbone, cal. 9611 MC) : haute horlogerie affichée. Boîtier revêtu PVD noir (carbone), dos transparent, mécanisme visible. Squelettisation complète du mouvement automatique. ~28 000–32 000€ neuf. Lunette or rose ou acier contraste, index diamants optionnels. Edition limitée, prestiges collections. Réference WHSA0012 (acier), WJSA0015 (or rose).\`,
        \`Cartier Santos Skeleton (39.8mm, ADLC carbon, cal. 9611 MC): haute horlogerie on display. DLC coated case (black carbon), transparent caseback, visible mechanism. Full skeletonized automatic movement. ~€28,000–32,000 new. Rose gold or contrasted steel bezel, optional diamond indices. Limited edition, prestige collections. Reference WHSA0012 (steel), WJSA0015 (rose gold).\`
      );} },

    { id:'cartier_santos_chrono', kw:['santos chronographe','santos chrono','santos chronograph','santos timing','cartier santos chronograph'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Santos Chronographe'; return t(
        \`Cartier Santos Chronographe (39.8mm, acier/or, cal. 1904 CHR MC) : l'outil sportif complet. Boîtier acier ou or jaune, fond transparent, chronographe intégré 30mn. Mouvement automatique chronographique 40h réserve, 100m étanchéité. ~15 000–18 000€ (acier), ~45 000–55 000€ (or). Cadran noir avec compteurs contrastants. Bracelet QuickSwitch. Rarement proposé, collection boutique exclusive.\`,
        \`Cartier Santos Chronograph (39.8mm, steel/gold, cal. 1904 CHR MC): the complete sports tool. Steel or yellow gold case, transparent caseback, integrated 30-minute chronograph. Automatic chronograph movement 40-hour reserve, 100m water resistance. ~€15,000–18,000 (steel), ~€45,000–55,000 (gold). Black dial with contrasting counters. QuickSwitch bracelet. Rarely offered, exclusive boutique collection.\`
      );} },

    // TANK COLLECTION
    { id:'cartier_tank_louis', kw:['tank louis','tank 1917','original tank','premiere tank','cartier tank history'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Louis'; return t(
        \`Cartier Tank Louis Cartier (33.7mm, acier/or, cal. 1904 MC) : la montre carrée d'exception depuis 1917. Création iconique de Louis Cartier, boîtier acier ou or jaune/rose 18ct, lunette lisse. Mouvement automatique 40h réserve, 30m étanchéité. ~7 500–9 500€ (acier), ~35 000–45 000€ (or). Cadran email blanc avec chiffres romains. Bracelet cuir alligator ou acier. References WTA0011, WGTA0002. Pièce de collection, patrimoine horloger.\`,
        \`Cartier Tank Louis Cartier (33.7mm, steel/gold, cal. 1904 MC): the exceptional square watch since 1917. Iconic creation by Louis Cartier, stainless steel or 18ct yellow/rose gold case, smooth bezel. Automatic movement 40-hour reserve, 30m water resistance. ~€7,500–9,500 (steel), ~€35,000–45,000 (gold). White enamel dial with Roman numerals. Alligator leather or steel bracelet. References WTA0011, WGTA0002. Collector's piece, watchmaking heritage.\`
      );} },

    { id:'cartier_tank_must', kw:['tank must','tank solarbeat','tank must solaire','cartier tank accessible','tank quartz must'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Must'; return t(
        \`Cartier Tank Must SolarBeat (33.7mm, acier/PVD, cal. 690 quartz solaire) : démocratisation du Tank. Boîtier acier inoxydable option PVD noir, bracelet acier. Mouvement quartz SolarBeat (recharge solaire) 16 mois autonomie. ~1 700–2 200€. Cadran noir ou bleu, chiffres romains. Très accessible, collection jeune. Couronne tank sculptée. References CRWSTA0018 (acier), CRWSTA0009 (PVD). Popularité montante auprès millennials.\`,
        \`Cartier Tank Must SolarBeat (33.7mm, steel/PVD, cal. 690 solar quartz): democratizing the Tank. Stainless steel case with optional black PVD, steel bracelet. SolarBeat quartz movement (solar rechargeable) 16-month power reserve. ~€1,700–2,200. Black or blue dial, Roman numerals. Highly accessible, young collection. Sculpted tank crown. References CRWSTA0018 (steel), CRWSTA0009 (PVD). Rising popularity with millennials.\`
      );} },

    { id:'cartier_tank_mc', kw:['tank mc','tank moyen','tank manufacture','tank 29','cartier tank mc medium'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank MC'; return t(
        \`Cartier Tank MC (29mm, acier/or, cal. 1904 MC) : le Tank femme par excellence. Boîtier acier inoxydable ou or jaune/rose 18ct, lunette lisse satinée. Mouvement automatique Cartier 1904 MC 40h, 30m étanchéité. ~6 500–8 500€ (acier), ~32 000–42 000€ (or). Cadran blanc, index romains appétents. Bracelet cuir alligator ou QuickSwitch acier. References WTA0013, WGTA0008. Proposition unisexe moderne sur 29mm.\`,
        \`Cartier Tank MC (29mm, steel/gold, cal. 1904 MC): the quintessential women's Tank. Stainless steel or 18ct yellow/rose gold case, smooth satin bezel. Automatic Cartier 1904 MC movement 40-hour reserve, 30m water resistance. ~€6,500–8,500 (steel), ~€32,000–42,000 (gold). White dial, Roman indices. Alligator leather or QuickSwitch steel bracelet. References WTA0013, WGTA0008. Modern unisex proposition on 29mm.\`
      );} },

    { id:'cartier_tank_cintree', kw:['tank cintrée','tank cintree','tank elongated','tank vintage','tank curvé','cartier tank curved'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Cintrée'; return t(
        \`Cartier Tank Cintrée (50.2 x 31mm, or jaune, cal. 1904 MC) : l'élégance bombée originale. Boîtier or jaune 18ct épuré, lunette bombée signature. Mouvement automatique 40h réserve, 30m étanchéité. ~35 000–45 000€ marché. Cadran bleu nuit ou argent. Référence WGTA0050. Pièce vintage-inspirée, ligne courbée intemporelle. Produit actuellement en édition limitée. Rarissime depuis 1980s.\`,
        \`Cartier Tank Cintrée (50.2 x 31mm, yellow gold, cal. 1904 MC): the original domed elegance. Pure 18ct yellow gold case, signature domed bezel. Automatic movement 40-hour reserve, 30m water resistance. ~€35,000–45,000 market. Midnight blue or silver dial. Reference WGTA0050. Vintage-inspired piece, timeless curved line. Currently produced in limited edition. Rarified since 1980s.\`
      );} },

    { id:'cartier_tank_normale', kw:['tank normale','tank 2024','tank reinvention','tank edition','tank relaunch'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tank Normale'; return t(
        \`Cartier Tank Normale (27.4 x 23.4mm, acier/or, cal. 690 quartz) : la ré-édition 2024 de 1928. Boîtier acier inoxydable ou or jaune, proportions carrées pures. Mouvement quartz 690 Cartier, 3 ans autonomie. ~4 200€ (acier), ~18 000€ (or jaune). Cadran blanc email ou noir, chiffres romains gravés. Bracelet cuir alligator cartier. Références WSTA0009 (acier), WGTA0045 (or). Relance boutique 2024, collection historiquement fondatrice.\`,
        \`Cartier Tank Normale (27.4 x 23.4mm, steel/gold, cal. 690 quartz): the 2024 re-edition of 1928. Stainless steel or yellow gold case, pure square proportions. Cartier 690 quartz movement, 3-year power reserve. ~€4,200 (steel), ~€18,000 (yellow gold). White enamel or black dial, engraved Roman numerals. Cartier alligator leather bracelet. References WSTA0009 (steel), WGTA0045 (gold). Boutique relaunch 2024, historically foundational collection.\`
      );} },

    // BALLON BLEU COLLECTION
    { id:'cartier_bb_33', kw:['ballon bleu 33','bb 33','ballon bleu quartz','bb femme','ballon bleu dame','cartier bb dames'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 33'; return t(
        \`Cartier Ballon Bleu 33mm (acier/or, quartz) : l'iconique pour dames. Boîtier 33mm acier inoxydable ou or jaune 18ct, lunette portée cabochon saphir bleu. Mouvement quartz Cartier, 2 ans autonomie. ~4 500–6 500€ (acier), ~28 000–36 000€ (or). Cadran bleu grad ou argenté, chiffres romains. Bracelet QuickSwitch cuir ou acier. Références W2BA0004 (acier), WGBB0004 (or). Inévitable feminin, porté iconic léger.\`,
        \`Cartier Ballon Bleu 33mm (steel/gold, quartz): the iconic women's version. 33mm stainless steel or 18ct yellow gold case, signature worn sapphire cabochon bezel. Cartier quartz movement, 2-year power reserve. ~€4,500–6,500 (steel), ~€28,000–36,000 (gold). Blue gradient or silver dial, Roman numerals. QuickSwitch leather or steel bracelet. References W2BA0004 (steel), WGBB0004 (gold). Iconic feminine, lightweight worn design.\`
      );} },

    { id:'cartier_bb_36', kw:['ballon bleu 36','bb 36','ballon bleu auto','bb unisexe','cartier bb moyen','ballon bleu proportions'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 36'; return t(
        \`Cartier Ballon Bleu 36mm (acier/or, cal. 1847 MC) : l'unisexe référence. Boîtier 36mm acier ou or jaune, lunette cabochon bleu saphir signature. Mouvement automatique Cartier 1904 MC 40h réserve. 100m étanchéité. ~6 500–8 500€ (acier), ~35 000–45 000€ (or). Cadran blanc ou bleu soleillé, aiguilles épées. Bracelet QuickSwitch acier ou cuir. References W2BB0004, WGBB0033. Porté léger, masculine/feminine equivalent proportion.\`,
        \`Cartier Ballon Bleu 36mm (steel/gold, cal. 1904 MC): the unisex reference. 36mm stainless steel or yellow gold case, signature blue sapphire cabochon bezel. Automatic Cartier 1904 MC movement 40-hour reserve. 100m water resistance. ~€6,500–8,500 (steel), ~€35,000–45,000 (gold). White or sunburst blue dial, sword hands. QuickSwitch steel or leather bracelet. References W2BB0004, WGBB0033. Light worn design, masculine/feminine equivalent proportions.\`
      );} },

    { id:'cartier_bb_42', kw:['ballon bleu 42','bb 42','ballon bleu hommes','bb masculin','ballon bleu grand','cartier bb grand'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ballon Bleu 42'; return t(
        \`Cartier Ballon Bleu 42mm (acier/or, cal. 9611 MC) : le Ballon masculin fort. Boîtier 42mm acier inoxydable ou or jaune 18ct, lunette cabochon bleu saphir prédominant. Mouvement automatique 9611 MC, chronographe optionnel (version Chronographe). 100m étanchéité. ~7 500–9 500€ (acier), ~40 000–50 000€ (or). Cadran gris, blanc ou gradient bleu. Bracelet QuickSwitch acier. Références W2BB0010 (acier), WGBB0010 (or). Présence masculine, port épais et léger.\`,
        \`Cartier Ballon Bleu 42mm (steel/gold, cal. 1904 MC): the strong masculine Ballon. 42mm stainless steel or 18ct yellow gold case, dominant blue sapphire cabochon bezel. Automatic 1904 MC movement, optional chronograph (Chronograph version). 100m water resistance. ~€7,500–9,500 (steel), ~€40,000–50,000 (gold). Gray, white or blue gradient dial. QuickSwitch steel bracelet. References W2BB0010 (steel), WGBB0010 (gold). Masculine presence, thick yet light wear.\`
      );} },

    // PASHA COLLECTION
    { id:'cartier_pasha_41', kw:['pasha 41','pasha current','pasha automatique','pasha 41mm','cartier pasha moderne'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha de Cartier 41'; return t(
        \`Cartier Pasha de Cartier 41mm (acier/or, cal. 1904 MC) : l'icône carrée sport 2020. Boîtier 41mm acier inoxydable ou or jaune, lunette carrée Pasha, couronne protégée. Mouvement automatique 40h réserve, 100m étanchéité. ~8 500–10 500€ (acier), ~40 000–50 000€ (or). Cadran noir, bleu ou gris, aiguilles Mercedes. Bracelet QuickSwitch acier ou cuir. Références W2PA0010 (acier), WGPA0010 (or). Design revitalisé 2021, très demandé.\`,
        \`Cartier Pasha de Cartier 41mm (steel/gold, cal. 1904 MC): the iconic square sports watch 2020. 41mm stainless steel or yellow gold case, Pasha square bezel, protected crown. Automatic movement 40-hour reserve, 100m water resistance. ~€8,500–10,500 (steel), ~€40,000–50,000 (gold). Black, blue or gray dial, Mercedes hands. QuickSwitch steel or leather bracelet. References W2PA0010 (steel), WGPA0010 (gold). Revitalized 2021 design, highly sought.\`
      );} },

    { id:'cartier_pasha_chrono', kw:['pasha chronographe','pasha chrono','pasha timing','pasha chronograph','cartier pasha sport'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha Chronographe'; return t(
        \`Cartier Pasha Chronographe (42mm, acier/or, cal. 1904-CHR MC) : l'outil sport complet. Boîtier 42mm acier ou or, lunette Pasha distincte, fond transparent. Chronographe intégré 12h/30mn/60s. Mouvement automatique chronographique. ~12 000–14 000€ (acier), ~50 000–65 000€ (or). Cadran noir avec compteurs colorés. Rarement proposé, collection spécialisée. Référence W2PA0015 (acier version).\`,
        \`Cartier Pasha Chronograph (42mm, steel/gold, cal. 1904-CHR MC): the complete sports tool. 42mm steel or gold case, distinct Pasha bezel, transparent caseback. Integrated 12-hour/30-minute/60-second chronograph. Automatic chronograph movement. ~€12,000–14,000 (steel), ~€50,000–65,000 (gold). Black dial with colored counters. Rarely offered, specialized collection. Reference W2PA0015 (steel version).\`
      );} },

    { id:'cartier_pasha_skeleton', kw:['pasha skeleton','pasha squelette','pasha transparent','pasha adlc','cartier pasha ajouré'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Pasha Skeleton'; return t(
        \`Cartier Pasha Skeleton (42mm, ADLC/or, cal. 9611 MC squelettisé) : haute horlogerie carrée. Boîtier revêtu carbone ou or, mouvement squelettisé visible. Mouvement automatique 9611 MC 40h réserve. ~28 000–35 000€ (ADLC), ~65 000–80 000€ (or). Fond transparent, lunette Pasha carrée. Édition limitée, collection prestige. Très rare au second marché.\`,
        \`Cartier Pasha Skeleton (42mm, ADLC/gold, cal. 9611 MC skeletonized): square haute horlogerie. Carbon-coated or gold case, skeletonized visible movement. Automatic 9611 MC movement 40-hour reserve. ~€28,000–35,000 (ADLC), ~€65,000–80,000 (gold). Transparent caseback, square Pasha bezel. Limited edition, prestige collection. Very rare on secondary market.\`
      );} },

    // PANTHÈRE COLLECTION
    { id:'cartier_panthere_medium', kw:['panthère moyen','panthere 27','panthère 27mm','panthère quartz iconic','cartier panthere femme'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Panthère 27'; return t(
        \`Cartier Panthère 27mm (acier/or, quartz) : l'icône féminine depuis 1983. Boîtier 27mm acier ou or jaune, lunette polygonale signature panth. Mouvement quartz Cartier, 2 ans autonomie. ~3 500–5 000€ (acier), ~20 000–28 000€ (or). Cadran bleu soleillé ou argenté, index romains. Bracelet QuickSwitch cuir alligator ou acier. Références W25028B6, WGPN0006. Portée légendaire, feminin par essence.\`,
        \`Cartier Panthère 27mm (steel/gold, quartz): the feminine icon since 1983. 27mm stainless steel or yellow gold case, signature polygonal panther bezel. Cartier quartz movement, 2-year power reserve. ~€3,500–5,000 (steel), ~€20,000–28,000 (gold). Sunburst blue or silver dial, Roman indices. QuickSwitch alligator leather or steel bracelet. References W25028B6, WGPN0006. Legendary wear, feminine by essence.\`
      );} },

    { id:'cartier_panthere_small', kw:['panthère petit','panthere 22','panthère 22mm','panthère petite','cartier panthere small'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Panthère 22'; return t(
        \`Cartier Panthère 22mm (acier/or, quartz) : la délicate intemporelle. Boîtier 22mm acier ou or jaune, lunette polygonale fine. Mouvement quartz 2 ans autonomie. ~2 800–4 200€ (acier), ~15 000–22 000€ (or). Cadran blanc ou argent léger. Très féminin, poignets délicats. Bracelet cuir ou acier fin QuickSwitch. References W25014B6, WGPN0008. Porté discret, élégance minimaliste.\`,
        \`Cartier Panthère 22mm (steel/gold, quartz): the delicate timeless piece. 22mm stainless steel or yellow gold case, fine polygonal bezel. Quartz movement 2-year reserve. ~€2,800–4,200 (steel), ~€15,000–22,000 (gold). Light white or silver dial. Very feminine, delicate wrists. Fine leather or steel QuickSwitch bracelet. References W25014B6, WGPN0008. Discreet wear, minimalist elegance.\`
      );} },

    // DRIVE COLLECTION
    { id:'cartier_drive_auto', kw:['drive automatique','drive acier','drive coussin','drive auto','cartier drive mouvement'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Drive de Cartier'; return t(
        \`Cartier Drive de Cartier (41mm, acier, cal. 1904 MC) : l'outil coussin élégant. Boîtier 41mm acier inoxydable, forme coussin bombée caractéristique. Mouvement automatique 40h réserve, 100m étanchéité. ~7 500–9 000€ neuf. Cadran bleu, gris ou blanc, aiguilles épées. Bracelet cuir alligator ou acier QuickSwitch. Références W2DV0010 (acier). Design intemporel depuis 2010, très demandé second marché.\`,
        \`Cartier Drive de Cartier (41mm, steel, cal. 1904 MC): the elegant cushion tool. 41mm stainless steel case, characteristic domed cushion shape. Automatic movement 40-hour reserve, 100m water resistance. ~€7,500–9,000 new. Blue, gray or white dial, sword hands. Alligator leather or QuickSwitch steel bracelet. References W2DV0010 (steel). Timeless design since 2010, highly sought secondary market.\`
      );} },

    { id:'cartier_drive_moon', kw:['drive phases lune','drive moon phases','drive lune','drive astronomique','cartier drive calendar'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Drive de Cartier Moon Phases'; return t(
        \`Cartier Drive de Cartier Phases Lune (41mm, acier/or, cal. 1904 MC phases) : complexité élégante. Boîtier acier ou or jaune, forme coussin. Mouvement automatique phases lune intégrées. ~12 000–15 000€ (acier), ~55 000–70 000€ (or). Cadran argenté ou bleu, affichage lune en haut. Rare, collection spécialisée Cartier. Bracelet cuir premium alligator. Disponibilité boutique limitée.\`,
        \`Cartier Drive de Cartier Moon Phases (41mm, steel/gold, cal. 1904 MC phases): elegant complexity. Steel or yellow gold case, cushion shape. Automatic movement with integrated moon phases. ~€12,000–15,000 (steel), ~€55,000–70,000 (gold). Silver or blue dial, moon display at top. Rare, Cartier specialized collection. Premium alligator leather bracelet. Limited boutique availability.\`
      );} },

    // ROTONDE COLLECTION
    { id:'cartier_rotonde_skeleton', kw:['rotonde skeleton','rotonde squelette','rotonde ajourée','rotonde transparent','cartier rotonde ajouré'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde de Cartier Skeleton'; return t(
        \`Cartier Rotonde de Cartier Squelette (42mm, acier/or, cal. 9611 MC) : ronde haute horlogerie. Boîtier 42mm acier inoxydable ou or rose 18ct, mouvement squelettisé visible 360°. Mouvement automatique 40h réserve, 100m étanchéité. ~20 000–25 000€ (acier), ~65 000–85 000€ (or rose). Cadran squelettisé exposant roues et balancier. Bracelet cuir alligator cartier premium. Référence W1556209. Collection horologère, pièce de conversation.\`,
        \`Cartier Rotonde de Cartier Skeleton (42mm, steel/gold, cal. 9611 MC): round haute horlogerie. 42mm stainless steel or 18ct rose gold case, 360° visible skeletonized movement. Automatic movement 40-hour reserve, 100m water resistance. ~€20,000–25,000 (steel), ~€65,000–85,000 (rose gold). Skeletonized dial exposing wheels and balance. Premium Cartier alligator leather bracelet. Reference W1556209. Horological collection, conversation piece.\`
      );} },

    { id:'cartier_rotonde_repeater', kw:['rotonde minute repeater','rotonde sonnerie','rotonde repeater','rotonde carillon','cartier rotonde minute'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Minute Repeater'; return t(
        \`Cartier Rotonde de Cartier Sonnerie Minute (45mm, or rose, cal. 9410 MC) : la complication ultime. Boîtier 45mm or rose 18ct, mouvement sonnerie minute mécanique. Mouvement automatique haute horlogerie 50h réserve. 100m étanchéité. ~120 000–150 000€ neuf. Cadran bleu nuit, aiguilles or rose. Très rarement proposé, collection hautement spécialisée Cartier. Pièce de manufacture, production limitée annuelle.\`,
        \`Cartier Rotonde de Cartier Minute Repeater (45mm, rose gold, cal. 9410 MC): the ultimate complication. 45mm 18ct rose gold case, mechanical minute repeater chiming. High horological automatic movement 50-hour reserve. 100m water resistance. ~€120,000–150,000 new. Midnight blue dial, rose gold hands. Rarely offered, highly specialized Cartier collection. Manufacture piece, limited annual production.\`
      );} },

    { id:'cartier_rotonde_tourbillon', kw:['rotonde tourbillon','rotonde astrotourbillon','rotonde chrono tourbillon','cartier rotonde tourbillon'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Astrotourbillon'; return t(
        \`Cartier Rotonde de Cartier Astrotourbillon (45mm, platine, cal. 9450 MC) : la rotation perpétuelle. Boîtier 45mm platine Cartier, tourbillon équilibrant visible à 6h. Mouvement automatique 9450 MC 50h réserve. 100m étanchéité. ~85 000–110 000€ neuf. Cadran bleu ou noir, échappement visible. Bracelet cuir alligator noir couture cartier. Référence W1580050. Pièce haute manufacture, port exclusif.\`,
        \`Cartier Rotonde de Cartier Astrotourbillon (45mm, platinum, cal. 9450 MC): perpetual rotation. 45mm Cartier platinum case, balancing tourbillon visible at 6 o'clock. Automatic 9450 MC movement 50-hour reserve. 100m water resistance. ~€85,000–110,000 new. Blue or black dial, visible escapement. Black Cartier-stitched alligator leather bracelet. Reference W1580050. High manufacture piece, exclusive wear.\`
      );} },

    { id:'cartier_rotonde_perpetual', kw:['rotonde calendrier perpétuel','rotonde perpetual calendar','rotonde perpetuelle','cartier rotonde complex'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Rotonde Perpetual Calendar'; return t(
        \`Cartier Rotonde de Cartier Calendrier Perpétuel (45mm, platine, cal. 9420 MC) : les 128 ans programmées. Boîtier 45mm platine, calendrier mécanique perpétuel sans correction humaine jusqu'à 2100. Mouvement automatique 50h réserve, 100m étanchéité. ~95 000–125 000€ neuf. Cadran bleu roi, affichage date/mois/lune. Bracelet cuir alligator premium. Référence W1580052. Horlogerie suprême, pièce patrimoine.\`,
        \`Cartier Rotonde de Cartier Perpetual Calendar (45mm, platinum, cal. 9420 MC): 128 years programmed. 45mm platinum case, mechanical perpetual calendar requiring no human correction until 2100. Automatic movement 50-hour reserve, 100m water resistance. ~€95,000–125,000 new. Royal blue dial, date/month/moon display. Premium alligator leather bracelet. Reference W1580052. Supreme horology, heritage piece.\`
      );} },

    // OTHER COLLECTIONS
    { id:'cartier_cle_40', kw:['clé 40','cle 40','cartier cle','cle couronne clé','cartier clé automatique','cle key crown'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Clé de Cartier 40'; return t(
        \`Cartier Clé de Cartier 40mm (acier/or, cal. 1904 MC) : la couronne-clé révolutionnaire. Boîtier 40mm acier ou or jaune, couronne en forme de clé octogonale brevetée. Mouvement automatique 40h réserve, 100m étanchéité. ~8 000–10 000€ (acier), ~42 000–55 000€ (or). Cadran bleu/noir/argent, affichage classique. Bracelet QuickSwitch acier ou cuir. Références W2CL0002 (acier), WGCL0002 (or). Innovation design 2021, très recherchée collectors.\`,
        \`Cartier Clé de Cartier 40mm (steel/gold, cal. 1904 MC): the revolutionary key-shaped crown. 40mm stainless steel or yellow gold case, patented octagonal key-shaped crown. Automatic movement 40-hour reserve, 100m water resistance. ~€8,000–10,000 (steel), ~€42,000–55,000 (gold). Blue/black/silver dial, classic display. QuickSwitch steel or leather bracelet. References W2CL0002 (steel), WGCL0002 (gold). 2021 design innovation, highly sought by collectors.\`
      );} },

    { id:'cartier_ronde_solo', kw:['ronde solo','ronde simple','ronde classique','ronde cartier','cartier ronde montre'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Ronde Solo'; return t(
        \`Cartier Ronde Solo de Cartier (36mm, acier/or, cal. 1904 MC) : la rond pure. Boîtier 36mm acier inoxydable ou or jaune, forme ronde classique. Mouvement automatique 40h réserve, 100m étanchéité. ~6 500–8 000€ (acier), ~35 000–45 000€ (or). Cadran blanc, index romains appliqués. Bracelet cuir alligator noir ou acier QuickSwitch. Références W2RN0002 (acier), WGRN0002 (or). Classicisme intemporel, collection discrète.\`,
        \`Cartier Ronde Solo de Cartier (36mm, steel/gold, cal. 1904 MC): the pure round. 36mm stainless steel or yellow gold case, classical round shape. Automatic movement 40-hour reserve, 100m water resistance. ~€6,500–8,000 (steel), ~€35,000–45,000 (gold). White dial, applied Roman indices. Black alligator leather or QuickSwitch steel bracelet. References W2RN0002 (steel), WGRN0002 (gold). Timeless classicism, discreet collection.\`
      );} },

    { id:'cartier_masse_mysterieuse', kw:['masse mystérieuse','mystery movement','mouvement mystère','cartier mystère 2022','rotating mystery'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Masse Mystérieuse'; return t(
        \`Cartier Masse Mystérieuse de Cartier (45mm, or rose, cal. 9919 MC) : l'innovation révolutionnaire 2022. Boîtier 45mm or rose 18ct, aiguilles tournant en lévitation optique (vrai mécanisme horloger). Mouvement 9919 MC 40h réserve. 100m étanchéité. ~55 000–75 000€ neuf. Cadran intégralement transparent, mécanisme apparent. Innovation horlogère mondiale unique à Cartier. Bracelet cuir alligator premium. Très recherchée collectionneurs modernes.\`,
        \`Cartier Masse Mystérieuse de Cartier (45mm, rose gold, cal. 9919 MC): the revolutionary 2022 innovation. 45mm 18ct rose gold case, hands rotating in optical levitation (true watchmaking mechanism). 9919 MC movement 40-hour reserve. 100m water resistance. ~€55,000–75,000 new. Fully transparent dial, visible mechanism. Unique worldwide watchmaking innovation only at Cartier. Premium alligator leather bracelet. Highly sought by modern collectors.\`
      );} },

    { id:'cartier_privee', kw:['privée collection','cartier privee','privee reissue','privee revisited','cartier heritage revisited'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Cartier Privée'; return t(
        \`Cartier Collection Privée : archives revisitées (années 2010-2024). Éditions limitées réinterprétant les archives Cartier 1920-1980. Boîtiers acier ou or jaune 18ct, mouvements Cartier 1904-9611 MC. ~8 000–25 000€ selon modèle/année. Chaque pièce numérotée, étui presentation heritage Cartier. Exemples récents : Ronde Revisitée 1940, Santos Dumont 1927. Très recherchée collectors patrimoine. Disponibilité boutique exclusive, avant-vente abonnés.\`,
        \`Cartier Privée Collection: revisited archives (2010-2024). Limited editions reinterpreting Cartier archives 1920-1980. Stainless steel or 18ct yellow gold cases, Cartier 1904-9611 MC movements. ~€8,000–25,000 depending on model/year. Each numbered piece, heritage presentation case. Recent examples: 1940 Ronde Revisited, 1927 Santos Dumont. Highly sought by heritage collectors. Exclusive boutique availability, subscriber pre-sales.\`
      );} },

    { id:'cartier_baignoire', kw:['baignoire','baignoire ovale','baignoire 1912','cartier baignoire ovale','baignoire or'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Baignoire'; return t(
        \`Cartier Baignoire (40.55 x 28.6mm, acier/or, cal. 1904 MC) : l'ovale fondateur 1912. Boîtier acier inoxydable ou or jaune, forme ovale signature depuis création. Mouvement automatique 40h réserve, 30m étanchéité. ~7 500–9 500€ (acier), ~38 000–48 000€ (or). Cadran blanc email ou bleu, chiffres romains. Bracelet cuir alligator cartier noir. Référence W2BA0005 (acier contemporain). Pièce patrimoine, unisexe elegant.\`,
        \`Cartier Baignoire (40.55 x 28.6mm, steel/gold, cal. 1904 MC): the foundational oval 1912. Stainless steel or yellow gold case, signature oval shape since creation. Automatic movement 40-hour reserve, 30m water resistance. ~€7,500–9,500 (steel), ~€38,000–48,000 (gold). White enamel or blue dial, Roman numerals. Black Cartier alligator leather bracelet. Reference W2BA0005 (contemporary steel). Heritage piece, elegant unisex.\`
      );} },

    { id:'cartier_tonneau', kw:['tonneau','tonneau barrel','tonneau historique','cartier tonneau forme','tonneau vintage cartier'],
      r:()=>{ ctx.brand='Cartier'; ctx.model='Tonneau'; return t(
        \`Cartier Tonneau de Cartier (38 x 30mm, or rose, cal. 1904 MC) : la forme tonneau rare historique. Boîtier or rose 18ct, boîtier barillet caractéristique. Mouvement automatique 40h réserve, 30m étanchéité. ~45 000–58 000€ neuf (or rose). Cadran argenté ou bleu, aiguilles épées or rose. Bracelet cuir alligator marron cartier. Édition contemporaine 2023 très limitée. Collection heritage, relaunch patrimoine après 30 ans absence.\`,
        \`Cartier Tonneau de Cartier (38 x 30mm, rose gold, cal. 1904 MC): the rare historical barrel shape. 18ct rose gold case, characteristic barrel shape. Automatic movement 40-hour reserve, 30m water resistance. ~€45,000–58,000 new (rose gold). Silver or blue dial, rose gold sword hands. Brown Cartier alligator leather bracelet. 2023 contemporary limited edition. Heritage collection, heritage relaunch after 30 years absence.\`
      );} },
`;

// Insert the new entries
const updatedContent = content.slice(0, insertAfterIndex) + newEntries + content.slice(insertAfterIndex);

// Write the file
fs.writeFileSync(chatbotPath, updatedContent, 'utf8');

console.log('Successfully expanded Cartier entries in chatbot.js');
console.log(`Added ${newEntries.split('{ id:\'cartier').length - 1} new Cartier model entries`);
