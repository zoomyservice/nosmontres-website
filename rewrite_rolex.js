const fs = require('fs');
let code = fs.readFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', 'utf8');

// Helper: replace an entire KB entry by its id
function replaceEntry(id, newEntry) {
  // Match from { id:'xxx' to the closing },
  const re = new RegExp(`\\{ id:'${id}',.*?\\);?\\s*\\}\\s*\\},`, 's');
  if (re.test(code)) {
    code = code.replace(re, newEntry);
    return true;
  }
  return false;
}

// Helper: insert entry after an existing id
function insertAfter(afterId, newEntry) {
  const re = new RegExp(`(\\{ id:'${afterId}',.*?\\);?\\s*\\}\\s*\\},)`, 's');
  if (re.test(code)) {
    code = code.replace(re, '$1\n\n' + newEntry);
    return true;
  }
  return false;
}

let replaced = 0, inserted = 0;

// ═══════════════════════════════════════════════════════════════════════════
// ROLEX GENERAL — rich brand history
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_general',
`{ id:'rolex_general', kw:['rolex','rolex paris','couronne d or','crown logo','achat rolex','vente rolex','montre rolex','rolex occasion','rolex secondhand','rolex pre-owned','rolex luxe','marque rolex','histoire rolex','rolex histoire','rolex fondé','rolex 1905','hans wilsdorf','rolex suisse','rolex certifié','rolex watch','rolex watches','rolex models','rolex collection','what rolex','which rolex','rolex available','rolex in stock','rolex you have','rolex do you have','got any rolex','avez vous des rolex','rolex pas cher','cheap rolex','affordable rolex','rolex brand','the rolex','a rolex','rolex dealer','revendeur rolex','buy rolex','acheter rolex','rolex paris 8','rolex 75008'],
      r:()=>{ ctx.brand='Rolex'; const s=STOCK.filter(w=>w.brand==='Rolex'); return t(
        \`Rolex, fondée en 1905 à Londres par Hans Wilsdorf, est la marque horlogère la plus reconnue au monde. Manufacture intégrée à Genève, inventeur de l'Oyster (premier boîtier étanche, 1926), du rotor Perpetual (1931) et du Datejust (premier affichage date, 1945). Calibres exclusivement manufacture, certifiés Chronomètre Superlatif (-2/+2 sec/jour). Acier 904L (plus résistant que le 316L standard). Nous avons \${s.length} Rolex en stock :\\n\${s.slice(0,8).map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\${s.length>8?'...et plus. ':''}Dites-moi quel modèle vous intéresse !\`,
        \`Rolex, founded 1905 in London by Hans Wilsdorf, is the world's most recognised watch brand. Integrated manufacture in Geneva, inventor of the Oyster (first waterproof case, 1926), the Perpetual rotor (1931) and the Datejust (first date display, 1945). Exclusively manufacture calibres, Superlative Chronometer certified (-2/+2 sec/day). 904L steel (more resistant than standard 316L). We have \${s.length} Rolex in stock:\\n\${s.slice(0,8).map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\${s.length>8?'...and more. ':''}Tell me which model interests you!\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// SUBMARINER — rich model history
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_submariner',
`{ id:'rolex_submariner', kw:['submariner','sub','126610','116613','16800','submariner date','submariner no date','plongée','diving watch','diver','sousmarin','sous marin','116610','sub date','subno','ref 126610','ref 116613','acier or submariner','rolex submariner','rolex sub','the submariner','a submariner','submariner rolex','submariner watch','submariner model','submariner price','submariner cost','submariner available','tell me about submariner','parlez moi du submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('submariner')); return t(
        \`Le Submariner, lancé en 1953, est LA montre de plongée par excellence. Première montre étanche à 100m (aujourd'hui 300m). Lunette tournante unidirectionnelle céramique Cerachrom (depuis 2010), verre saphir, couronne Triplock. Génération actuelle : boîtier Oyster 41mm (avant 2020 : 40mm), calibre 3235 (70h réserve de marche), bracelet Oyster + Glidelock.\\n\\nNos Submariner en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nLe Submariner est le modèle Rolex le plus iconique avec le Daytona. Forte valeur de revente. Quel Submariner vous intéresse ?\`,
        \`The Submariner, launched 1953, is THE quintessential dive watch. First watch water-resistant to 100m (now 300m). Unidirectional rotating Cerachrom ceramic bezel (since 2010), sapphire crystal, Triplock crown. Current generation: 41mm Oyster case (pre-2020: 40mm), calibre 3235 (70h power reserve), Oyster bracelet + Glidelock.\\n\\nOur Submariners in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nThe Submariner is the most iconic Rolex alongside the Daytona. Strong resale value. Which Submariner interests you?\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// 126610LV — THE FIX: comprehensive Hulk/Kermit response
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_126610lv',
`{ id:'rolex_126610lv', kw:['126610lv','hulk','hulk rolex','submariner hulk','sub hulk','vert submariner','green submariner','submariner vert','126610 lv','kermit rolex','new hulk','rolex submariner hulk','rolex submariner vert','rolex submariner green','rolex green','rolex hulk','rolex kermit','submariner date hulk','submariner date vert','submariner date green','starbucks','starbucks submariner','ref 126610lv','green dial submariner','cadran vert submariner'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const w=STOCK.find(s=>s.ref==='126610LV'); return t(
        \`**Rolex Submariner Date réf. 126610LV** — surnommée "Kermit" (ou "Starbucks")\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 41mm, acier Oystersteel (904L), fond vissé\\n• **Lunette** : Cerachrom céramique verte, insert graduations moulées, tournante unidirectionnelle 60 min\\n• **Cadran** : Noir laqué, index Chromalight (luminescence bleue longue durée)\\n• **Calibre** : 3235 manufacture Rolex, 28 800 alt/h (4Hz), Chronomètre Superlatif (-2/+2 sec/jour)\\n• **Réserve de marche** : 70 heures (environ 3 jours)\\n• **Étanchéité** : 300 mètres / 1 000 pieds\\n• **Bracelet** : Oyster 3 maillons + fermoir Oysterlock + extension Glidelock (±5mm)\\n\\n**Histoire** : La lunette verte sur fond noir est un look introduit en 2003 sur la réf. 16610LV ("Kermit" originale, marquant les 50 ans du Submariner). La 126610LV (2020) est la version 41mm avec le nouveau calibre 3235. À ne pas confondre avec la 116610LV "Hulk" (cadran ET lunette verts, 2010-2020).\\n\\n**Marché** : Très demandée, valeur stable/croissante. Un incontournable de toute collection Rolex.\`,
        \`**Rolex Submariner Date ref. 126610LV** — nicknamed "Kermit" (or "Starbucks")\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 41mm, Oystersteel (904L), screw-down caseback\\n• **Bezel**: Green Cerachrom ceramic, moulded graduations, 60-min unidirectional rotating\\n• **Dial**: Black lacquer, Chromalight indices (long-lasting blue luminescence)\\n• **Calibre**: 3235 Rolex manufacture, 28,800 vph (4Hz), Superlative Chronometer (-2/+2 sec/day)\\n• **Power reserve**: 70 hours (approx. 3 days)\\n• **Water resistance**: 300 metres / 1,000 feet\\n• **Bracelet**: Oyster 3-link + Oysterlock clasp + Glidelock extension (±5mm)\\n\\n**History**: The green bezel on black dial was introduced in 2003 on ref. 16610LV (original "Kermit", marking 50 years of the Submariner). The 126610LV (2020) is the 41mm version with the new 3235 calibre. Not to be confused with the 116610LV "Hulk" (green dial AND bezel, 2010-2020).\\n\\n**Market**: Highly sought-after, stable/rising value. A must-have in any Rolex collection.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// 126500LN — Daytona Panda comprehensive
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_126500ln',
`{ id:'rolex_126500ln', kw:['126500ln','daytona panda','panda acier','daytona acier blanc','126500 ln','daytona blanc noir','new daytona','daytona 2021','daytona cadran blanc','ceramic daytona','daytona céramique','rolex daytona panda','rolex panda','rolex daytona acier','rolex daytona steel','rolex daytona blanc','rolex daytona white','ref 126500ln','cosmograph daytona panda','panda rolex'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const w=STOCK.find(s=>s.ref==='126500LN'); return t(
        \`**Rolex Cosmograph Daytona réf. 126500LN** — "Panda" (cadran blanc, sous-compteurs noirs)\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel 904L\\n• **Lunette** : Cerachrom céramique noire avec échelle tachymétrique gravée et laquée platine\\n• **Cadran** : Blanc laqué "Panda", 3 sous-compteurs noirs (secondes, 30 min, 12h)\\n• **Calibre** : 4131 manufacture Rolex (introduit 2023), 28 800 alt/h, Chronomètre Superlatif\\n• **Réserve de marche** : 72 heures\\n• **Étanchéité** : 100 mètres\\n• **Bracelet** : Oyster + fermoir Oysterlock + système Easylink (5mm de confort)\\n\\n**Histoire** : Le Cosmograph Daytona est né en 1963, nommé d'après le circuit de Daytona en Floride. Le surnom "Panda" vient du contraste cadran blanc/sous-compteurs noirs. La réf. 126500LN (2023) remplace la 116500LN avec le nouveau cal. 4131. C'est le chronographe le plus demandé au monde — liste d'attente de plusieurs années en boutique officielle.\\n\\n**Marché** : La Daytona Panda acier est le Rolex sport le plus convoité. Forte appréciation.\`,
        \`**Rolex Cosmograph Daytona ref. 126500LN** — "Panda" (white dial, black subdials)\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, Oystersteel 904L\\n• **Bezel**: Black Cerachrom ceramic with engraved tachymeter scale, platinum-filled\\n• **Dial**: White lacquer "Panda", 3 black subdials (seconds, 30 min, 12h)\\n• **Calibre**: 4131 Rolex manufacture (introduced 2023), 28,800 vph, Superlative Chronometer\\n• **Power reserve**: 72 hours\\n• **Water resistance**: 100 metres\\n• **Bracelet**: Oyster + Oysterlock clasp + Easylink comfort extension (5mm)\\n\\n**History**: The Cosmograph Daytona was born in 1963, named after the Daytona circuit in Florida. The "Panda" nickname comes from the white dial/black subdials contrast. Ref. 126500LN (2023) replaces the 116500LN with the new cal. 4131. It is the world's most sought-after chronograph — years-long waitlists at official boutiques.\\n\\n**Market**: The steel Panda Daytona is the most coveted Rolex sport watch. Strong appreciation.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// DAYTONA — rich model entry
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_daytona',
`{ id:'rolex_daytona', kw:['daytona','rolex daytona','cosmograph','paul newman','chronographe rolex','126500','126505','or rose daytona','steel daytona','daytona acier','daytona gold','daytona noir','daytona cadran','ref 126500','ref 126505','116500','116520','116503','tell me about daytona','parlez moi du daytona'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('daytona')); return t(
        \`Le **Cosmograph Daytona**, lancé en 1963, est le chronographe le plus iconique de l'horlogerie. Nommé d'après le circuit de Daytona Beach, Floride. La montre de Paul Newman (vendu 17,8M$ aux enchères en 2017). Boîtier Oyster 40mm, lunette tachymétrique, calibre manufacture 4131 (72h réserve). Étanche 100m.\\n\\nVariantes : acier (réf. 126500LN, le plus convoité), or rose (réf. 126505), platine (réf. 126506 cadran météorite), acier/or "Rolesor" (réf. 126503).\\n\\nNos Daytona en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nLa Daytona est LA valeur refuge Rolex — forte demande, longues listes d'attente.\`,
        \`The **Cosmograph Daytona**, launched 1963, is horology's most iconic chronograph. Named after the Daytona Beach circuit, Florida. Paul Newman's watch (sold for $17.8M at auction in 2017). 40mm Oyster case, tachymeter bezel, manufacture calibre 4131 (72h reserve). 100m water resistant.\\n\\nVariants: steel (ref. 126500LN, most coveted), rose gold (ref. 126505), platinum (ref. 126506 meteorite dial), steel/gold "Rolesor" (ref. 126503).\\n\\nOur Daytonas in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nThe Daytona is THE Rolex safe-haven investment — high demand, long waitlists.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// 126505 — Daytona Rose Gold
// ═══════════════════════════════════════════════════════════════════════════
insertAfter('rolex_126500ln',
`    { id:'rolex_126505', kw:['126505','daytona or rose','daytona rose gold','daytona everose','ref 126505','rolex daytona or rose','rolex daytona rose gold','cosmograph or rose','daytona gold','daytona chocolat','chocolate daytona','daytona marron','brown daytona'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona'; const w=STOCK.find(s=>s.ref==='126505'); return t(
        \`**Rolex Cosmograph Daytona réf. 126505** — Or rose Everose 18 carats\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, or Everose 18ct (alliage exclusif Rolex résistant à la décoloration)\\n• **Lunette** : Cerachrom céramique marron chocolat, échelle tachymétrique\\n• **Cadran** : Chocolat/noir, sous-compteurs or rose\\n• **Calibre** : 4131, Chronomètre Superlatif, 72h réserve\\n• **Bracelet** : Oysterflex (caoutchouc haute performance avec âme titane-nickel)\\n\\n**Particularité** : L'or Everose est un alliage breveté par Rolex contenant du platine, garantissant que la couleur rose ne s'altère pas avec le temps. La lunette marron chocolat est exclusive aux versions or rose.\\n\\n**Marché** : ~45 000–55 000€ selon état et année.\`,
        \`**Rolex Cosmograph Daytona ref. 126505** — 18ct Everose gold\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, 18ct Everose gold (exclusive Rolex alloy resistant to fading)\\n• **Bezel**: Chocolate brown Cerachrom ceramic, tachymeter scale\\n• **Dial**: Chocolate/black, rose gold subdials\\n• **Calibre**: 4131, Superlative Chronometer, 72h reserve\\n• **Bracelet**: Oysterflex (high-performance rubber with titanium-nickel core)\\n\\n**Unique feature**: Everose gold is a Rolex-patented alloy containing platinum, ensuring the rose colour never fades. The chocolate brown bezel is exclusive to rose gold versions.\\n\\n**Market**: ~€45,000–55,000 depending on condition and year.\`
      );} },`) && inserted++;

// ═══════════════════════════════════════════════════════════════════════════
// GMT-MASTER II — rich model entry
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_gmt',
`{ id:'rolex_gmt', kw:['gmt','gmt master','gmt-master','gmt ii','rolex gmt','116710','126710','pepsi','batman','sprite','jubilée gmt','gmt bicolore','gmt rouge bleu','gmt 2 fuseaux','deux fuseaux','second timezone','gmt master ii black','gmt master ii sprite','gmt vintage','16710','gmt acier','tell me about gmt','parlez moi du gmt'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('gmt')); return t(
        \`Le **GMT-Master II** est la montre de voyage par excellence, conçue initialement en 1955 pour les pilotes Pan Am. Permet de lire simultanément 2 fuseaux horaires grâce à l'aiguille 24h et la lunette tournante bidirectionnelle.\\n\\nGénération actuelle (2018+) : boîtier Oyster 40mm, lunette Cerachrom bicolore en une seule pièce de céramique, calibre 3285 (70h réserve). Surnoms célèbres : **Pepsi** (rouge/bleu, réf. 126710BLRO), **Batman** (noir/bleu, réf. 126710BLNR), **Sprite** (vert/noir, réf. 126720VTNR couronne à gauche).\\n\\nNos GMT en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nModèle polyvalent, porté aussi bien en voyage qu'au quotidien.\`,
        \`The **GMT-Master II** is the ultimate travel watch, originally designed in 1955 for Pan Am pilots. Allows reading 2 time zones simultaneously via the 24h hand and bidirectional rotating bezel.\\n\\nCurrent generation (2018+): 40mm Oyster case, two-colour Cerachrom bezel in a single ceramic piece, calibre 3285 (70h reserve). Famous nicknames: **Pepsi** (red/blue, ref. 126710BLRO), **Batman** (black/blue, ref. 126710BLNR), **Sprite** (green/black, ref. 126720VTNR left-hand crown).\\n\\nOur GMTs in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nVersatile model, worn for travel and daily wear alike.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// 126710GRNR — GMT Sprite comprehensive
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_126710grnr',
`{ id:'rolex_126710grnr', kw:['126710grnr','sprite','gmt sprite','vert rouge','red green gmt','126710 grnr','sprite rolex','sprite gmt','gmt rouge vert','jubilé gmt sprite','rolex gmt sprite','rolex sprite','gmt master sprite','gmt master vert noir','green black gmt'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='126710GRNR'); return t(
        \`**Rolex GMT-Master II réf. 126710GRNR** — "Sprite"\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel 904L\\n• **Lunette** : Cerachrom céramique bicolore vert/noir (deux couleurs en un seul bloc de céramique — prouesse technique Rolex)\\n• **Cadran** : Noir, index Chromalight\\n• **Calibre** : 3285, 28 800 alt/h, 70h réserve, Chronomètre Superlatif\\n• **Bracelet** : Jubilee 5 maillons + fermoir Oysterclasp\\n• **Fonctions** : Heures, minutes, secondes, date, 2e fuseau horaire (aiguille 24h)\\n\\n**Particularité** : Combinaison vert/noir unique dans la gamme. La lunette bicolore céramique nécessite un procédé de fabrication breveté (coloration partielle d'un bloc monolithique).\\n\\n**Marché** : ~17 000–20 000€. Forte demande, faible disponibilité en boutique officielle.\`,
        \`**Rolex GMT-Master II ref. 126710GRNR** — "Sprite"\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, Oystersteel 904L\\n• **Bezel**: Green/black Cerachrom ceramic (two colours in one ceramic block — Rolex technical feat)\\n• **Dial**: Black, Chromalight indices\\n• **Calibre**: 3285, 28,800 vph, 70h reserve, Superlative Chronometer\\n• **Bracelet**: Jubilee 5-link + Oysterclasp\\n• **Functions**: Hours, minutes, seconds, date, 2nd time zone (24h hand)\\n\\n**Unique feature**: Green/black is unique in the range. The two-tone ceramic bezel requires a patented process (partial colouring of a monolithic block).\\n\\n**Market**: ~€17,000–20,000. High demand, low availability at official boutiques.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// DATEJUST — rich model entry
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_datejust',
`{ id:'rolex_datejust', kw:['datejust','rolex datejust','date just','126334','126300','16234','datejust 41','datejust 36','wimbledon','mint','jubilé','jubilee','oyster bracelet','rolesor','datejust acier','datejust or','datejust cadran','fluted bezel','cannelée','datejust vintage','ref 126334','ref 126300','datejust homme','men datejust','tell me about datejust','parlez moi du datejust'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('datejust')&&!w.model.toLowerCase().includes('lady')); return t(
        \`Le **Datejust**, lancé en 1945, est le pilier de la gamme Rolex — première montre-bracelet automatique avec affichage de la date par guichet. C'est la montre la plus polyvalente de la marque : aussi à l'aise avec un costume qu'en casual.\\n\\n**Tailles** : 36mm (classique) et 41mm (moderne). **Lunettes** : lisse, cannelée (or blanc), diamants. **Bracelets** : Oyster (sportif) ou Jubilee (élégant). **Cadrans** : +30 options (bleu, noir, ardoise, vert "Mint", Wimbledon slate/vert).\\n\\nCalibre 3235 (70h réserve), étanche 100m, certifié Chronomètre Superlatif.\\n\\nNos Datejust en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nLe Datejust est la porte d'entrée idéale dans l'univers Rolex.\`,
        \`The **Datejust**, launched 1945, is the cornerstone of the Rolex range — the first automatic wristwatch with a date display window. It's the brand's most versatile watch: equally at home with a suit or casual wear.\\n\\n**Sizes**: 36mm (classic) and 41mm (modern). **Bezels**: smooth, fluted (white gold), diamond-set. **Bracelets**: Oyster (sporty) or Jubilee (elegant). **Dials**: 30+ options (blue, black, slate, green "Mint", Wimbledon slate/green).\\n\\nCalibre 3235 (70h reserve), 100m water resistant, Superlative Chronometer certified.\\n\\nOur Datejusts in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\\n\\nThe Datejust is the ideal entry point into the Rolex universe.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// 116613LB — Submariner Two-Tone Blue
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_116613lb',
`{ id:'rolex_116613lb', kw:['116613lb','submariner bicolore','submariner acier or','rolesor submariner','sub gold steel','deux tons submariner','two tone submariner','116613 lb','116613 acier or','rolex submariner bicolore','rolex submariner acier or','rolex submariner two tone','submariner blue gold','submariner bleu or','submariner rolesor'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner'; const w=STOCK.find(s=>s.ref==='116613LB'); return t(
        \`**Rolex Submariner Date réf. 116613LB** — Acier/Or jaune "Rolesor" bleu\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel + or jaune 18ct (Rolesor)\\n• **Lunette** : Cerachrom céramique bleue, insert or jaune\\n• **Cadran** : Bleu soleil (sunburst), index or appliqués\\n• **Calibre** : 3135, 48h réserve de marche\\n• **Étanchéité** : 300 mètres\\n• **Bracelet** : Oyster bicolore acier/or + Glidelock\\n\\n**Particularité** : La combinaison bleu/or est un classique Rolex. La 116613LB est la version 40mm (génération pré-2020). Le bleu du cadran et de la lunette change de nuance selon la lumière — signature de la finition Rolex.\\n\\n**Marché** : ~11 000–14 000€. Excellente valeur dans la gamme bicolore Rolex.\`,
        \`**Rolex Submariner Date ref. 116613LB** — Steel/Yellow gold "Rolesor" blue\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, Oystersteel + 18ct yellow gold (Rolesor)\\n• **Bezel**: Blue Cerachrom ceramic, yellow gold insert\\n• **Dial**: Blue sunburst, applied gold indices\\n• **Calibre**: 3135, 48h power reserve\\n• **Water resistance**: 300 metres\\n• **Bracelet**: Two-tone Oyster steel/gold + Glidelock\\n\\n**Unique feature**: The blue/gold combination is a Rolex classic. The 116613LB is the 40mm version (pre-2020 generation). The blue of the dial and bezel shifts in nuance with light — a signature Rolex finish.\\n\\n**Market**: ~€11,000–14,000. Excellent value in the Rolex two-tone range.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// EXPLORER — rich entry
// ═══════════════════════════════════════════════════════════════════════════
if (replaceEntry('rolex_explorer',
`{ id:'rolex_explorer', kw:['explorer','explorer ii','226570','216570','214270','114270','explorer 2','explorer ii blanc','orange hand','alpiniste','explorateur','montagne','mountain','exploration','safari dial','ref 226570','rolex explorer','tell me about explorer','parlez moi de l explorer','explorer rolex','explorer watch','explorer 1','explorer i','124270','rolex explorer ii'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('explorer')); return t(
        \`L'**Explorer**, lancé en 1953, commémore l'ascension de l'Everest par Edmund Hillary et Tenzing Norgay avec une Rolex au poignet. C'est la quintessence de la montre d'aventure.\\n\\n**Explorer I** (réf. 124270) : 36mm, cadran noir 3-6-9, calibre 3230 (70h), 100m. La Rolex la plus épurée — zéro complication, lisibilité maximale. Marché ~7 000–8 000€.\\n\\n**Explorer II** (réf. 226570) : 42mm, aiguille 24h orange indépendante (AM/PM), cadran blanc ou noir, calibre 3285 (70h), 100m. Conçue pour les spéléologues et explorateurs polaires.\\n\\n\${s.length?\`Nos Explorer en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\`:'Contactez-nous pour disponibilité.'}\\n\\nL'Explorer est la Rolex la plus discrète et sous-estimée — parfaite pour un quotidien sans frime.\`,
        \`The **Explorer**, launched 1953, commemorates Edmund Hillary and Tenzing Norgay's Everest ascent wearing a Rolex. It is the quintessential adventure watch.\\n\\n**Explorer I** (ref. 124270): 36mm, black 3-6-9 dial, calibre 3230 (70h), 100m. The purest Rolex — zero complications, maximum legibility. Market ~€7,000–8,000.\\n\\n**Explorer II** (ref. 226570): 42mm, independent orange 24h hand (AM/PM), white or black dial, calibre 3285 (70h), 100m. Designed for speleologists and polar explorers.\\n\\n\${s.length?\`Our Explorers in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\`:'Contact us for availability.'}\\n\\nThe Explorer is the most discreet and underrated Rolex — perfect for understated daily wear.\`
      );} },`)) replaced++;

// ═══════════════════════════════════════════════════════════════════════════
// Additional new reference entries for Rolex
// ═══════════════════════════════════════════════════════════════════════════

// 116710LN — GMT Black
insertAfter('rolex_126710grnr',
`    { id:'rolex_116710ln', kw:['116710ln','116710','gmt black','gmt noir','gmt master noir','all black gmt','rolex gmt black','rolex gmt noir','gmt master ii black ceramic','gmt master ii noir'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='116710LN'); return t(
        \`**Rolex GMT-Master II réf. 116710LN** — Lunette céramique noire\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, acier Oystersteel\\n• **Lunette** : Cerachrom céramique noire, échelle 24h\\n• **Cadran** : Noir, index Chromalight\\n• **Calibre** : 3186, 48h réserve\\n• **Bracelet** : Oyster 3 maillons\\n\\n**Particularité** : Première GMT-Master II avec lunette céramique (2007). Version discrète et polyvalente — pas de bicolore sur la lunette, look tout noir élégant. Génération pré-2018 (remplacée par la 126710).\\n\\n**Marché** : ~11 000–13 000€. Bonne valeur pour une GMT céramique.\`,
        \`**Rolex GMT-Master II ref. 116710LN** — Black ceramic bezel\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, Oystersteel\\n• **Bezel**: Black Cerachrom ceramic, 24h scale\\n• **Dial**: Black, Chromalight indices\\n• **Calibre**: 3186, 48h reserve\\n• **Bracelet**: Oyster 3-link\\n\\n**Unique feature**: First GMT-Master II with ceramic bezel (2007). Discreet and versatile — no two-tone bezel, elegant all-black look. Pre-2018 generation (replaced by 126710).\\n\\n**Market**: ~€11,000–13,000. Good value for a ceramic GMT.\`
      );} },`) && inserted++;

// 16710 — GMT Vintage
insertAfter('rolex_116710ln',
`    { id:'rolex_16710', kw:['16710','gmt vintage','old gmt','gmt master vintage','coke','coke gmt','pepsi vintage','rolex gmt vintage','gmt aluminium','gmt alu'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II'; const w=STOCK.find(s=>s.ref==='16710'); return t(
        \`**Rolex GMT-Master II réf. 16710** — Vintage (1989–2007)\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : Oyster 40mm, acier 904L\\n• **Lunette** : Aluminium (pas céramique) — disponible en Pepsi (bleu/rouge), Coke (noir/rouge) ou noir\\n• **Cadran** : Noir, index lumineux (tritium ou Luminova selon année)\\n• **Calibre** : 3185/3186 (selon année), 48h réserve\\n• **Bracelet** : Oyster ou Jubilee\\n\\n**Particularité** : Dernière GMT avec lunette aluminium. Les inserts aluminium se patinent avec le temps, ajoutant du charme vintage. Les versions "Pepsi" et "Coke" sont très recherchées des collectionneurs.\\n\\n**Marché** : ~8 500–12 000€ selon insert et état. Excellente pièce collector.\`,
        \`**Rolex GMT-Master II ref. 16710** — Vintage (1989–2007)\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: Oyster 40mm, 904L steel\\n• **Bezel**: Aluminium (not ceramic) — available in Pepsi (blue/red), Coke (black/red) or black\\n• **Dial**: Black, luminous indices (tritium or Luminova depending on year)\\n• **Calibre**: 3185/3186 (depending on year), 48h reserve\\n• **Bracelet**: Oyster or Jubilee\\n\\n**Unique feature**: Last GMT with aluminium bezel. Aluminium inserts develop patina over time, adding vintage charm. "Pepsi" and "Coke" versions are highly sought by collectors.\\n\\n**Market**: ~€8,500–12,000 depending on insert and condition. Excellent collector piece.\`
      );} },`) && inserted++;

// 326935 — Yacht-Master comprehensive
if (replaceEntry('rolex_326935',
`{ id:'rolex_326935', kw:['326935','yacht master 42','ym 42','everose yacht','oysterflex yacht','yacht master everose','ym everose','326935 prix','rolex yacht master 42','rolex yacht master or rose','rolex ym'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master'; const w=STOCK.find(s=>s.ref==='326935'); return t(
        \`**Rolex Yacht-Master 42 réf. 326935** — Or Everose 18ct\\n\\n\${w?\`📍 **En stock : \${fmt(w.price)}**\\n\\n\`:''}• **Boîtier** : 42mm, or Everose 18ct (alliage breveté Rolex anti-décoloration)\\n• **Lunette** : Bidirectionnelle, or Everose mat sablé avec finition noire Cerachrom\\n• **Cadran** : Noir intense, aiguilles et index or rose\\n• **Calibre** : 3235, 70h réserve, Chronomètre Superlatif\\n• **Bracelet** : Oysterflex (caoutchouc haute performance avec âme métal + amortisseurs longitudinaux)\\n• **Étanchéité** : 100 mètres\\n\\n**Particularité** : Le Yacht-Master 42 est le plus grand et le plus exclusif de la gamme YM. Le bracelet Oysterflex, introduit en 2015, combine le confort du caoutchouc avec la robustesse d'une âme en alliage de titane et nickel.\\n\\n**Marché** : ~32 000–38 000€. Le Rolex sport le plus "bling" — or massif + bracelet sport.\`,
        \`**Rolex Yacht-Master 42 ref. 326935** — 18ct Everose gold\\n\\n\${w?\`📍 **In stock: \${fmt(w.price)}**\\n\\n\`:''}• **Case**: 42mm, 18ct Everose gold (Rolex patented anti-fading alloy)\\n• **Bezel**: Bidirectional, sandblasted matte Everose gold with black Cerachrom finish\\n• **Dial**: Deep black, rose gold hands and indices\\n• **Calibre**: 3235, 70h reserve, Superlative Chronometer\\n• **Bracelet**: Oysterflex (high-performance rubber with metal core + longitudinal cushions)\\n• **Water resistance**: 100 metres\\n\\n**Unique feature**: The Yacht-Master 42 is the largest and most exclusive in the YM range. The Oysterflex bracelet, introduced 2015, combines rubber comfort with a titanium-nickel alloy core.\\n\\n**Market**: ~€32,000–38,000. The flashiest Rolex sport — solid gold + sport strap.\`
      );} },`)) replaced++;

// OP 124300 — Oyster Perpetual 41 Red
if (replaceEntry('rolex_oyster_perpetual',
`{ id:'rolex_oyster_perpetual', kw:['oyster perpetual','op','124300','124340','124310','op 41','op 36','op 41 rouge','red dial','couleur dial','lac candy','candy color','126000','ref 124300','oyster perpetual red','oyster perpetual coral','rolex oyster perpetual','tell me about oyster perpetual','rolex op'],
      r:()=>{ ctx.brand='Rolex'; ctx.model='Oyster Perpetual'; const s=STOCK.filter(w=>w.model.toLowerCase().includes('oyster')); return t(
        \`L'**Oyster Perpetual**, la Rolex la plus classique — l'essence même de la marque. Successeur direct de l'Oyster originale de 1926.\\n\\n**OP 41** (réf. 124300) : 41mm, cadrans couleurs vives (rouge corail, turquoise, vert, jaune — très convoités). Cal. 3230 (70h réserve), 100m. Les cadrans "Stella" colorés ont explosé en valeur en 2020-2021 — le rouge et le turquoise se vendent bien au-dessus du retail.\\n\\n**OP 36** (réf. 126000) : 36mm, même calibre, taille classique.\\n\\nPas de date, pas de complication — juste l'heure, dans un boîtier Oyster pur. Lunette lisse bombée. C'est la Rolex la plus accessible ET celle qui a vu la plus forte appréciation récente.\\n\\n\${s.length?\`Nos OP en stock :\\n\${s.map(w=>\`• \${w.model} réf. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\`:'Contactez-nous.'}\`,
        \`The **Oyster Perpetual**, the most classic Rolex — the very essence of the brand. Direct successor to the original 1926 Oyster.\\n\\n**OP 41** (ref. 124300): 41mm, vibrant coloured dials (coral red, turquoise, green, yellow — highly coveted). Cal. 3230 (70h reserve), 100m. The "Stella" coloured dials exploded in value in 2020-2021 — red and turquoise sell well above retail.\\n\\n**OP 36** (ref. 126000): 36mm, same calibre, classic size.\\n\\nNo date, no complication — just the time, in a pure Oyster case. Smooth domed bezel. It's the most accessible Rolex AND the one that saw the strongest recent appreciation.\\n\\n\${s.length?\`Our OPs in stock:\\n\${s.map(w=>\`• \${w.model} ref. **\${w.ref}** → \${fmt(w.price)}\`).join('\\n')}\`:'Contact us.'}\`
      );} },`)) replaced++;

console.log('Replaced: ' + replaced + ' entries');
console.log('Inserted: ' + inserted + ' new entries');

fs.writeFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', code);
console.log('Lines: ' + code.split('\n').length);
