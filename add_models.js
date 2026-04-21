const fs = require('fs');
let code = fs.readFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', 'utf8');

// ═══════════════════════════════════════════════════════════════════
// 1. NEW ROLEX MODELS — insert after rolex_sky_dweller
// ═══════════════════════════════════════════════════════════════════
const rolex_new = `
    { id:'rolex_air_king', kw:['air-king','air king','airking','126900','116900','rolex air king','rolex air-king','air king 40','air king green','air king cadran','air king dial','air king black','air king rolex','réf 126900','ref 126900','new air king','air king 2022','air king couronne','air king crown guard'],
      r:()=>{ ctx.brand='Rolex'; return t(
        \`L'Air-King (réf. 126900, 40mm) est la Rolex d'aviation. Cadran noir distinctif, chiffres 3-6-9 colorés, couronne protégée. Calibre 3230, 70h de réserve. Marché ~8 000–10 000€. Contactez-nous pour sourcing.\`,
        \`The Air-King (ref. 126900, 40mm) is Rolex's aviation watch. Distinctive black dial, coloured 3-6-9 numerals, crown guard. Cal. 3230, 70h reserve. Market ~€8,000–10,000. Contact us to source.\`
      );} },

    { id:'rolex_cellini', kw:['cellini','rolex cellini','50505','50509','50515','50519','50525','50535','cellini moonphase','cellini date','cellini time','cellini dual time','rolex dress','rolex habillée','rolex classique','rolex formal','cellini or','cellini gold','cellini prince','cellini danaos','cellini cestello'],
      r:()=>{ ctx.brand='Rolex'; return t(
        \`La Cellini est la ligne habillée de Rolex. Boîtier or 39mm, cadran classique. Moonphase (réf. 50535), Date (réf. 50519), Time (réf. 50509). Marché 15 000–25 000€. Nous pouvons sourcer.\`,
        \`Cellini is Rolex's dress line. 39mm gold case, classic dial. Moonphase (ref. 50535), Date (ref. 50519), Time (ref. 50509). Market €15,000–25,000. We can source.\`
      );} },

    { id:'rolex_pearlmaster', kw:['pearlmaster','pearl master','rolex pearlmaster','86349','81319','86348','81349','86285','pearlmaster 39','pearlmaster 34','pearlmaster diamants','pearlmaster diamonds','pearlmaster or','pearlmaster gold','rolex bijou','jewel rolex','gem set rolex','rolex sertie','haute joaillerie rolex'],
      r:()=>{ ctx.brand='Rolex'; return t(
        \`Le Pearlmaster est la montre joaillerie de Rolex. Boîtier 39mm ou 34mm, lunette sertie diamants/pierres, or massif. Marché 30 000–80 000€+ selon sertissage. Pièce rare — contactez-nous.\`,
        \`The Pearlmaster is Rolex's jewellery watch. 39mm or 34mm case, gem-set bezel, solid gold. Market €30,000–80,000+ depending on setting. Rare piece — contact us.\`
      );} },

`;

// ═══════════════════════════════════════════════════════════════════
// 2. NEW AP MODELS — insert after ap_code_1159
// ═══════════════════════════════════════════════════════════════════
const ap_new = `
    { id:'ap_millenary', kw:['millenary','millénaire','ap millenary','millenary ap','77247','77302','15350','millenary ovale','millenary oval','millenary openworked','millenary squelette','millenary femme','millenary women','millenary off-center','millenary dead beat','deadbeat seconds','ap ovale','oval ap'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`La Millenary est la ligne ovale d'AP, cadran décentré, mécanique visible. Femmes (réf. 77247, 77302) et hommes (réf. 15350). Marché 15 000–35 000€. Contactez-nous pour sourcing.\`,
        \`The Millenary is AP's oval collection, off-center dial, visible mechanics. Ladies (ref. 77247, 77302) and men's (ref. 15350). Market €15,000–35,000. Contact us to source.\`
      );} },

    { id:'ap_jules_audemars', kw:['jules audemars','jules ap','ap jules','ap classique','ap dress','ap habillée','15180','15170','26153','26320','minute repeater ap','ap minute repeater','ap tourbillon','ap grande complication','ap sonnerie','ap chiming','ap cathedral','Jules Audemars'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Jules Audemars : la ligne classique/haute horlogerie d'AP. Tourbillons, répétitions minutes, calendriers perpétuels. Boîtier rond, or. Marché 20 000€ à 500 000€+. Contactez-nous.\`,
        \`Jules Audemars: AP's classic/haute horlogerie line. Tourbillons, minute repeaters, perpetual calendars. Round gold case. Market €20,000 to €500,000+. Contact us.\`
      );} },

    { id:'ap_royal_oak_perpetual', kw:['royal oak perpetual calendar','royal oak perpétuel','26574','26574st','26574or','royal oak calendrier','ap perpetual calendar','ap calendrier perpétuel','26586','royal oak 41 calendar','ro perpetual','ro calendar'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Royal Oak Calendrier Perpétuel (réf. 26574, 41mm). Jour, date, mois, phase de lune, cycle bissextile. Marché acier ~90 000–120 000€. Pièce d'exception — contactez-nous.\`,
        \`Royal Oak Perpetual Calendar (ref. 26574, 41mm). Day, date, month, moon phase, leap year. Steel market ~€90,000–120,000. Exceptional piece — contact us.\`
      );} },

    { id:'ap_royal_oak_tourbillon', kw:['royal oak tourbillon','ap tourbillon royal oak','26530','26522','26510','26516','tourbillon ap acier','tourbillon ap or','royal oak flying tourbillon','royal oak skeleton tourbillon','ap squelette tourbillon','ap skeleton tourbillon'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Royal Oak Tourbillon (réf. 26530, 26522). Tourbillon volant, 41mm. Acier ~120 000€+, or ~180 000€+. Savoir-faire haute horlogerie AP au design sportif. Contactez-nous.\`,
        \`Royal Oak Tourbillon (ref. 26530, 26522). Flying tourbillon, 41mm. Steel ~€120,000+, gold ~€180,000+. AP haute horlogerie in a sporty design. Contact us.\`
      );} },

    { id:'ap_royal_oak_concept', kw:['royal oak concept','ap concept','26265','26589','concept ap','concept gmt','concept tourbillon','concept flying tourbillon','concept lab','concept carbone','concept carbon','concept forged carbon','ap futuriste','ap futuristic','ap high tech'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Royal Oak Concept : la ligne avant-gardiste d'AP. Matériaux innovants (carbone forgé, céramique, titane), tourbillons volants, designs futuristes. Marché 100 000€ à 500 000€+. Contactez-nous.\`,
        \`Royal Oak Concept: AP's avant-garde line. Innovative materials (forged carbon, ceramic, titanium), flying tourbillons, futuristic designs. Market €100,000 to €500,000+. Contact us.\`
      );} },

    { id:'ap_royal_oak_selfwinding', kw:['royal oak selfwinding','royal oak automatique','26331','26315','15450','royal oak 37mm','royal oak bleu 41','royal oak noir 41','royal oak argent','26331st','26315st','15450st','royal oak bracelet','royal oak date','royal oak 3 aiguilles','royal oak three hand'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Royal Oak Selfwinding : Chronographe (réf. 26331, 41mm) ou 3 aiguilles (réf. 15450, 37mm). Cadrans bleu, noir, argent. Marché chrono acier ~30 000–45 000€, 3h acier ~25 000–35 000€. Contactez-nous.\`,
        \`Royal Oak Selfwinding: Chronograph (ref. 26331, 41mm) or 3-hand (ref. 15450, 37mm). Blue, black, silver dials. Chrono steel market ~€30,000–45,000, 3h steel ~€25,000–35,000. Contact us.\`
      );} },

    { id:'ap_royal_oak_double_balance', kw:['double balance','double balancier','ap double balance','15416','15407','openworked','openwork ap','squelette royal oak','skeleton royal oak','royal oak openworked','royal oak squelette','ap ajouré','ap openwork'],
      r:()=>{ ctx.brand='Audemars Piguet'; return t(
        \`Royal Oak Double Balancier Openworked (réf. 15416, 15407). Mouvement squelette visible, double balancier. Marché or ~60 000–90 000€. Haute horlogerie sport-chic. Contactez-nous.\`,
        \`Royal Oak Double Balance Openworked (ref. 15416, 15407). Visible skeleton movement, double balance wheel. Gold market ~€60,000–90,000. Sport-chic haute horlogerie. Contact us.\`
      );} },

`;

// ═══════════════════════════════════════════════════════════════════
// 3. NEW PATEK MODELS — insert after patek_complications
// ═══════════════════════════════════════════════════════════════════
const patek_new = `
    { id:'patek_twenty4', kw:['twenty 4','twenty~4','twenty four','twenty4','patek femme','patek ladies','patek women','patek lady','4910','4910/10a','7300','7300/1200a','twenty4 automatic','twenty 4 automatique','rectangulaire patek','patek rectangulaire','patek quartz','twenty4 or','twenty4 acier','twenty4 diamonds','twenty4 diamants'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Twenty~4 : la montre féminine iconique de Patek. Quartz rectangle (réf. 4910, ~12 000–18 000€) ou automatique ronde (réf. 7300, ~25 000–35 000€). Acier ou or, avec ou sans diamants. Contactez-nous.\`,
        \`Twenty~4: Patek's iconic ladies' watch. Quartz rectangle (ref. 4910, ~€12,000–18,000) or automatic round (ref. 7300, ~€25,000–35,000). Steel or gold, with or without diamonds. Contact us.\`
      );} },

    { id:'patek_gondolo', kw:['gondolo','patek gondolo','5098','5124','5200','7099','gondolo art deco','gondolo rectangulaire','rectangular patek','patek rectangle','tonneau patek','patek tonneau','art deco patek','gondolo or','gondolo gold'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Gondolo : la ligne Art Déco de Patek. Boîtiers rectangulaires et tonneau, or. Réf. 5124 (rectangle), 5098 (tonneau), 5200 (8 jours). Marché 20 000–40 000€. Contactez-nous.\`,
        \`Gondolo: Patek's Art Deco line. Rectangular and tonneau cases, gold. Ref. 5124 (rectangle), 5098 (tonneau), 5200 (8-day). Market €20,000–40,000. Contact us.\`
      );} },

    { id:'patek_golden_ellipse', kw:['golden ellipse','ellipse','patek ellipse','5738','3738','3748','ellipse or','ellipse gold','patek ovale','ellipse vintage','golden ellipse patek','ellipse bleu','ellipse blue','nombre d or','golden ratio'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Golden Ellipse : créée 1968, proportions du nombre d'or. Boîtier ovale, cadran bleu soleil, or jaune (réf. 5738). Ultra-mince. Marché 25 000–40 000€. Pièce discrète et raffinée. Contactez-nous.\`,
        \`Golden Ellipse: created 1968, golden ratio proportions. Oval case, sunburst blue dial, yellow gold (ref. 5738). Ultra-thin. Market €25,000–40,000. Discreet and refined. Contact us.\`
      );} },

    { id:'patek_world_time', kw:['world time','heure universelle','5230','5231','5131','5110','5130','patek world time','patek heure universelle','world time patek','carte monde','world map','cloisonné','émail','enamel dial','fuseaux horaires','time zones','24 fuseaux','world time or','world time rose gold'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`World Time : affichage 24 fuseaux horaires. Réf. 5230 (cadran guilloché), 5231 (émail cloisonné). Or blanc ou rose, 38.5mm. Marché 40 000–80 000€+. Haute horlogerie voyageur. Contactez-nous.\`,
        \`World Time: displays 24 time zones. Ref. 5230 (guilloché dial), 5231 (cloisonné enamel). White or rose gold, 38.5mm. Market €40,000–80,000+. Travel haute horlogerie. Contact us.\`
      );} },

    { id:'patek_perpetual_calendar', kw:['patek perpetual calendar','patek calendrier perpétuel','5320','5327','5140','5139','5940','3940','patek perpétuel','patek perpetual','perpetual patek','calendrier perpétuel patek','5320g','grand complication patek','patek qp'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Calendrier Perpétuel Patek : ne nécessite aucun ajustement jusqu'en 2100. Réf. 5320G (or gris, ~80 000€+), 5327 (or rose), 5940 (coussin). Parmi les plus beaux QP au monde. Contactez-nous.\`,
        \`Patek Perpetual Calendar: needs no adjustment until 2100. Ref. 5320G (white gold, ~€80,000+), 5327 (rose gold), 5940 (cushion). Among the finest QPs in the world. Contact us.\`
      );} },

    { id:'patek_minute_repeater', kw:['patek minute repeater','répétition minutes patek','patek sonnerie','5078','5178','5539','patek chiming','sonnerie patek','carillon patek','cathedral gong','gong cathédrale','patek 5078','patek 5539','minute repeater 5078'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Répétition Minutes Patek : sonnerie mécanique des heures, quarts et minutes. Réf. 5078 (or, ~350 000€+), 5539 (tourbillon + répétition). Parmi les plus hautes complications horlogères. Contactez-nous.\`,
        \`Patek Minute Repeater: mechanical chiming of hours, quarters and minutes. Ref. 5078 (gold, ~€350,000+), 5539 (tourbillon + repeater). Among the highest horological complications. Contact us.\`
      );} },

    { id:'patek_grand_complications', kw:['patek grand complication','grande complication patek','sky moon','sky moon tourbillon','6002','6300','5016','5002','5175','grandmaster chime','celestial','patek celestial','6104','patek étoiles','patek stars','ciel étoilé','starry sky','patek astronomique','astronomical patek','most complicated watch','patek million','patek enchères','patek auction'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Grandes Complications Patek : les montres les plus complexes au monde. Sky Moon Tourbillon (réf. 6002, ~1.5M€+), Grandmaster Chime (réf. 6300, 20 complications). Celestial (réf. 6104). Pièces muséales. Contactez-nous.\`,
        \`Patek Grand Complications: the world's most complex watches. Sky Moon Tourbillon (ref. 6002, ~€1.5M+), Grandmaster Chime (ref. 6300, 20 complications). Celestial (ref. 6104). Museum pieces. Contact us.\`
      );} },

    { id:'patek_chronograph', kw:['patek chronograph','patek chronographe','5172','5170','5070','5204','chronographe patek','chrono patek','patek chrono acier','patek chrono or','split seconds patek','rattrapante patek','5172g','5204r','5370'],
      r:()=>{ ctx.brand='Patek Philippe'; return t(
        \`Chronographes Patek : Réf. 5172G (mono-poussoir, or gris, ~60 000€+), 5204R (rattrapante calendrier perpétuel, ~400 000€+). Mouvements manufacture CH 29-535. Contactez-nous.\`,
        \`Patek Chronographs: Ref. 5172G (mono-pusher, white gold, ~€60,000+), 5204R (split-second perpetual calendar, ~€400,000+). Manufacture movements CH 29-535. Contact us.\`
      );} },

`;

// ═══════════════════════════════════════════════════════════════════
// 4. NEW RM MODELS — insert after rm_tourbillon
// ═══════════════════════════════════════════════════════════════════
const rm_new = `
    { id:'rm_011', kw:['rm 011','rm011','rm 11','rm11','rm 011 felipe massa','felipe massa','rm flyback','rm chronographe flyback','rm 011 titanium','rm 011 or rose','rm 011 rose gold','rm 011 carbone','rm 011 ntpt','rm 011 prix','rm 011 price'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 011 Felipe Massa : chronographe flyback + calendrier annuel. Boîtier tonneau titane/or rose/carbone NTPT, 50mm. Marché 150 000–300 000€ selon matériau. Pièce emblématique RM. Contactez-nous.\`,
        \`RM 011 Felipe Massa: flyback chronograph + annual calendar. Tonneau case titanium/rose gold/carbon NTPT, 50mm. Market €150,000–300,000 depending on material. Iconic RM piece. Contact us.\`
      );} },

    { id:'rm_027', kw:['rm 027','rm027','rm 27','rm27','rm nadal','rafael nadal','nadal watch','rm 27-01','rm 27-02','rm 27-03','rm 27-04','rm nadal tourbillon','montre nadal','nadal rm','rm ultra léger','rm ultralight','rm 20 grammes','rm 20 grams','lightest watch'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 027 Rafael Nadal : tourbillon ultra-léger (~20g avec bracelet). Boîtier carbone NTPT, conçue pour résister aux chocs du tennis. Marché 500 000€ à 1M+. Éditions très limitées. Contactez-nous.\`,
        \`RM 027 Rafael Nadal: ultra-light tourbillon (~20g with strap). Carbon NTPT case, designed to withstand tennis impacts. Market €500,000 to 1M+. Very limited editions. Contact us.\`
      );} },

    { id:'rm_035', kw:['rm 035','rm035','rm 35','rm35','rm 035 americas','rm 35-01','rm 35-02','rm 35-03','rm 035 nadal','rm baby nadal','rm nadal automatique','rm 035 carbone','rm 035 ntpt','rm 035 prix'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 035 "Baby Nadal" : automatique ultra-léger. Boîtier tonneau carbone NTPT/quartz TPT, calibre RMUL3. Marché 150 000–250 000€. Plus accessible que le RM 027. Contactez-nous.\`,
        \`RM 035 "Baby Nadal": ultra-light automatic. Tonneau carbon NTPT/quartz TPT case, calibre RMUL3. Market €150,000–250,000. More accessible than the RM 027. Contact us.\`
      );} },

    { id:'rm_055', kw:['rm 055','rm055','rm 55','rm55','rm 055 bubba watson','bubba watson','rm 055 white','rm 055 ceramic','rm 055 carbone','rm 055 prix','rm golf','rm golfeur'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 055 Bubba Watson : boîtier céramique blanche/carbone, résistant aux chocs du golf. Mouvement squelette, 49.9mm. Marché 150 000–200 000€. Contactez-nous pour sourcing.\`,
        \`RM 055 Bubba Watson: white ceramic/carbon case, golf-shock resistant. Skeleton movement, 49.9mm. Market €150,000–200,000. Contact us to source.\`
      );} },

    { id:'rm_010', kw:['rm 010','rm010','rm 10','rm10','rm 010 automatique','rm 010 automatic','rm 010 titane','rm 010 titanium','rm 010 or rose','rm 010 rose gold','rm 010 acier','rm entry level','rm entrée de gamme'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 010 : automatique avec date, l'une des RM les plus classiques. Boîtier tonneau titane/or rose, 48mm. Marché 100 000–180 000€. Point d'entrée RM historique. Contactez-nous.\`,
        \`RM 010: automatic with date, one of the most classic RMs. Tonneau titanium/rose gold case, 48mm. Market €100,000–180,000. Historic RM entry point. Contact us.\`
      );} },

    { id:'rm_030', kw:['rm 030','rm030','rm 30','rm30','rm 030 americas','rm 030 declutchable rotor','declutchable','rotor débrayable','rm 030 titane','rm 030 carbone','rm 030 ceramique','rm 030 automatic'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 030 : automatique avec rotor débrayable breveté. Boîtier tonneau titane/céramique/carbone. Marché 130 000–200 000€. Innovation mécanique signature RM. Contactez-nous.\`,
        \`RM 030: automatic with patented declutchable rotor. Tonneau titanium/ceramic/carbon case. Market €130,000–200,000. Signature RM mechanical innovation. Contact us.\`
      );} },

    { id:'rm_067', kw:['rm 067','rm067','rm 67','rm67','rm 67-01','rm 67-02','rm extra flat','rm extra plat','rm mince','rm thin','rm slim','rm 067 automatique','rm sportif','rm athlete edition','rm 67 carbone','rm 67 titane','rm everyday','rm quotidien'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 67-01 Extra Flat : la RM la plus fine (7.75mm). Automatique, boîtier tonneau titane/carbone. Marché 100 000–150 000€. RM 67-02 en éditions athlètes (sprint, saut en hauteur). Contactez-nous.\`,
        \`RM 67-01 Extra Flat: thinnest RM (7.75mm). Automatic, tonneau titanium/carbon case. Market €100,000–150,000. RM 67-02 in athlete editions (sprint, high jump). Contact us.\`
      );} },

    { id:'rm_072', kw:['rm 072','rm072','rm 72','rm72','rm 72-01','rm 72-01 lifestyle','rm lifestyle','rm chronographe','rm chrono flyback','rm 072 automatique','rm 072 ceramic','rm 072 céramique'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 72-01 Lifestyle Chronographe : flyback automatique, boîtier tonneau céramique/titane. Design contemporain à double compteur. Marché 180 000–250 000€. Contactez-nous.\`,
        \`RM 72-01 Lifestyle Chronograph: automatic flyback, tonneau ceramic/titanium case. Contemporary twin-counter design. Market €180,000–250,000. Contact us.\`
      );} },

    { id:'rm_005', kw:['rm 005','rm005','rm 5','rm5','rm 005 felipe massa','rm 005 automatique','rm 005 automatic','rm 005 titane','rm 005 titanium','rm premiere','rm first automatic'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 005 Felipe Massa : premier automatique RM (2003). Boîtier tonneau titane, masse oscillante variable. Marché 80 000–120 000€. Pièce historique de la marque. Contactez-nous.\`,
        \`RM 005 Felipe Massa: first RM automatic (2003). Tonneau titanium case, variable-geometry rotor. Market €80,000–120,000. Historic piece for the brand. Contact us.\`
      );} },

    { id:'rm_016', kw:['rm 016','rm016','rm 16','rm16','rm extra plat ancien','rm 016 automatique','rm 016 automatic','rm 016 titane','rm 016 or','rm toro','rm culture'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 016 : automatique extra-plat, la première RM fine. Boîtier tonneau titane/or, réhaut incliné distinctif. Marché 80 000–130 000€. Contactez-nous.\`,
        \`RM 016: extra-flat automatic, the first thin RM. Tonneau titanium/gold case, distinctive angled flange. Market €80,000–130,000. Contact us.\`
      );} },

    { id:'rm_050', kw:['rm 050','rm050','rm 50','rm50','rm 50-03','rm 50-03 mclaren','mclaren rm','rm tourbillon chrono','rm chronographe tourbillon','rm split second tourbillon','rm 056','rm 056 saphir','rm sapphire','rm transparent'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 050 Tourbillon Chronographe : chronographe rattrapante + tourbillon. Pièce haute horlogerie RM. RM 056 en saphir transparent (~2M€). RM 50-03 McLaren (graphène, le plus léger). Contactez-nous.\`,
        \`RM 050 Tourbillon Chronograph: split-second chronograph + tourbillon. RM haute horlogerie piece. RM 056 in transparent sapphire (~€2M). RM 50-03 McLaren (graphene, lightest). Contact us.\`
      );} },

    { id:'rm_069', kw:['rm 069','rm069','rm 69','rm69','rm erotic','rm érotique','rm 069 tourbillon','rm fun','rm playful','rm man'],
      r:()=>{ ctx.brand='Richard Mille'; return t(
        \`RM 69 Erotic Tourbillon : tourbillon avec message rotatif érotique sur le cadran. Pièce ludique et provocatrice, édition très limitée. Marché 500 000€+. Contactez-nous.\`,
        \`RM 069 Erotic Tourbillon: tourbillon with rotating erotic message on dial. Playful and provocative piece, very limited edition. Market €500,000+. Contact us.\`
      );} },

`;

// ═══════════════════════════════════════════════════════════════════
// 5. NEW CARTIER MODELS — insert after cartier_juste_un_clou
// ═══════════════════════════════════════════════════════════════════
const cartier_new = `
    { id:'cartier_panthere', kw:['panthère','panthere','panthere cartier','panthère de cartier','cartier panthere','cartier panthère','wspn0007','wspn0006','wspn0019','panthere mini','panthere small','panthere medium','panthere or','panthere gold','panthere acier','panthere steel','panthere quartz','montre panthere','chaînon','chain bracelet cartier','art deco cartier'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Panthère de Cartier : montre iconique Art Déco, bracelet chaînon souple. Mini, Small, Medium. Acier (~4 000–6 000€), or (~10 000–25 000€). Relancée en 2017. Contactez-nous.\`,
        \`Panthère de Cartier: iconic Art Deco watch, supple chain bracelet. Mini, Small, Medium. Steel (~€4,000–6,000), gold (~€10,000–25,000). Relaunched 2017. Contact us.\`
      );} },

    { id:'cartier_pasha', kw:['pasha','pasha cartier','pasha de cartier','pasha 41','pasha 35','pasha chronographe','pasha grille','pasha 2021','wspa0009','wspa0013','pasha acier','pasha or','pasha skeleton','pasha squelette','cartier pasha','pasha seatimer','pasha c'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Pasha de Cartier : boîtier rond avec couronne vissée protégée, cadran grillé signature. Relancé 2020 en 41mm et 35mm. Acier ~7 000–10 000€, or ~15 000–25 000€. Contactez-nous.\`,
        \`Pasha de Cartier: round case with screw-down protected crown, signature grid dial. Relaunched 2020 in 41mm and 35mm. Steel ~€7,000–10,000, gold ~€15,000–25,000. Contact us.\`
      );} },

    { id:'cartier_drive', kw:['drive','drive de cartier','drive cartier','cartier drive','wsnm0004','wsnm0008','drive acier','drive or','drive automatique','drive lune','drive moonphase','coussin cartier','cushion cartier','drive 40mm','drive extra flat'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Drive de Cartier : boîtier coussin arrondi, 40mm. Automatique ou Extra-Flat. Acier ~5 000–7 000€, or ~12 000–18 000€. Montre masculine élégante. Contactez-nous pour disponibilité.\`,
        \`Drive de Cartier: rounded cushion case, 40mm. Automatic or Extra-Flat. Steel ~€5,000–7,000, gold ~€12,000–18,000. Elegant men's watch. Contact us for availability.\`
      );} },

    { id:'cartier_ronde', kw:['ronde','ronde solo','ronde de cartier','ronde louis cartier','cartier ronde','ronde must','w6700155','w6700255','wsrn0031','ronde 36','ronde 40','ronde acier','ronde or','ronde cuir','ronde leather','ronde automatique','cartier rond','round cartier'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Ronde de Cartier : forme ronde classique, chiffres romains, cabochon bleu. Ronde Solo (~2 500–4 000€), Ronde Louis Cartier or (~8 000–15 000€). Élégance intemporelle. Contactez-nous.\`,
        \`Ronde de Cartier: classic round shape, Roman numerals, blue cabochon. Ronde Solo (~€2,500–4,000), Ronde Louis Cartier gold (~€8,000–15,000). Timeless elegance. Contact us.\`
      );} },

    { id:'cartier_calibre', kw:['calibre','calibre de cartier','calibre cartier','cartier calibre','w7100015','w7100037','calibre diver','calibre plongée','calibre acier','calibre or','calibre 42mm','calibre automatique','calibre chronographe'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Calibre de Cartier : montre sport masculine, 42mm. Acier (~5 000–7 000€), or (~12 000€+). Existe en version Diver 300m. Premier mouvement manufacture Cartier (1904 MC). Contactez-nous.\`,
        \`Calibre de Cartier: men's sport watch, 42mm. Steel (~€5,000–7,000), gold (~€12,000+). Available in Diver 300m version. First Cartier manufacture movement (1904 MC). Contact us.\`
      );} },

    { id:'cartier_cle', kw:['clé','clé de cartier','cle de cartier','cartier clé','cartier cle','wgcl0005','wscl0018','clé acier','clé or','clé automatique','clé 40mm','clé 35mm','couronne clé','key cartier','cartier key shape'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Clé de Cartier : couronne en forme de clé distinctive. 40mm homme, 35mm femme. Acier ~5 000–7 000€, or ~12 000€+. Design moderne lancé en 2015. Contactez-nous.\`,
        \`Clé de Cartier: distinctive key-shaped crown. 40mm men's, 35mm ladies'. Steel ~€5,000–7,000, gold ~€12,000+. Modern design launched 2015. Contact us.\`
      );} },

    { id:'cartier_crash', kw:['crash','crash cartier','cartier crash','crash watch','montre crash','crash london','crash 1967','crash surréaliste','surrealist watch','crash asymétrique','crash asymmetric','crash or','crash gold','crash limited','crash vintage','crash dali','melting watch','fondue montre'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Crash Cartier : montre surréaliste créée à Londres en 1967. Boîtier asymétrique "fondu", or, éditions très limitées. Marché vintage 50 000–200 000€+. Pièce collector rare. Contactez-nous.\`,
        \`Cartier Crash: surrealist watch created in London 1967. Asymmetric "melted" case, gold, very limited editions. Vintage market €50,000–200,000+. Rare collector piece. Contact us.\`
      );} },

    { id:'cartier_rotonde', kw:['rotonde','rotonde de cartier','cartier rotonde','rotonde tourbillon','rotonde minute repeater','rotonde mystérieuse','mysterious cartier','cartier mystère','rotonde skeleton','rotonde squelette','rotonde astrotourbillon','astrotourbillon','cartier haute horlogerie','cartier grand complication'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Rotonde de Cartier : haute horlogerie Cartier. Tourbillons, répétitions minutes, heures mystérieuses, astrotourbillon. Or, 40–45mm. Marché 50 000€ à 500 000€+. Contactez-nous.\`,
        \`Rotonde de Cartier: Cartier haute horlogerie. Tourbillons, minute repeaters, mysterious hours, astrotourbillon. Gold, 40–45mm. Market €50,000 to €500,000+. Contact us.\`
      );} },

    { id:'cartier_tortue', kw:['tortue','tortue cartier','cartier tortue','tortue or','tortue gold','tortue chronographe','tortue monopusher','tortue monopoussoir','tortue vintage','tortue xl','w1556234','tortue skeleton','cartier tonneau'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Tortue Cartier : boîtier forme tortue, design 1912. Chronographe monopoussoir, éditions limitées. Or. Marché 15 000–50 000€+. Classique de collection Cartier. Contactez-nous.\`,
        \`Cartier Tortue: tortue-shaped case, 1912 design. Mono-pusher chronograph, limited editions. Gold. Market €15,000–50,000+. Cartier collection classic. Contact us.\`
      );} },

    { id:'cartier_santos_dumont', kw:['santos dumont','santos-dumont','dumont','santos dumont cartier','ultra thin santos','santos plat','santos fin','wssa0022','wssa0032','santos dumont xl','santos dumont large','santos dumont small','dumont or','dumont acier','dumont leather','dumont cuir','santos extra plat','santos quartz'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Santos-Dumont : version ultra-plate du Santos, bracelet cuir. Small et Large. Acier ~4 000–6 000€, or ~8 000–15 000€. Hommage au pionnier de l'aviation Alberto Santos-Dumont. Contactez-nous.\`,
        \`Santos-Dumont: ultra-thin Santos version, leather strap. Small and Large. Steel ~€4,000–6,000, gold ~€8,000–15,000. Tribute to aviation pioneer Alberto Santos-Dumont. Contact us.\`
      );} },

    { id:'cartier_tank_francaise', kw:['tank française','tank francaise','française','francaise','wsta0065','wsta0074','tank francaise 2023','tank francaise acier','tank francaise or','tank française medium','tank française small','chain bracelet tank','chaîne tank'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Tank Française : bracelet chaînon intégré, boîtier incurvé. Relancée 2023 avec nouveau design. Small et Medium. Acier ~3 500–5 000€, or ~10 000€+. Contactez-nous.\`,
        \`Tank Française: integrated chain bracelet, curved case. Relaunched 2023 with new design. Small and Medium. Steel ~€3,500–5,000, gold ~€10,000+. Contact us.\`
      );} },

    { id:'cartier_tank_americaine', kw:['tank américaine','tank americaine','américaine','americaine','wsta0082','wsta0083','tank americaine 2023','elongated tank','tank allongé','tank américaine curved','cintrée','tank cintrée','tank americaine acier','tank americaine or'],
      r:()=>{ ctx.brand='Cartier'; return t(
        \`Tank Américaine : version allongée et cintrée du Tank. Relancée 2023. Acier ~5 000–8 000€, or ~12 000€+. Silhouette élégante et distinctive. Contactez-nous.\`,
        \`Tank Américaine: elongated curved Tank version. Relaunched 2023. Steel ~€5,000–8,000, gold ~€12,000+. Elegant and distinctive silhouette. Contact us.\`
      );} },

`;


// ─── Perform insertions ──────────────────────────────────────────

// 1. Insert Rolex new after sky_dweller closing },
const skyDwellerEnd = "Sky-Dweller: annual calendar + 2nd time zone. Ref. 326934 (steel/gold, ~€30,000). Not in stock currently. Contact us to source one.`\n      );} },";
if (code.includes(skyDwellerEnd)) {
  code = code.replace(skyDwellerEnd, skyDwellerEnd + '\n' + rolex_new);
  console.log('✅ Rolex new models inserted');
} else { console.log('❌ Could not find rolex_sky_dweller end marker'); }

// 2. Insert AP new after ap_code_1159 closing },
const codeEnd = "Code 11.59 (launched 2019, 40mm) is AP's new sport/dress line. Steel market ~€25,000–35,000. We can source one depending on your configuration.`\n      );} },";
if (code.includes(codeEnd)) {
  code = code.replace(codeEnd, codeEnd + '\n' + ap_new);
  console.log('✅ AP new models inserted');
} else { console.log('❌ Could not find ap_code_1159 end marker'); }

// 3. Insert Patek new after patek_complications closing },
const compEnd = "Annual calendars and mechanical complications. Among the highest watchmaking know-how in the world.`\n      );} },";
if (code.includes(compEnd)) {
  code = code.replace(compEnd, compEnd + '\n' + patek_new);
  console.log('✅ Patek new models inserted');
} else { console.log('❌ Could not find patek_complications end marker'); }

// 4. Insert RM new after rm_tourbillon closing },
const rmEnd = "RM Tourbillons (RM 001, RM 027 Nadal, RM 052…) are the iconic pieces. Market €200,000 to 2M+. Contact us for sourcing by reference.`\n      );} },";
if (code.includes(rmEnd)) {
  code = code.replace(rmEnd, rmEnd + '\n' + rm_new);
  console.log('✅ RM new models inserted');
} else { console.log('❌ Could not find rm_tourbillon end marker'); }

// 5. Insert Cartier new after cartier_juste_un_clou closing },
const clouEnd = "Juste un Clou: nail-shaped bangle, iconic since 1971.`\n      );} },";
if (code.includes(clouEnd)) {
  code = code.replace(clouEnd, clouEnd + '\n' + cartier_new);
  console.log('✅ Cartier new models inserted');
} else { console.log('❌ Could not find cartier_juste_un_clou end marker'); }

fs.writeFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', code);
console.log('\n📊 New file size: ' + code.split('\n').length + ' lines');
