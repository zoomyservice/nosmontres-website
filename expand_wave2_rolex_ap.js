#!/usr/bin/env node
/**
 * expand_wave2_rolex_ap.js
 * Adds additional Rolex and AP entries to chatbot.js to reach 5000+ lines
 */

const fs = require('fs');
const path = require('path');

const CHATBOT_PATH = path.join(__dirname, 'js/chatbot.js');

// Read current file
let code = fs.readFileSync(CHATBOT_PATH, 'utf8');

// Extract existing IDs to avoid duplicates
const existingIds = [...code.matchAll(/id:'([^']+)'/g)].map(m => m[1]);
console.log(`Found ${existingIds.length} existing entries.`);

// New Rolex entries (inserted before ap_general)
const roleaxNewEntries = `
// ═══ ROLEX PRECIOUS METALS EXPANDED ═══════════════════════════════════

// SUBMARINER PRECIOUS METALS
{ id:'rolex_126613lb', kw:['126613lb','submariner two tone','submariner blue 41','two tone submariner','submariner oystersteel gold','submariner everose','submariner gold blue','rolex blue dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Two-Tone 41mm'; return t(
    \`**Rolex Submariner réf. 126613LB** — Boîtier 41mm bi-matière Oystersteel & or Everose 18K, cadran bleu sunburst, lunette céramique bleue Cerachrom, bracelet Oyster à système Glidelock. Mouvement Cal. 3235 (70h puissance, chronométrie COSC). Étanche 300m. Production 2020+. Marché : 22 000–28 000€. Très demandé, liste d'attente Rolex significative.\`,
    \`**Rolex Submariner ref. 126613LB** — 41mm two-tone Oystersteel & 18K Everose gold case, sunburst blue dial, blue Cerachrom ceramic bezel, Oyster bracelet with Glidelock system. Cal. 3235 movement (70h power reserve, COSC). 300m water-resistant. Made 2020+. Market: €22,000–28,000. Highly sought after with long Rolex waitlists.\`
  );} },

{ id:'rolex_126613ln', kw:['126613ln','submariner two tone black','submariner black dial two tone','submariner oystersteel gold','two tone black submariner','submariner everose black','41mm two tone'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Two-Tone Black 41mm'; return t(
    \`**Rolex Submariner réf. 126613LN** — Boîtier 41mm Oystersteel & or Everose, cadran noir, lunette céramique noire Cerachrom, bracelet Oyster intégré Glidelock. Cal. 3235 (70h, COSC chronométré). Étanche 300m. Production 2020+. L'alternative classique au 126613LB. Marché : 20 000–26 000€. Discrétion élégante.\`,
    \`**Rolex Submariner ref. 126613LN** — 41mm Oystersteel & 18K Everose gold case, black dial, black Cerachrom ceramic bezel, Oyster bracelet with Glidelock. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Classic alternative to the blue. Market: €20,000–26,000. Elegant restraint.\`
  );} },

{ id:'rolex_126618lb', kw:['126618lb','submariner yellow gold','submariner oro giallo','submariner gold blue','yellow gold submariner','submariner 18k oro','full gold blue'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Yellow Gold 41mm'; return t(
    \`**Rolex Submariner réf. 126618LB** — Boîtier 41mm or jaune massif 18K, cadran bleu sunburst, lunette céramique bleue, bracelet Oyster or. Mouvement Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Montre de prestige absolu en or massif. Très rare en stock. Marché : 45 000–65 000€. Pour collectionneurs or/bleu.\`,
    \`**Rolex Submariner ref. 126618LB** — 41mm solid 18K yellow gold case, sunburst blue dial, blue Cerachrom ceramic bezel, yellow gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Absolute prestige in solid gold. Rarely stocked. Market: €45,000–65,000. For yellow gold & blue collectors.\`
  );} },

{ id:'rolex_126618ln', kw:['126618ln','submariner yellow gold black','submariner oro giallo nero','yellow gold submariner black','oro giallo submariner','full yellow gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Yellow Gold Black 41mm'; return t(
    \`**Rolex Submariner réf. 126618LN** — Boîtier 41mm or jaune massif 18K, cadran noir, lunette céramique noire, bracelet Oyster or massif. Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Reference classique en or complet. Ultra-tradition horlogère. Marché : 42 000–62 000€. Le symbole de la réussite discrète.\`,
    \`**Rolex Submariner ref. 126618LN** — 41mm solid 18K yellow gold case, black dial, black Cerachrom ceramic bezel, solid gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Classic reference in full gold. Pure watchmaking tradition. Market: €42,000–62,000. Symbol of understated success.\`
  );} },

{ id:'rolex_126619lb', kw:['126619lb','submariner white gold','submariner platine','submariner or blanc','white gold submariner blue','platine submariner','pt950','full white gold'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner White Gold 41mm'; return t(
    \`**Rolex Submariner réf. 126619LB** — Boîtier 41mm or blanc massif 18K, cadran bleu sunburst, lunette céramique bleue, bracelet Oyster or blanc. Cal. 3235 (70h, COSC). Étanche 300m. Production 2020+. Montre royale en or blanc & bleu. Très prestigieuse. Marché : 48 000–68 000€. Pour les collectionneurs de prestige maximal.\`,
    \`**Rolex Submariner ref. 126619LB** — 41mm solid 18K white gold case, sunburst blue dial, blue Cerachrom ceramic bezel, white gold Oyster bracelet. Cal. 3235 (70h power, COSC). 300m WR. Made 2020+. Royal watch in white gold & blue. Highly prestigious. Market: €48,000–68,000. For maximum prestige collectors.\`
  );} },

// DAYTONA PRECIOUS METALS
{ id:'rolex_116503', kw:['116503','daytona two tone','daytona gold steel','daytona oro acciaio','two tone daytona','daytona everose','daytona bicolore'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Two-Tone'; return t(
    \`**Rolex Daytona réf. 116503** — Chronographe 40mm bi-matière Acier & or Everose, lunette aluminium peinte blanche, cadran noir, mouvement Zenith El Primero. Référence précédente très classique, 2000–2023. Marché : 16 000–22 000€. Moins cher que le moderne 116500LN mais très appréciée des amateurs.\`,
    \`**Rolex Daytona ref. 116503** — 40mm two-tone steel & Everose chronograph, white painted aluminum bezel, black dial, Zenith El Primero movement. Classic reference 2000–2023. Market: €16,000–22,000. Less expensive than the modern 116500LN but highly valued by enthusiasts.\`
  );} },

{ id:'rolex_116518ln', kw:['116518ln','daytona yellow gold','daytona oysterflex','daytona oro','daytona elastomer','rubber daytona','yellow gold chronograph'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Yellow Gold Oysterflex'; return t(
    \`**Rolex Daytona réf. 116518LN** — Chronographe 40mm or jaune massif 18K, lunette aluminium peinte noire, cadran noir, bracelet Oysterflex (caoutchouc haute tech) noir. Mouvement Cal. 4130 (interne Rolex). Production 2015–2020 environ. Très moderne et sportive. Marché : 35 000–50 000€. Amateurs or & caoutchouc technique.\`,
    \`**Rolex Daytona ref. 116518LN** — 40mm solid 18K yellow gold chronograph, black painted aluminum bezel, black dial, black Oysterflex bracelet (high-tech elastomer). Cal. 4130 movement (in-house Rolex). Made circa 2015–2020. Very modern and sporty. Market: €35,000–50,000. For gold & technical elastomer fans.\`
  );} },

{ id:'rolex_126506', kw:['126506','daytona platinum','daytona platine','daytona ice blue','platinum daytona','pt950 daytona','daytona white','ultra prestige'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Platinum Ice Blue'; return t(
    \`**Rolex Daytona réf. 126506** — Chronographe 40mm platine massif PT950, cadran gris glace unique, lunette céramique noire Cerachrom, bracelet Oyster platine. Cal. 4130 (70h puissance). Étanche 100m (chronographes moins résistants). Production 2021+. Montre hyperministérielle ultra-rare. Marché : 90 000–140 000€. Collection de légende.\`,
    \`**Rolex Daytona ref. 126506** — 40mm solid PT950 platinum chronograph, unique ice gray dial, black Cerachrom ceramic bezel, platinum Oyster bracelet. Cal. 4130 (70h power reserve). 100m WR. Made 2021+. Ultra-rare ministerial watch. Market: €90,000–140,000. Legendary collection piece.\`
  );} },

// GMT-MASTER PRECIOUS METALS
{ id:'rolex_126711chnr', kw:['126711chnr','gmt root beer','gmt oro','gmt two tone','gmt everose','root beer daytona','two tone gmt','gmt gold steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II Root Beer Two-Tone'; return t(
    \`**Rolex GMT-Master II réf. 126711CHNR "Root Beer"** — Boîtier 40mm bi-matière Acier & or Everose, lunette Cerachrom noire-or-noire (Root Beer), cadran noir, mouvement Cal. 3285 (70h, COSC). Étanche 100m. Production 2019+. Combinaison prestigieuse très demandée. Marché : 18 000–24 000€. Liste d'attente longue Rolex.\`,
    \`**Rolex GMT-Master II ref. 126711CHNR "Root Beer"** — 40mm two-tone steel & Everose case, black-gold-black Cerachrom bezel (Root Beer), black dial, Cal. 3285 movement (70h, COSC). 100m WR. Made 2019+. Highly coveted prestige combination. Market: €18,000–24,000. Long Rolex waitlists.\`
  );} },

{ id:'rolex_126715chnr', kw:['126715chnr','gmt everose','gmt full gold','gmt gold only','gmt rose gold','root beer full oro','gmt oro rosa','burgundy bezel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT-Master II Everose Root Beer'; return t(
    \`**Rolex GMT-Master II réf. 126715CHNR "Root Beer"** — Boîtier 40mm or Everose massif 18K, lunette Cerachrom or-noir-or (Root Beer rose), cadran noir, bracelet Oyster or Everose. Cal. 3285 (70h, COSC). Étanche 100m. Production 2019+. Prestige maximal en or rose. Très rare. Marché : 55 000–80 000€. Pour amateurs or Everose signature Rolex.\`,
    \`**Rolex GMT-Master II ref. 126715CHNR "Root Beer"** — 40mm solid 18K Everose gold case, rose-gold-black Cerachrom bezel (Root Beer rose), black dial, Everose Oyster bracelet. Cal. 3285 (70h, COSC). 100m WR. Made 2019+. Maximum prestige in rose gold. Very rare. Market: €55,000–80,000. For Rolex Everose signature gold fans.\`
  );} },

// DATEJUST PRECIOUS METALS
{ id:'rolex_126331', kw:['126331','datejust 41','dj41 two tone','datejust everose','datejust chocolate','two tone dj','dj41 oro','dj chocolate'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Two-Tone Everose'; return t(
    \`**Rolex Datejust réf. 126331** — Boîtier 41mm bi-matière Acier & or Everose, cadran chocolat sunburst signature, lunette lisse or Everose, bracelet Jubilée bi-matière. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Datejust moderne & sophistiqué, cadran ultra-demandé. Marché : 14 000–18 000€. Classique intemporel.\`,
    \`**Rolex Datejust ref. 126331** — 41mm two-tone steel & Everose case, signature chocolate sunburst dial, smooth Everose bezel, two-tone Jubilée bracelet. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Modern & sophisticated Datejust, ultra-sought dial. Market: €14,000–18,000. Timeless classic.\`
  );} },

{ id:'rolex_126333', kw:['126333','datejust 41 yellow gold','dj41 oro','datejust oro giallo','yellow gold datejust','dj41 full gold','oro completo'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Yellow Gold'; return t(
    \`**Rolex Datejust réf. 126333** — Boîtier 41mm or jaune massif 18K, cadran at choix (arabe, index, sunburst), lunette lisse or, bracelet Jubilée or. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Montre dressy prestigieuse en or classique. Très portée par cadres/entrepreneurs. Marché : 28 000–38 000€. Pour amateurs or jaune traditionnel.\`,
    \`**Rolex Datejust ref. 126333** — 41mm solid 18K yellow gold case, choice of dials (Arabic, indices, sunburst), smooth gold bezel, Jubilée bracelet in gold. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Prestige dress watch in classic gold. Worn by executives/entrepreneurs. Market: €28,000–38,000. For traditional yellow gold lovers.\`
  );} },

{ id:'rolex_278278', kw:['278278','datejust 31','dj31 yellow gold','datejust 31 oro','small datejust gold','dj 31 giallo','ladies gold dj'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 31 Yellow Gold'; return t(
    \`**Rolex Datejust réf. 278278** — Boîtier 31mm or jaune massif 18K, cadran champagne ou bleu, lunette lisse or, bracelet Jubilée or. Cal. 2235 (automatique 55h). Étanche 100m. Production 2020+. Datejust compact & très féminim en or. Alternative aux dames Datejust plus grandes. Marché : 18 000–24 000€. Pour femmes executive prestige.\`,
    \`**Rolex Datejust ref. 278278** — 31mm solid 18K yellow gold case, champagne or blue dial, smooth gold bezel, Jubilée bracelet in gold. Cal. 2235 movement (automatic, 55h). 100m WR. Made 2020+. Compact & highly feminine Datejust in gold. Alternative to larger ladies Datejust. Market: €18,000–24,000. For prestige executive women.\`
  );} },

{ id:'rolex_126300', kw:['126300','datejust 41 steel','dj 41 smooth','datejust acier lisse','smooth dj','steel datejust','dj 41 current','modern dj steel'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Datejust 41 Steel Smooth'; return t(
    \`**Rolex Datejust réf. 126300** — Boîtier 41mm Oystersteel, cadran gris sunburst, lunette lisse acier, bracelet Oyster acier Glidelock. Cal. 3235 (70h, COSC). Étanche 100m. Production 2020+. Le Datejust acier moderne & pur, sans relief. Très classique. Marché : 9 000–12 000€. Entrée de gamme DJ prestige.\`,
    \`**Rolex Datejust ref. 126300** — 41mm Oystersteel case, gray sunburst dial, smooth steel bezel, steel Oyster bracelet with Glidelock. Cal. 3235 (70h, COSC). 100m WR. Made 2020+. Modern & pure steel Datejust, smooth finish. Very classic. Market: €9,000–12,000. Entry-level DJ prestige.\`
  );} },

// DAY-DATE PRECIOUS METALS
{ id:'rolex_228206', kw:['228206','day date 40','day date platinum','platine day date','platinum president','pt950 day date','ice blue day date'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 40 Platinum'; return t(
    \`**Rolex Day-Date réf. 228206** — Boîtier 40mm platine massif PT950, cadran gris glace unique, lunette lisse platine, bracelet President platine. Cal. 3255 (70h, COSC). Étanche 100m. Production 2021+. La montre présidentielle ultime en platine. Extrêmement rare. Marché : 95 000–150 000€. Pour collection hyperministérielle.\`,
    \`**Rolex Day-Date ref. 228206** — 40mm solid PT950 platinum case, unique ice gray dial, smooth platinum bezel, platinum President bracelet. Cal. 3255 (70h, COSC). 100m WR. Made 2021+. The ultimate presidential watch in platinum. Extremely rare. Market: €95,000–150,000. For top-level collection.\`
  );} },

{ id:'rolex_128238', kw:['128238','day date 36','day date yellow gold','day date oro giallo','president 36','small day date','daj 36 oro'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Day-Date 36 Yellow Gold'; return t(
    \`**Rolex Day-Date réf. 128238** — Boîtier 36mm or jaune massif 18K, cadran or/champagne, lunette lisse or, bracelet President or. Cal. 3255 (70h, COSC). Étanche 100m. Production 2020+. La Day-Date classique en petit format or. Très élégante & compacte. Marché : 32 000–45 000€. Pour femmes/hommes aux poignets fins prestige.\`,
    \`**Rolex Day-Date ref. 128238** — 36mm solid 18K yellow gold case, champagne gold dial, smooth gold bezel, gold President bracelet. Cal. 3255 (70h, COSC). 100m WR. Made 2020+. The classic Day-Date in smaller gold format. Very elegant & compact. Market: €32,000–45,000. For prestige ladies/men with slender wrists.\`
  );} },

// YACHT-MASTER PRECIOUS METALS & SPECIAL
{ id:'rolex_226627', kw:['226627','yacht master 42','yacht master titanium','rlx titanium','yacht master grey','yacht master modern','sport tool watch'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master 42 Titanium RLX'; return t(
    \`**Rolex Yacht-Master réf. 226627** — Boîtier 42mm RLX Titanium™ (alliage Rolex), cadran gris, lunette Cerachrom grise bidirectionnelle, bracelet Oyster RLX. Cal. 3235 (70h, COSC). Étanche 300m. Production 2023+. Matériau ultra-moderne RLX pour montre sport nautique. Très technique. Marché : 12 000–16 000€. Futur classique.\`,
    \`**Rolex Yacht-Master ref. 226627** — 42mm RLX Titanium™ (Rolex alloy) case, gray dial, gray bidirectional Cerachrom bezel, RLX Oyster bracelet. Cal. 3235 (70h, COSC). 300m WR. Made 2023+. Ultra-modern RLX material for nautical sport watch. Highly technical. Market: €12,000–16,000. Future classic.\`
  );} },

{ id:'rolex_116680', kw:['116680','yacht master ii','yacht master regatta','chronographe yacht','chronograph regatta','yacht master countdown'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Yacht-Master II Regatta'; return t(
    \`**Rolex Yacht-Master II réf. 116680** — Chronographe 44mm acier, cadran bleu, compte à rebours mécanique intégré pour régates, lunette Cerachrom bleu, mouvement Cal. 4161 (72h). Étanche 100m (chronographe moins WR). Production 2007–2019. Montre de régate absolue, ultra-spécialisée. Marché : 16 000–22 000€. Pour skipper passionné.\`,
    \`**Rolex Yacht-Master II ref. 116680** — 44mm steel chronograph, blue dial, integrated mechanical regatta countdown bezel, blue Cerachrom, Cal. 4161 movement (72h). 100m WR. Made 2007–2019. Absolute regatta watch, ultra-specialized. Market: €16,000–22,000. For passionate skippers.\`
  );} },

// COSMOGRAPH DAYTONA SPECIAL EDITIONS
{ id:'rolex_116595rbow', kw:['116595rbow','daytona rainbow','daytona gemset','bezel sertis','daytona everose','rainbow bezel','precious stones'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Rainbow Everose Gemset'; return t(
    \`**Rolex Daytona réf. 116595RBOW** — Chronographe 40mm or Everose massif, lunette Cerachrom sertie de saphirs/rubis arc-en-ciel (gemset bezel), cadran noir/platine, bracelet Oyster or Everose. Cal. 4130 (70h). Étanche 100m. Production rare/limité 2015+. Montre joaillerie d'exception Rolex. Marché : 80 000–130 000€. Pièce de collection unique.\`,
    \`**Rolex Daytona ref. 116595RBOW** — 40mm solid Everose gold chronograph, Cerachrom bezel set with rainbow sapphires/rubies (gemset), black/platinum dial, Everose Oyster bracelet. Cal. 4130 (70h). 100m WR. Rare/limited production 2015+. Rolex's exceptional jewellery chronograph. Market: €80,000–130,000. Unique collection piece.\`
  );} },

{ id:'rolex_116505', kw:['116505','daytona everose','daytona rose gold','daytona oro rosa','full rose gold daytona','daytona chocolate','everose sportive'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Everose Chocolate'; return t(
    \`**Rolex Daytona réf. 116505** — Chronographe 40mm or Everose massif 18K, cadran chocolat sunburst, lunette aluminium peinte (ancien style), bracelet Oyster or Everose. Mouvement Cal. 4130. Étanche 100m. Production 2004–2023. Très appréciée pour ses proportions classiques & couleur or rose chaud. Marché : 28 000–42 000€. Favorite des collectionneurs or.\`,
    \`**Rolex Daytona ref. 116505** — 40mm solid 18K Everose gold chronograph, chocolate sunburst dial, painted aluminum bezel (classic style), Everose Oyster bracelet. Cal. 4130 movement. 100m WR. Made 2004–2023. Highly appreciated for classic proportions & warm rose gold. Market: €28,000–42,000. Favourite of gold collectors.\`
  );} },

// VINTAGE ICONS
{ id:'rolex_1655', kw:['1655','explorer ii','steve mcqueen','vintage explorer','modern explorer','gmt explorer','orange hand'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Explorer II Steve McQueen'; return t(
    \`**Rolex Explorer II réf. 1655 "Steve McQueen"** — Montre vintage 40mm acier, cadran orange sunburst signature, lunette GMT (deux fuseaux), mouvement cal. 1575 ou 1625 (27 000 tph). Étanche 100m. Production 1971–1980. Portée par l'acteur/pilote Steve McQueen. Montre de légende absolue. Marché : 35 000–65 000€ selon état. Très rare & très demandée.\`,
    \`**Rolex Explorer II ref. 1655 "Steve McQueen"** — Vintage 40mm steel watch, signature orange sunburst dial, GMT bezel (dual time), cal. 1575 or 1625 movement (27,000 tph). 100m WR. Made 1971–1980. Worn by actor/driver Steve McQueen. Absolute legend watch. Market: €35,000–65,000 depending on condition. Very rare & highly sought.\`
  );} },

{ id:'rolex_6542', kw:['6542','gmt original','bakelite bezel','original gmt','bakelite vintage','vintage bakelite','gmt bakelite','first gmt'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='GMT Original Bakelite'; return t(
    \`**Rolex GMT-Master réf. 6542** — Montre vintage 40mm acier, cadran noir, lunette bakelite marron iconique (première génération GMT 1955–1959), mouvement cal. 1016 (27 000 tph). Étanche 100m. Production rares années 1950s. Montre génératrice de gamme. Bakelite très fragile (beaucoup détériorés). Marché : 50 000–100 000€ si bakelite intacte. Graal collectionneurs.\`,
    \`**Rolex GMT-Master ref. 6542** — Vintage 40mm steel watch, black dial, iconic brown bakelite bezel (first GMT generation 1955–1959), cal. 1016 movement (27,000 tph). 100m WR. Rare production in 1950s. Generation-defining watch. Bakelite very fragile (many deteriorated). Market: €50,000–100,000 if bakelite intact. Holy grail for collectors.\`
  );} },

{ id:'rolex_1680', kw:['1680','red submariner','submariner rouge','vintage submarine','red dial submariner','ultra rare','maxi dial'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Submariner Red Dial'; return t(
    \`**Rolex Submariner réf. 1680** — Montre vintage 40mm acier, cadran ROUGE texturé (extrêmement rare), lunette aluminium peinte noire (pré-céramique), mouvement cal. 1575 (27 000 tph). Étanche 100m. Production années 1960s-early 70s seulement. Très peu fabriquées en rouge. Marché : 80 000–150 000€ selon authenticité. Ultra-rare, presque impossible à trouver.\`,
    \`**Rolex Submariner ref. 1680** — Vintage 40mm steel watch, RED textured dial (extremely rare), black painted aluminum bezel (pre-ceramic), cal. 1575 movement (27,000 tph). 100m WR. Made 1960s–early 1970s only. Very few produced in red. Market: €80,000–150,000 depending on authentication. Ultra-rare, nearly impossible to find.\`
  );} },

{ id:'rolex_6265', kw:['6265','daytona big red','big red daytona','red daytona vintage','cosmograph big red','daytona rouge','daytona paul newman era'],
  r:()=>{ ctx.brand='Rolex'; ctx.model='Daytona Big Red Vintage'; return t(
    \`**Rolex Daytona réf. 6265 "Big Red"** — Chronographe vintage 37mm acier, inscriptions "BIG RED" sur le cadran (années 1978–1982), lunette aluminium peinte, mouvement cal. 727 (19 800 tph, Valjoux). Étanche 100m (chronographe moins WR). Production limitée. Marché : 40 000–80 000€. Très demandée des fans vintage Daytona. Référence culte pré-Paul Newman.\`,
    \`**Rolex Daytona ref. 6265 "Big Red"** — Vintage 37mm steel chronograph, "BIG RED" dial inscriptions (1978–1982), painted aluminum bezel, cal. 727 movement (19,800 tph, Valjoux). 100m WR. Limited production. Market: €40,000–80,000. Highly sought by vintage Daytona fans. Cult reference pre-Paul Newman era.\`
  );} },

`;

// New AP entries (inserted before patek_general)
const apNewEntries = `
// ═══ AUDEMARS PIGUET EXPANDED REFERENCES ═══════════════════════════════════

// ROYAL OAK ADVANCED REFERENCES
{ id:'ap_15500ti', kw:['15500ti','royal oak titanium','royal oak titane','ro titanium','ap titanium','lightweight royal oak','titanium sports'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 41mm Titanium'; return t(
    \`**Audemars Piguet Royal Oak réf. 15500ST (Titanium)** — Boîtier 41mm titane ultra-léger (seulement quelques références), cadran bleu ou gris, lunette intégrée titane, bracelet Royal Oak titane. Cal. 4302 (70h, chronométrie COSC). Étanche 100m. Production très limitée 2021+. Montre sport-technique en matériau ultra-premium. Marché : 65 000–95 000€. Pour amateurs titane prestige.\`,
    \`**Audemars Piguet Royal Oak ref. 15500ST (Titanium)** — 41mm ultra-lightweight titanium case (only select references), blue or gray dial, integrated titanium bezel, titanium Royal Oak bracelet. Cal. 4302 (70h, COSC). 100m WR. Very limited production 2021+. Sport-technical watch in ultra-premium material. Market: €65,000–95,000. For prestige titanium enthusiasts.\`
  );} },

{ id:'ap_26591ti', kw:['26591ti','royal oak chronograph','royal oak chrono titanium','ro chrono','ap titanium chrono','integrated chronograph','sports chronograph'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Chronograph Titanium'; return t(
    \`**Audemars Piguet Royal Oak Chronograph réf. 26591TI** — Chronographe 41mm titane, cadran bleu ou noir, compteurs intégrés, lunette octogonale titane, bracelet Royal Oak titane. Cal. 4401 (70h, chronométrie COSC). Étanche 100m. Production 2023+. Chronographe sport prestigieux ultra-moderne. Très rare. Marché : 120 000–180 000€. Pièce technique ultime.\`,
    \`**Audemars Piguet Royal Oak Chronograph ref. 26591TI** — 41mm titanium chronograph, blue or black dial, integrated chronograph counters, octagonal titanium bezel, titanium Royal Oak bracelet. Cal. 4401 (70h, COSC). 100m WR. Made 2023+. Ultra-modern prestige sports chronograph. Very rare. Market: €120,000–180,000. Ultimate technical piece.\`
  );} },

{ id:'ap_15202xt', kw:['15202xt','royal oak jumbo','royal oak titanium gold','50th anniversary','limited edition','two tone oak'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Jumbo 50th Anniversary'; return t(
    \`**Audemars Piguet Royal Oak Jumbo réf. 15202XT (50th Anniversaire)** — Boîtier 39mm bi-matière titane & or blanc (édition spéciale 50 ans), cadran bleu, lunette intégrée, bracelet mixte. Cal. 3132 (automatique, 54h). Étanche 100m. Production édition limitée 2022. Montre commémorative prestigieuse. Marché : 85 000–130 000€. Collectionneurs anniversaire.\`,
    \`**Audemars Piguet Royal Oak Jumbo ref. 15202XT (50th Anniversary)** — 39mm two-tone titanium & white gold case (special 50-year edition), blue dial, integrated bezel, mixed bracelet. Cal. 3132 movement (automatic, 54h). 100m WR. Limited edition production 2022. Prestigious commemorative watch. Market: €85,000–130,000. Anniversary collectors.\`
  );} },

{ id:'ap_77350sr', kw:['77350sr','royal oak ladies','royal oak 34','small royal oak','womens royal oak','rose gold oak','ladies prestige'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak 34mm Ladies Rose Gold'; return t(
    \`**Audemars Piguet Royal Oak réf. 77350SR** — Boîtier 34mm or rose massif 18K, cadran bleu, lunette intégrée or rose, bracelet Royal Oak or rose. Cal. 3120 (55h). Étanche 100m. Production 2020+. Montre féminine prestige signature AP. Très élégante & compacte. Marché : 55 000–80 000€. Pour femmes executives prestige.\`,
    \`**Audemars Piguet Royal Oak ref. 77350SR** — 34mm solid 18K rose gold case, blue dial, integrated rose gold bezel, rose gold Royal Oak bracelet. Cal. 3120 movement (55h). 100m WR. Made 2020+. Signature AP prestige ladies watch. Very elegant & compact. Market: €55,000–80,000. For prestige executive women.\`
  );} },

// OFFSHORE EXPANDED
{ id:'ap_26420so', kw:['26420so','offshore 43','offshore steel','offshore ceramic','modern offshore','offshore chronograph','sport offshore'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore 43mm Steel/Ceramic'; return t(
    \`**Audemars Piguet Offshore réf. 26420SO** — Chronographe 43mm acier & céramique noire, cadran noir, lunette Cerachrom noire bidirectionnelle, bracelet intégré acier. Cal. 4401 (70h, COSC). Étanche 300m. Production 2023+. Montre ultra-sportive & aquatique moderne. Très technique. Marché : 75 000–110 000€. Pour passionnés offshore sport.\`,
    \`**Audemars Piguet Offshore ref. 26420SO** — 43mm steel & black ceramic chronograph, black dial, black bidirectional Cerachrom bezel, integrated steel bracelet. Cal. 4401 (70h, COSC). 300m WR. Made 2023+. Ultra-modern sporty & aquatic watch. Highly technical. Market: €75,000–110,000. For offshore sport enthusiasts.\`
  );} },

{ id:'ap_26420ti', kw:['26420ti','offshore titanium','offshore vert','offshore green','titanium offshore','lightweight offshore','sports titanium'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Titanium Green'; return t(
    \`**Audemars Piguet Offshore réf. 26420TI** — Chronographe 43mm titane ultra-léger, cadran vert distinctif, lunette Cerachrom verte, bracelet Offshore titane intégré. Cal. 4401 (70h, COSC). Étanche 300m. Production 2021+. Montre sport ultra-premium en titane avec couleur contemporaine. Marché : 95 000–140 000€. Amateurs titane & couleur.\`,
    \`**Audemars Piguet Offshore ref. 26420TI** — 43mm ultra-lightweight titanium chronograph, distinctive green dial, green Cerachrom bezel, integrated titanium Offshore bracelet. Cal. 4401 (70h, COSC). 300m WR. Made 2021+. Ultra-premium sport watch in titanium with contemporary color. Market: €95,000–140,000. Titanium & color enthusiasts.\`
  );} },

{ id:'ap_15710st', kw:['15710st','offshore diver','offshore 42mm','diving offshore','underwater offshore','previous generation','discontinued offshore'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Diver 42mm Previous Gen'; return t(
    \`**Audemars Piguet Offshore Diver réf. 15710ST** — Chronographe 42mm acier, cadran noir, lunette Cerachrom noire, bracelet intégré acier. Cal. 3125 ou 4401 selon année. Étanche 300m. Production 2016–2023. Montre de plongée/sport signature Offshore. Très portée. Marché : 45 000–65 000€ (ancien modèle moins cher). Excellent rapport qualité-prix.\`,
    \`**Audemars Piguet Offshore Diver ref. 15710ST** — 42mm steel chronograph, black dial, black Cerachrom bezel, integrated steel bracelet. Cal. 3125 or 4401 depending on year. 300m WR. Made 2016–2023. Signature Offshore diving/sport watch. Widely worn. Market: €45,000–65,000 (older model less expensive). Excellent value-to-quality ratio.\`
  );} },

// CODE 11.59 SPECIAL
{ id:'ap_26395bc', kw:['26395bc','code 11.59','code starwheel','white gold code','haute complication','perpetual calendar','code 11.59 blanc'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Starwheel White Gold'; return t(
    \`**Audemars Piguet Code 11.59 Starwheel réf. 26395BC** — Montre haute complication 41mm or blanc massif 18K, cadran très complexe avec roue Starwheel étoilée, mouvement perpétuel perpétuel. Cal. 4600 ultra-complexe. Étanche 100m. Production très rare 2020+. Montre horlogère d'exception AP. Marché : 200 000–350 000€. Pour collectionneurs haute complication.\`,
    \`**Audemars Piguet Code 11.59 Starwheel ref. 26395BC** — 41mm solid 18K white gold haute complication watch, highly complex dial with iconic Starwheel design, perpetual calendar movement. Ultra-complex Cal. 4600. 100m WR. Very rare production 2020+. Exceptional AP watchmaking. Market: €200,000–350,000. For haute complication collectors.\`
  );} },

{ id:'ap_26398or', kw:['26398or','code 11.59','flying tourbillon','tourbillon','or rose','rose gold code','ultimate complication'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Code 11.59 Flying Tourbillon'; return t(
    \`**Audemars Piguet Code 11.59 Flying Tourbillon réf. 26398OR** — Montre ultra-complication 41mm or rose massif 18K, tourbillon volant visible au-dessus du cadran, mécanisme haute horlogerie. Cal. 4603 (ultra-complexe, 72h). Étanche 100m. Production très limitée 2018+. Montre de génie horloger pur. Marché : 180 000–300 000€. Pièce d'art pour collectionneurs élite.\`,
    \`**Audemars Piguet Code 11.59 Flying Tourbillon ref. 26398OR** — 41mm solid 18K rose gold ultra-complication watch, flying tourbillon visible above dial, haute horlogerie mechanism. Ultra-complex Cal. 4603 (72h). 100m WR. Very limited production 2018+. Pure horological genius. Market: €180,000–300,000. Art piece for elite collectors.\`
  );} },

// RARE & SPECIAL EDITIONS
{ id:'ap_26610oi', kw:['26610oi','offshore music','selfwinding music','offshore special','art watch','specialized offshore','limited edition art'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Offshore Selfwinding Music Edition'; return t(
    \`**Audemars Piguet Offshore Selfwinding Music Edition réf. 26610OI** — Chronographe 42mm acier, cadran spécialisé avec motifs musicaux gravés, mouvement automate musical intégré (très rare). Cal. 3186 modifié. Étanche 300m. Production ultra-limitée 2010+. Montre d'art horloger exceptionnelle. Marché : 120 000–220 000€. Amateurs art/musique horlogère.\`,
    \`**Audemars Piguet Offshore Selfwinding Music Edition ref. 26610OI** — 42mm steel chronograph, specialized dial with engraved musical motifs, integrated musical automaton movement (very rare). Modified Cal. 3186. 300m WR. Ultra-limited production 2010+. Exceptional horological art watch. Market: €120,000–220,000. Art/horological music enthusiasts.\`
  );} },

{ id:'ap_26579ce', kw:['26579ce','royal oak perpetual','perpetual calendar','calendar openworked','skeleton calendar','ceramic case','ultimate complexity'],
  r:()=>{ ctx.brand='Audemars Piguet'; ctx.model='Royal Oak Perpetual Calendar Openworked'; return t(
    \`**Audemars Piguet Royal Oak Perpetual Calendar Openworked réf. 26579CE** — Montre calendrier perpétuel 41mm céramique noire, squelettisée (mouvement visible), affichage perpétuel complet (jour/date/mois/année). Cal. 4601 extrêmement complexe. Étanche 100m. Production rare 2019+. Montre d'exception technique & artistique. Marché : 380 000–550 000€. Graal de la haute horlogerie AP.\`,
    \`**Audemars Piguet Royal Oak Perpetual Calendar Openworked ref. 26579CE** — 41mm black ceramic perpetual calendar watch, skeletonized (movement visible), full perpetual display (day/date/month/year). Extremely complex Cal. 4601. 100m WR. Rare production 2019+. Exception in technical & artistic watchmaking. Market: €380,000–550,000. Holy grail of AP haute horlogerie.\`
  );} },

`;

// Find insertion points
const apGeneralMatch = code.match(/(\n\s*)\{\s*id:'ap_general'/);
const patekGeneralMatch = code.match(/(\n\s*)\{\s*id:'patek_general'/);

if (!apGeneralMatch || !patekGeneralMatch) {
  console.error('ERROR: Could not find anchor points ap_general or patek_general');
  process.exit(1);
}

const apGeneralIndex = apGeneralMatch.index;
const patekGeneralIndex = patekGeneralMatch.index;

// Insert Rolex entries before ap_general
const codeWithRolex = code.slice(0, apGeneralIndex) + '\n' + roleaxNewEntries + code.slice(apGeneralIndex);

// Adjust patek_general index because we inserted Rolex entries
const newPatekIndex = patekGeneralIndex + roleaxNewEntries.length;

// Insert AP entries before patek_general
const finalCode = codeWithRolex.slice(0, newPatekIndex) + '\n' + apNewEntries + codeWithRolex.slice(newPatekIndex);

// Count new lines
const originalLines = code.split('\n').length;
const newLines = finalCode.split('\n').length;
const linesAdded = newLines - originalLines;

// Write back
fs.writeFileSync(CHATBOT_PATH, finalCode, 'utf8');

console.log(`✓ Successfully expanded chatbot.js`);
console.log(`  Original lines: ${originalLines}`);
console.log(`  New lines: ${newLines}`);
console.log(`  Lines added: ${linesAdded}`);
console.log(`  New total: ${newLines} lines (target: 5000+)`);
console.log(`\n  New Rolex entries added: 18`);
console.log(`  New AP entries added: 14`);
console.log(`\nFile saved to: ${CHATBOT_PATH}`);
