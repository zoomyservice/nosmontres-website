const fs = require('fs');

// Read the chatbot.js file
let code = fs.readFileSync('js/chatbot.js', 'utf8');

// Find the insertion point before { id:'rm_general'
const marker = "{ id:'rm_general'";
const pos = code.indexOf(marker);

if (pos === -1) {
  console.error('ERROR: Marker not found. Cannot locate insertion point.');
  process.exit(1);
}

// Build the new Patek entries with full specifications
const entries = `
    // ═══════════════════════════════════════════════════════════════════════════
    // PATEK PHILIPPE EXPANDED REFERENCES — Comprehensive Model Coverage
    // ═══════════════════════════════════════════════════════════════════════════

    // ──────────────────────────────────────────────────────────────────────────
    // NAUTILUS COLLECTION (40mm Sport Icon)
    // ──────────────────────────────────────────────────────────────────────────
    
    { id:'patek_5711', kw:['5711','5711 1a','5711a','nautilus 5711','patek nautilus 5711','5711 steel','5711 bleu','nautilus blue steel','nautilus discontinued','5711 gérald genta'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5711'; return t(
        \`Nautilus réf. 5711A-001 (40mm acier, cadran bleu Sunburst). Calibre 26-330 SC (45h réserve). Bracelet intégré trois mailles. Icône sport-chic par Gérald Genta (1976). Discontinué août 2021 après 45 ans — le plus recherché de tous les Patek. Cote marché 85 000–120 000€ selon état.\`,
        \`Nautilus ref. 5711A-001 (40mm steel, Sunburst blue dial). Calibre 26-330 SC (45h power reserve). Integrated three-link bracelet. Sport-chic icon by Gérald Genta (1976). Discontinued August 2021 after 45 years — the most sought Patek ever. Market: €85,000–120,000 depending on condition.\`
      );} },

    { id:'patek_5711_tiffany', kw:['5711 tiffany','tiffany co patek','5711 tiffany blue','patek tiffany nautilus','5711 turquoise','tiffany collaboration','limited 170','patek tiffany','nautilus tiffany','ref 5711'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5711 Tiffany & Co'; return t(
        \`Nautilus réf. 5711/1A-018 Tiffany & Co (40mm acier, cadran bleu Tiffany exclusif). Calibre 26-330 SC. Édition limitée à 170 pièces (2022). Collaboration Patek Philippe × Tiffany New York. Ultra-rare. Marché 200 000€+. La plus désirée au-delà du prix.\`,
        \`Nautilus ref. 5711/1A-018 Tiffany & Co (40mm steel, exclusive Tiffany blue dial). Calibre 26-330 SC. Limited to 170 pieces (2022). Patek Philippe × Tiffany New York collaboration. Ultra-rare. Market €200,000+. The most desired beyond price.\`
      );} },

    { id:'patek_5712', kw:['5712','5712a','nautilus 5712','nautilus power reserve','nautilus moonphase','5712 lune','5712 réserve','moonphase nautilus','patek nautilus calendar'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5712'; return t(
        \`Nautilus réf. 5712A-001 (40mm acier, cadran noir). Calibre 240 PS IRM C LU : réserve de marche (jour/nuit) + indication lune. Produit depuis 2006. Plus robuste que le 5711, complication bonus. Marché acier 65 000–80 000€.\`,
        \`Nautilus ref. 5712A-001 (40mm steel, black dial). Calibre 240 PS IRM C LU: power reserve (day/night) + moon phase. In production since 2006. More robust than the 5711, bonus complication. Market: €65,000–80,000.\`
      );} },

    { id:'patek_5740', kw:['5740','5740g','5740/1g','perpetual calendar nautilus','nautilus perpetual','perpetual nautilus','white gold nautilus','5740 or blanc'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Perpetual Calendar 5740'; return t(
        \`Nautilus réf. 5740/1G-001 (40mm or blanc, cadran argenté). Calibre 240 Q (complication perpétuelle manufacture). Calendrier perpétuel Nautilus : extrêmement rare. Lancé 2010. Marché 120 000–180 000€ selon année/état.\`,
        \`Nautilus ref. 5740/1G-001 (40mm white gold, silver dial). Calibre 240 Q (manufacture perpetual complication). Perpetual Calendar Nautilus: extremely rare. Launched 2010. Market: €120,000–180,000 depending on year/condition.\`
      );} },

    { id:'patek_5811', kw:['5811','5811a','5811/1a','nautilus white gold','nautilus 41mm','nautilus or blanc','5811 replacement','nautilus successor','new nautilus'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus 5811'; return t(
        \`Nautilus réf. 5811/1A-001 (41mm or blanc, cadran bleu fumé). Calibre 26-330 SC. Remplacant du légendaire 5711 acier. Lancé 2021. Boîtier plus imposant, finition affinée, or blanc exclut des acheteurs spéculatifs. Marché 60 000–85 000€.\`,
        \`Nautilus ref. 5811/1A-001 (41mm white gold, smoked blue dial). Calibre 26-330 SC. Successor to legendary steel 5711. Launched 2021. Larger case, refined finishing, white gold excludes speculative buyers. Market: €60,000–85,000.\`
      );} },

    { id:'patek_5819', kw:['5819','5819g','5819/1g','nautilus travel time','travel time nautilus','world time nautilus','dual time nautilus','patek 5819','5819 world'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Travel Time 5819'; return t(
        \`Nautilus réf. 5819/1G-001 (40mm or blanc, cadran bleu). Calibre 324 S C FUS. Indication GMT/Travel Time. Calendrier annuel. 2023 collection. Rarement produit — Nautilus compliqué. Marché 75 000–95 000€.\`,
        \`Nautilus ref. 5819/1G-001 (40mm white gold, blue dial). Calibre 324 S C FUS. GMT/Travel Time indication. Annual calendar. 2023 collection. Rarely produced — complicated Nautilus. Market: €75,000–95,000.\`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // AQUANAUT COLLECTION (42mm Modern Sports Watch)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5167', kw:['5167','5167a','5167a-001','aquanaut 5167','aquanaut steel','aquanaut acier','5167 bracelet composite','aquanaut composite','5167 cadran'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5167'; return t(
        \`Aquanaut réf. 5167A-001 (40mm acier, cadran bleu tropical). Calibre 324 S C (45h). Bracelet composite « caoutchouc sport » signature. Ceinture de sécurité sous-marine textile. Design moderne 1997, toujours en production. Marché 50 000–70 000€ acier.\`,
        \`Aquanaut ref. 5167A-001 (40mm steel, tropical blue dial). Calibre 324 S C (45h). Signature composite « sport rubber » bracelet. Textile underwater safety belt. Modern design 1997, still in production. Market: €50,000–70,000 steel.\`
      );} },

    { id:'patek_5168', kw:['5168','5168g','5168g-001','aquanaut white gold','aquanaut 42mm','aquanaut or blanc','5168 bleu','aquanaut larger'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut 5168'; return t(
        \`Aquanaut réf. 5168G-001 (42mm or blanc, cadran bleu). Calibre 26-330 SC. Mouvement Nautilus monté dans l'Aquanaut. Case de 42mm plus imposante. Collection 2020. Marché 65 000–90 000€.\`,
        \`Aquanaut ref. 5168G-001 (42mm white gold, blue dial). Calibre 26-330 SC. Nautilus movement mounted in Aquanaut. Larger 42mm case. 2020 collection. Market: €65,000–90,000.\`
      );} },

    { id:'patek_5164', kw:['5164','5164a','5164a-001','aquanaut travel time','aquanaut world time','5164 gmt','aquanaut dual time','patek 5164'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Travel Time 5164'; return t(
        \`Aquanaut réf. 5164A-001 (40mm acier, cadran gris fumé). Calibre 324 S C FUS (Travel Time). Indication GMT, calendrier annuel. Bracelet composite. 2021 introduction. Montre sportive avec complication. Marché 60 000–80 000€.\`,
        \`Aquanaut ref. 5164A-001 (40mm steel, smoked gray dial). Calibre 324 S C FUS (Travel Time). GMT indication, annual calendar. Composite bracelet. 2021 introduction. Sports watch with complication. Market: €60,000–80,000.\`
      );} },

    { id:'patek_5968', kw:['5968','5968a','5968a-001','aquanaut chronograph','aquanaut chrono','aquanaut flyback','5968 steel','aquanaut rattrapante'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Chronograph 5968'; return t(
        \`Aquanaut réf. 5968A-001 (42mm acier, cadran bleu). Calibre CH 28-520 C (flyback rattrapante intégrée). Chronographe sports-chic Aquanaut. Bracelet composite. Lancé 2021. Ultra-rare. Marché 80 000–120 000€.\`,
        \`Aquanaut ref. 5968A-001 (42mm steel, blue dial). Calibre CH 28-520 C (integrated flyback split-seconds). Sports-chic Aquanaut chronograph. Composite bracelet. Launched 2021. Ultra-rare. Market: €80,000–120,000.\`
      );} },

    { id:'patek_5269', kw:['5269','5269r','5269r-001','aquanaut ladies','patek ladies','luce aquanaut','5269 rose gold','aquanaut femme','aquanaut rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Aquanaut Luce 5269'; return t(
        \`Aquanaut Luce réf. 5269/1R-001 (35.2mm or rose, cadran rose). Calibre 324 S C. Montre féminine Aquanaut. Bracelet composite rose-gold tissé. Collection 2020. Marché 55 000–75 000€.\`,
        \`Aquanaut Luce ref. 5269/1R-001 (35.2mm rose gold, rose dial). Calibre 324 S C. Ladies' Aquanaut watch. Rose-gold woven composite bracelet. 2020 collection. Market: €55,000–75,000.\`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // CALATRAVA COLLECTION (37–40mm Dress Classics)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5196', kw:['5196','5196j','5196j-001','calatrava rose gold','calatrava 37mm','calatrava classic','5196 or rose','calatrava eternal'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava 5196'; return t(
        \`Calatrava réf. 5196/1R-001 (37mm or rose, cadran champagne). Calibre 324 S C. Montre d'habillé par excellence — le classique Patek. Bracelet cuir Patek. Lancé 2010. Linéale épurée. Marché 30 000–45 000€.\`,
        \`Calatrava ref. 5196/1R-001 (37mm rose gold, champagne dial). Calibre 324 S C. The quintessential dress watch — classic Patek. Patek leather strap. Launched 2010. Pure linear design. Market: €30,000–45,000.\`
      );} },

    { id:'patek_5227', kw:['5227','5227j','5227j-001','calatrava officer','calatrava 39mm','calatrava case officier','5227 white gold','calatrava modern'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Officer 5227'; return t(
        \`Calatrava réf. 5227/1J-001 (39mm or blanc, cadran argenté). Calibre 26-330 SC. Caîtier carré/officier vintage, 40mm reconnu, moderne. Bracelet intégré or blanc. 2019 reintroduction. Marché 35 000–55 000€.\`,
        \`Calatrava ref. 5227/1J-001 (39mm white gold, silver dial). Calibre 26-330 SC. Officer's square/vintage case, recognized 40mm proportions, modern. Integrated white gold bracelet. 2019 reintroduction. Market: €35,000–55,000.\`
      );} },

    { id:'patek_6119', kw:['6119','6119j','6119j-001','calatrava laque','calatrava lacquer','calatrava 39mm','patek 6119','calatrava asian art'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Lacquer 6119'; return t(
        \`Calatrava réf. 6119/1J-001 (39mm or blanc, cadran laque noire + motif asiatique guilloché). Calibre 215 (manuel, ultra-mince 1.95mm). Art asiatique — laque traditionnelle Main d'œuvre extrême. 2020 introduction. Marché 25 000–35 000€.\`,
        \`Calatrava ref. 6119/1J-001 (39mm white gold, black lacquer dial + guilloché Asian motif). Calibre 215 (manual, ultra-thin 1.95mm). Asian art — traditional lacquer. Extreme craftsmanship. 2020 introduction. Market: €25,000–35,000.\`
      );} },

    { id:'patek_5226', kw:['5226','5226j','5226j-001','calatrava clous de paris','calatrava 40mm','calatrava white gold','5226 diamond set','calatrava clous'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Clous de Paris 5226'; return t(
        \`Calatrava réf. 5226/1J-001 (40mm or blanc, cadran bleu Sunburst, lunette Clous de Paris). Calibre 26-330 SC. Symbole Patek : motifs Clous de Paris (pois en relief). Bracelet or blanc intégré. 2021 collection. Marché 40 000–60 000€.\`,
        \`Calatrava ref. 5226/1J-001 (40mm white gold, Sunburst blue dial, Clous de Paris bezel). Calibre 26-330 SC. Patek symbol: Clous de Paris motifs (raised studs). Integrated white gold bracelet. 2021 collection. Market: €40,000–60,000.\`
      );} },

    { id:'patek_6007', kw:['6007','6007a','6007a-001','calatrava steel','calatrava acier','calatrava limited','6007 limited edition','calatrava anniversary'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Calatrava Steel 6007'; return t(
        \`Calatrava réf. 6007A-001 (40mm acier, cadran bleu). Calibre 26-330 SC. Edição limitada acier — ultra-rare (Patek préfère l'or). Caiatrava moderne de Patek, acier exclusif. 2021 introduction. Marché 50 000–75 000€.\`,
        \`Calatrava ref. 6007A-001 (40mm steel, blue dial). Calibre 26-330 SC. Limited edition steel — ultra-rare (Patek prefers gold). Modern Patek Calatrava, exclusive steel. 2021 introduction. Market: €50,000–75,000.\`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // COMPLICATIONS COLLECTION (Annual Calendars, World Times, Advanced)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5205', kw:['5205','5205r','5205r-001','annual calendar patek','patek annual calendar','5205 rose gold','calendrier annuel patek','patek 5205'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar 5205'; return t(
        \`Calendrier Annuel réf. 5205/1R-001 (40mm or rose, cadran bleu). Calibre 324 S C FUS. Complication : calendrier ne demande ajustement qu'une fois par an (fin février). Marque de fabrique Patek. Marché 50 000–75 000€.\`,
        \`Annual Calendar ref. 5205/1R-001 (40mm rose gold, blue dial). Calibre 324 S C FUS. Complication: calendar needs adjustment only once per year (late February). Patek hallmark. Market: €50,000–75,000.\`
      );} },

    { id:'patek_5230', kw:['5230','5230r','5230r-001','world time patek','patek world time','5230 rose gold','heure universelle patek','carte monde patek'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time 5230'; return t(
        \`World Time réf. 5230/1R-001 (38.5mm or rose, cadran guilloché). Calibre 324 S C. Affichage 24 fuseaux horaires — cadran tournant, index ville. Complication voyageur signature. Marché 50 000–75 000€.\`,
        \`World Time ref. 5230/1R-001 (38.5mm rose gold, guilloché dial). Calibre 324 S C. 24-hour time zone display — rotating dial, city indices. Signature traveler complication. Market: €50,000–75,000.\`
      );} },

    { id:'patek_5270', kw:['5270','5270p','5270p-001','perpetual calendar chronograph','patek 5270','perpetual chrono','platinum 5270','split seconds perpetual'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar Chronograph 5270'; return t(
        \`Perpetual Calendar Chronograph réf. 5270/1P-001 (41mm platine, cadran bleu). Calibre CH 29-535 (manufacture). Complication ultime : calendrier perpétuel + chronographe split-second. Pièce rare, ~700 000€+. Monumentale.\`,
        \`Perpetual Calendar Chronograph ref. 5270/1P-001 (41mm platinum, blue dial). Calibre CH 29-535 (manufacture). Ultimate complication: perpetual calendar + split-second chronograph. Rare piece, ~€700,000+. Monumental.\`
      );} },

    { id:'patek_5320', kw:['5320','5320g','5320g-001','perpetual calendar patek','patek 5320','calendrier perpétuel','white gold perpetual','patek qp','5320g white gold'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Perpetual Calendar 5320'; return t(
        \`Calendrier Perpétuel réf. 5320/1G-001 (40mm or blanc, cadran bleu). Calibre 240 Q. Ne demande aucun ajustement jusqu'en 2100. Complication mécaniste suprême. Parmi les plus beaux QP du monde. Marché 80 000–130 000€.\`,
        \`Perpetual Calendar ref. 5320/1G-001 (40mm white gold, blue dial). Calibre 240 Q. Needs no adjustment until 2100. Supreme mechanical complication. Among the finest QPs in the world. Market: €80,000–130,000.\`
      );} },

    { id:'patek_5370', kw:['5370','5370p','5370p-001','split seconds patek','patek 5370','rattrapante patek','chronograph split second','platinum split second','patek 5370 chronograph'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Split-Seconds Chronograph 5370'; return t(
        \`Split-Seconds Chronograph réf. 5370/1P-001 (41mm platine, cadran bleu). Calibre CH 29-535 (mono-poussoir rattrapante intégrale). Chronographe mécanique classique. Marché 180 000–280 000€. Ultra-sophistiqué.\`,
        \`Split-Seconds Chronograph ref. 5370/1P-001 (41mm platinum, blue dial). Calibre CH 29-535 (mono-pusher integrated split-seconds). Classic mechanical chronograph. Market: €180,000–280,000. Ultra-sophisticated.\`
      );} },

    { id:'patek_5172', kw:['5172','5172g','5172g-001','chronograph patek','patek chronograph','5172 white gold','patek mono pusher','mono poussoir patek'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Chronograph 5172'; return t(
        \`Chronographe réf. 5172/1G-001 (40mm or blanc, cadran bleu). Calibre CH 29-535 PS (mono-poussoir). Chronographe à rattrapante intégrale — ultramoderne manufacture. Marché 70 000–100 000€. Montre complexe.\`,
        \`Chronograph ref. 5172/1G-001 (40mm white gold, blue dial). Calibre CH 29-535 PS (mono-pusher). Chronograph with integrated split-seconds — ultramodern manufacture. Market: €70,000–100,000. Complex watch.\`
      );} },

    { id:'patek_5960', kw:['5960','5960p','5960p-001','annual calendar flyback','patek 5960','flyback chronograph','platinum annual calendar','5960 platinum'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar Flyback 5960'; return t(
        \`Annual Calendar Flyback Chronographe réf. 5960/1P-001 (41mm platine, cadran noir). Calibre CH 29-535 PS (mono-poussoir flyback intégral). Calendrier annuel + chronographe. Haute complication sport. Marché 300 000€+.\`,
        \`Annual Calendar Flyback Chronograph ref. 5960/1P-001 (41mm platinum, black dial). Calibre CH 29-535 PS (mono-pusher integrated flyback). Annual calendar + chronograph. High-tech sports complication. Market: €300,000+.\`
      );} },

    { id:'patek_5930', kw:['5930','5930p','5930p-001','world time flyback','patek 5930','world time chronograph','platinum world time','5930 world time'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time Flyback Chronograph 5930'; return t(
        \`World Time Flyback Chronographe réf. 5930/1P-001 (41mm platine, cadran noir). Calibre CH 29-535 PS. Monde entier + chronographe flyback — montre voyageur-sport ultime. Très rare. Marché 280 000–380 000€.\`,
        \`World Time Flyback Chronograph ref. 5930/1P-001 (41mm platinum, black dial). Calibre CH 29-535 PS. Full world + flyback chronograph — ultimate traveler-sport watch. Very rare. Market: €280,000–380,000.\`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // GRAND COMPLICATIONS (Minute Repeaters, Tourbillons, Ultra-Haute Horlogerie)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_5531', kw:['5531','5531p','5531p-001','minute repeater world time','patek 5531','sonnerie world time','patek chiming world time','repeater world time'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater World Time 5531'; return t(
        \`Répétition Minutes World Time réf. 5531/1P-001 (42mm platine, cadran noir). Calibre 300 Soneria (sonnerie intégrale). Combine deux ultimes complications : répétition minutes + heure universelle. Pièce muséale. Marché 800 000€+.\`,
        \`Minute Repeater World Time ref. 5531/1P-001 (42mm platinum, black dial). Calibre 300 Soneria (integrated chiming). Combines two ultimate complications: minute repeater + world time. Museum piece. Market: €800,000+.\`
      );} },

    { id:'patek_6300', kw:['6300','grandmaster chime','patek 6300','6300p','patek most expensive','reference 6300','chiming watch','20 complications'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Grandmaster Chime 6300'; return t(
        \`Grandmaster Chime réf. 6300P-001 (42.2mm platine, cadran bleu). Calibre 300 GC (20 complications, 1328 composants). Montre la plus complexe ET la plus chère jamais produite par Patek : enchères 31M$ (2019). Objet purement artistique.\`,
        \`Grandmaster Chime ref. 6300P-001 (42.2mm platinum, blue dial). Calibre 300 GC (20 complications, 1328 components). Most complex AND most expensive watch ever produced by Patek: auctioned $31M (2019). Pure art object.\`
      );} },

    { id:'patek_5539', kw:['5539','5539p','5539p-001','tourbillon minute repeater','patek 5539','repeater tourbillon','patek sonnerie tourbillon','platinum repeater'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Tourbillon Minute Repeater 5539'; return t(
        \`Tourbillon Répétition Minutes réf. 5539/1P-001 (42mm platine, cadran bleu). Calibre 300 Sirius. Combine tourbillon visible + sonnerie minutes. Ultra-rare : ~100 pièces fabrication annuelle. Marché 400 000–600 000€.\`,
        \`Tourbillon Minute Repeater ref. 5539/1P-001 (42mm platinum, blue dial). Calibre 300 Sirius. Combines visible tourbillon + minute chiming. Ultra-rare: ~100 pieces annual production. Market: €400,000–600,000.\`
      );} },

    { id:'patek_5208', kw:['5208','5208p','5208p-001','minute repeater chronograph','patek 5208','repeater chronograph perpetual','tonneau case','split second repeater'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater Split-Seconds Perpetual Calendar 5208'; return t(
        \`Minute Repeater Chronographe Perpétuel réf. 5208/1P-001 (42mm platine, boîtier tonneau). Calibre 300 SQU (sonnerie monopoussoir + split-second + QP). Trois ultimes complications en une montre. Muséale. Marché 1M€+.\`,
        \`Minute Repeater Split-Seconds Perpetual Calendar ref. 5208/1P-001 (42mm platinum, tonneau case). Calibre 300 SQU (mono-pusher chiming + split-second + QP). Three ultimate complications in one watch. Museum piece. Market: €1M+.\`
      );} },

    { id:'patek_5303', kw:['5303','5303p','5303p-001','minute repeater tourbillon','open face','patek 5303','repeater tourbillon open','sonnerie visable'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Minute Repeater Tourbillon 5303'; return t(
        \`Minute Repeater Tourbillon Decimal réf. 5303/1P-001 (42mm platine, boîtier épargne ouvert). Calibre 300 Sirius. Tourbillon central visible dans le style « montre de poche savante ». Répétition sonnerie intégrale. Très rare. Marché 500 000–800 000€.\`,
        \`Minute Repeater Tourbillon Decimal ref. 5303/1P-001 (42mm platinum, open face épargne case). Calibre 300 Sirius. Central visible tourbillon in « sophisticated pocket watch » style. Integrated chiming repeater. Very rare. Market: €500,000–800,000.\`
      );} },

    // ──────────────────────────────────────────────────────────────────────────
    // LADIES COLLECTION (35–36mm Refined Elegance)
    // ──────────────────────────────────────────────────────────────────────────

    { id:'patek_7118', kw:['7118','7118/1200a','nautilus ladies','nautilus 35','patek ladies','nautilus femme','ladies nautilus 35','patek women watch'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Nautilus Ladies 7118'; return t(
        \`Nautilus Femme réf. 7118/1200A-001 (35.2mm acier, cadran bleu). Calibre 324 S C. Nautilus 38.5mm refondu aux proportions féminines. Bracelet trois mailles acier. Lancé 2021. Marché 40 000–55 000€.\`,
        \`Nautilus Ladies ref. 7118/1200A-001 (35.2mm steel, blue dial). Calibre 324 S C. The 38.5mm Nautilus resized to feminine proportions. Three-link steel bracelet. Launched 2021. Market: €40,000–55,000.\`
      );} },

    { id:'patek_4910', kw:['4910','4910/10a','twenty 4 quartz','twenty4 rectangle','twenty4 femme','patek ladies quartz','rectangle ladies','4910 diamants'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Twenty~4 Rectangle 4910'; return t(
        \`Twenty~4 Quartz réf. 4910/10A-011 (25×28mm, cadran bleu, diamants). Mouvement quartz (batterie 42 mois). Montre féminine emblématique Patek — rectangulaire Art Déco. Or blanc bracelet intégré. Marché 15 000–22 000€.\`,
        \`Twenty~4 Quartz ref. 4910/10A-011 (25×28mm, blue dial, diamonds). Quartz movement (42-month battery). Patek's iconic ladies watch — rectangular Art Deco. White gold integrated bracelet. Market: €15,000–22,000.\`
      );} },

    { id:'patek_7300', kw:['7300','7300/1200a','twenty 4 automatic','patek 7300','twenty4 round','ladies automatic','patek ladies round','7300 rose gold'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Twenty~4 Automatic 7300'; return t(
        \`Twenty~4 Automatique réf. 7300/1200A-001 (33mm or rose, cadran bleu). Calibre 324 S C (45h). Version moderne ronde : transition quartz → mécanique. Bracelet or rose intégré. Lancé 2021. Marché 28 000–42 000€.\`,
        \`Twenty~4 Automatic ref. 7300/1200A-001 (33mm rose gold, blue dial). Calibre 324 S C (45h). Modern round version: quartz → mechanical transition. Integrated rose gold bracelet. Launched 2021. Market: €28,000–42,000.\`
      );} },

    // ═══════════════════════════════════════════════════════════════════════════
    // Additional Specialized Models
    // ═══════════════════════════════════════════════════════════════════════════

    { id:'patek_5131', kw:['5131','5131r','5131r-001','world time jump','patek 5131','world time rose gold','24 hour indicator'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='World Time Jump Hour 5131'; return t(
        \`World Time Jump réf. 5131/1R-001 (38mm or rose, cadran noir). Calibre 324 S C. Variation world time avec saut horaire - index 24 villes. Marché 45 000–65 000€.\`,
        \`World Time Jump ref. 5131/1R-001 (38mm rose gold, black dial). Calibre 324 S C. World time variant with hour jump - 24 city indices. Market: €45,000–65,000.\`
      );} },

    { id:'patek_5172r', kw:['5172r','5172r-001','chronograph rose gold','patek chronograph rose','chronographe 5172 or rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Chronograph 5172 Rose Gold'; return t(
        \`Chronographe réf. 5172/1R-001 (40mm or rose, cadran bleu). Calibre CH 29-535 PS (mono-poussoir). Variante or rose du chronographe sport-chic Patek. Marché 65 000–90 000€.\`,
        \`Chronograph ref. 5172/1R-001 (40mm rose gold, blue dial). Calibre CH 29-535 PS (mono-pusher). Rose gold variant of Patek's sport-chic chronograph. Market: €65,000–90,000.\`
      );} },

    { id:'patek_5960r', kw:['5960r','5960r-001','annual calendar flyback rose gold','patek 5960 rose','flyback annual calendar rose'],
      r:()=>{ ctx.brand='Patek Philippe'; ctx.model='Annual Calendar Flyback Rose Gold 5960'; return t(
        \`Annual Calendar Flyback réf. 5960/1R-001 (41mm or rose, cadran bleu). Calibre CH 29-535 PS. Variation or rose de l'annual calendar chronographe flyback. Marché 250 000–350 000€.\`,
        \`Annual Calendar Flyback ref. 5960/1R-001 (41mm rose gold, blue dial). Calibre CH 29-535 PS. Rose gold variant of annual calendar flyback chronograph. Market: €250,000–350,000.\`
      );} },

`;

// Insert the new entries
const newCode = code.slice(0, pos) + entries + '\n    ' + code.slice(pos);

// Write back to the file
fs.writeFileSync('js/chatbot.js', newCode);

console.log('✓ Successfully expanded Patek Philippe KB entries');
console.log('✓ Inserted comprehensive model coverage with full specs');
console.log('✓ All entries include bilingual (FR/EN) content');
console.log('✓ Keywords optimized for 3-word compounds (9pts scoring)');
console.log('Done.');
