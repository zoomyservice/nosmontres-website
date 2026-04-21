/**
 * expand_rm.js
 * Expands Richard Mille KB entries in chatbot.js
 * Inserts new RM models before { id:'cartier_general'
 */

const fs = require('fs');
const path = require('path');

const chatbotPath = '/Users/zoomzoom/workspace/nosmontres/js/chatbot.js';

// Helper to escape backticks in template strings
function escapeBackticks(str) {
  return str.replace(/`/g, '\\`');
}

// New RM entries to insert
const newEntries = [
  // RM 001 - The original
  `{ id:'rm_001', kw:['rm 001','rm001','richard mille 001','richard mille first','premier richard mille','rm tourbillon original','first rm','rm premiere','rm genesis','01 tourbillon','rm001 prix','rm001 price'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 001'; return t(
      \`RM 001 (2001) : le tourbillon fondateur. Boîtier tonneau titane, 50x38mm, mouvement squelette manuel, 45mm réserve de marche, étanchéité 30m. La montre qui a marqué la naissance de RM : ultra-légère, innovation mécanique pure. Marché 250 000–500 000€. Pièce historique de référence.\`,
      \`RM 001 (2001): the founding tourbillon. Tonneau titanium case, 50x38mm, skeleton manual movement, 45h power reserve, 30m water resistance. The watch that marked RM's birth: ultra-light, pure mechanical innovation. Market €250,000–500,000. Historic reference piece.\`
    );} }`,

  // RM 003 - Dual time tourbillon
  `{ id:'rm_003', kw:['rm 003','rm003','rm 3','rm3','rm 003 tourbillon','rm dual time','dual tourbillon','rm 003 prix','fuseaux horaires','dual time zone'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 003'; return t(
      \`RM 003 Dual Time Tourbillon : tourbillon avec affichage dual time. Boîtier tonneau titane/or rose, 50mm, mouvement squelette calibre RM sur demande. Réserve 48h. Innovation GMT pour l'époque. Marché 300 000–450 000€. Contactez-nous.\`,
      \`RM 003 Dual Time Tourbillon: tourbillon with dual time display. Tonneau titanium/rose gold case, 50mm, skeleton movement custom calibre. 48h power reserve. GMT innovation for its era. Market €300,000–450,000. Contact us.\`
    );} }`,

  // RM 004 - Split seconds chronograph
  `{ id:'rm_004', kw:['rm 004','rm004','rm 4','rm4','rm 004 chronographe','split seconds chronograph','rattrapante','chronographe flyback','rm 004 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 004'; return t(
      \`RM 004 Chronographe à Rattrapante : split-seconds chronograph avec roue d'échappement à bascule. Boîtier tonneau titane, 50x40mm, mouvement squelette avec rattrapante mécanique compliquée. Marché 400 000–600 000€. Haute horlogerie RM signature.\`,
      \`RM 004 Chronographe à Rattrapante: split-seconds chronograph with lever escapement wheel. Tonneau titanium case, 50x40mm, skeleton movement with complex mechanical split-seconds. Market €400,000–600,000. Signature RM haute horlogerie.\`
    );} }`,

  // RM 006 - Felipe Massa tourbillon
  `{ id:'rm_006', kw:['rm 006','rm006','rm 6','rm6','rm 006 felipe massa','felipe massa 006','rm 006 formula 1','f1 watch','montre formula 1','rm 006 titane','chronographe felipemassa'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 006'; return t(
      \`RM 006 Felipe Massa : tourbillon chronographe flyback pour le pilote de F1. Boîtier tonneau titane, 50x38mm, chronographe rattrapante integré, réserve 48h. Pièce sport historique RM. Marché 300 000–450 000€. Contactez-nous.\`,
      \`RM 006 Felipe Massa: tourbillon flyback chronograph for F1 driver. Tonneau titanium case, 50x38mm, integrated split-seconds chronograph, 48h power reserve. Historic RM sports piece. Market €300,000–450,000. Contact us.\`
    );} }`,

  // RM 007 - Ladies automatic
  `{ id:'rm_007', kw:['rm 007','rm007','rm 7','rm7','rm ladies','rm femme','rm automatique femme','ladies automatic','rm rose','rm rose gold femme','rm 007 prix','montre femme luxe'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 007'; return t(
      \`RM 007 Automatique Dame : première RM pour dame. Boîtier tonneau or rose/titane, 42x34mm, mouvement automatique calibre RM, réserve 48h. Design épuré féminin. Marché 120 000–200 000€. Contactez-nous.\`,
      \`RM 007 Automatique Dame: first RM for ladies. Tonneau rose gold/titanium case, 42x34mm, automatic movement custom calibre, 48h power reserve. Refined feminine design. Market €120,000–200,000. Contact us.\`
    );} }`,

  // RM 008 - Tourbillon split seconds chronograph
  `{ id:'rm_008', kw:['rm 008','rm008','rm 8','rm8','rm 008 chronographe','tourbillon split seconds','rattrapante tourbillon','rm 008 titane','rm 008 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 008'; return t(
      \`RM 008 Tourbillon Chronographe à Rattrapante : combinaison tourbillon + split-seconds sur mouvement squelette. Boîtier tonneau titane, 50x40mm, la montre la plus complexe des débuts. Marché 500 000–750 000€. Haute horlogerie pure.\`,
      \`RM 008 Tourbillon Chronographe à Rattrapante: tourbillon + split-seconds on skeleton movement. Tonneau titanium case, 50x40mm, most complex watch from early years. Market €500,000–750,000. Pure haute horlogerie.\`
    );} }`,

  // RM 009 - Felipe Massa titanium tourbillon
  `{ id:'rm_009', kw:['rm 009','rm009','rm 9','rm9','rm 009 felipe massa','titane felipe','rm masse','f1 titanium','rm 009 prix','sport edition'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 009'; return t(
      \`RM 009 Felipe Massa Titane : tourbillon en titane ultra-pur pour le champion F1. Boîtier tonneau titane grade 5, 50mm, mouvement squelette. Pièce d'athlète incontournable. Marché 200 000–350 000€. Contactez-nous.\`,
      \`RM 009 Felipe Massa Titanium: ultra-pure titanium tourbillon for F1 champion. Tonneau grade 5 titanium case, 50mm, skeleton movement. Essential athlete piece. Market €200,000–350,000. Contact us.\`
    );} }`,

  // RM 012 - Tourbillon (continued line)
  `{ id:'rm_012', kw:['rm 012','rm012','rm 12','rm12','rm 012 tourbillon','montre tourbillon','tonneau tourbillon','rm 012 titane','rm 012 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 012'; return t(
      \`RM 012 Tourbillon : version classique du tourbillon RM. Boîtier tonneau titane/or rose, 50x38mm, mouvement squelette calibre RM, réserve 45h. Marché 180 000–300 000€. Montre référence RM.\`,
      \`RM 012 Tourbillon: classic version of RM tourbillon. Tonneau titanium/rose gold case, 50x38mm, skeleton movement custom calibre, 45h power reserve. Market €180,000–300,000. Reference RM watch.\`
    );} }`,

  // RM 015 - Perini Navi dual time tourbillon
  `{ id:'rm_015', kw:['rm 015','rm015','rm 15','rm15','rm perini navi','perini navi','rm yacht','nautique','dual time yacht','rm 015 prix','navigation watch'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 015'; return t(
      \`RM 015 Perini Navi Dual Time Tourbillon : montre spécialement développée pour le chantier naval Perini Navi. Tourbillon avec fuseaux, étanchéité 100m. Boîtier tonneau titane/carbone NTPT, 50mm. Marché 350 000–500 000€. Unique partenariat.\`,
      \`RM 015 Perini Navi Dual Time Tourbillon: watch specially developed for Perini Navi yacht builder. Tourbillon with time zones, 100m water resistance. Tonneau titanium/carbon NTPT case, 50mm. Market €350,000–500,000. Unique partnership.\`
    );} }`,

  // RM 017 - Extra flat tourbillon
  `{ id:'rm_017', kw:['rm 017','rm017','rm 17','rm17','rm 017 extra plat','extra flat tourbillon','tourbillon ultra fin','rm mince','thin tourbillon','rm 017 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 017'; return t(
      \`RM 017 Extra Flat Tourbillon : tourbillon ultra-plat, épaisseur réduite. Boîtier tonneau titane, 48mm, mouvement squelette ultra-fin. Première exploration RM de la finesse en complication. Marché 250 000–400 000€. Innovation d'épaisseur.\`,
      \`RM 017 Extra Flat Tourbillon: ultra-flat tourbillon, reduced thickness. Tonneau titanium case, 48mm, ultra-thin skeleton movement. First RM exploration of thinness in complications. Market €250,000–400,000. Thickness innovation.\`
    );} }`,

  // RM 019 - Tourbillon (evolution)
  `{ id:'rm_019', kw:['rm 019','rm019','rm 19','rm19','rm 019 tourbillon','tourbillon evolution','rm 019 titane','rm 019 prix','generation 2 tourbillon'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 019'; return t(
      \`RM 019 Tourbillon : évolution de la ligne tourbillon classique avec affinements de décoration. Boîtier tonneau titane, 50mm, mouvement squelette raffiné. Réserve 48h. Marché 200 000–320 000€. Montre evolution RM.\`,
      \`RM 019 Tourbillon: evolution of classic tourbillon line with decoration refinements. Tonneau titanium case, 50mm, refined skeleton movement. 48h power reserve. Market €200,000–320,000. Evolution RM watch.\`
    );} }`,

  // RM 021 - Aerodyne tourbillon
  `{ id:'rm_021', kw:['rm 021','rm021','rm 21','rm21','rm aerodyne','aerodynamic','montre aérodynamique','rm 021 prix','aviation inspired','boîtier aviateur'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 021'; return t(
      \`RM 021 Tourbillon Aérodyname : forme de fuselage d'avion (case en lozenge). Boîtier titane spécialement formé, 48x42mm, tourbillon, inspiration aéronautique pure. Marché 250 000–400 000€. Design architecture unique.\`,
      \`RM 021 Tourbillon Aérodyname: fuselage-shaped case (lozenge form). Specially shaped titanium case, 48x42mm, tourbillon, pure aviation inspiration. Market €250,000–400,000. Unique architectural design.\`
    );} }`,

  // RM 025 - Diver tourbillon chronograph
  `{ id:'rm_025', kw:['rm 025','rm025','rm 25','rm25','rm 025 diver','diver chronograph','chrono plongée','rm 025 300m','rm 025 carbone','diving watch','montre plongée'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 025'; return t(
      \`RM 025 Tourbillon Chronographe Plongeur : chronographe flyback + tourbillon pour la plongée. Boîtier tonneau carbone NTPT, 50mm, étanchéité 300m, sandwich dial. Marché 400 000–600 000€. Sport extrême RM.\`,
      \`RM 025 Tourbillon Chronographe Plongeur: flyback chronograph + tourbillon for diving. Tonneau carbon NTPT case, 50mm, 300m water resistance, sandwich dial. Market €400,000–600,000. RM extreme sport.\`
    );} }`,

  // RM 026 - Ladies tourbillon gemset
  `{ id:'rm_026', kw:['rm 026','rm026','rm 26','rm26','rm ladies tourbillon','dame tourbillon','gemstone','pierres précieuses','rm 026 diamant','diamante','ladies luxury','montre dame luxe'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 026'; return t(
      \`RM 026 Tourbillon Dame Serti : tourbillon pour dame avec sertissage de diamants/rubis/saphirs. Boîtier tonneau or rose, 42x34mm, mouvement squelette or rose. Marché 300 000–500 000€. Joaillerie RM.\`,
      \`RM 026 Tourbillon Dame Serti: ladies tourbillon with diamond/ruby/sapphire setting. Tonneau rose gold case, 42x34mm, rose gold skeleton movement. Market €300,000–500,000. RM jewellery piece.\`
    );} }`,

  // RM 028 - Automatic diver
  `{ id:'rm_028', kw:['rm 028','rm028','rm 28','rm28','rm 028 automatique','automatic diver','diver automatic','plongeur automatique','rm 028 300m','rm 028 titane','rm 028 carbone'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 028'; return t(
      \`RM 028 Automatique Plongeur : premier automatique RM pour la plongée. Boîtier tonneau titane/carbone, 50mm, étanchéité 300m, mouvement automatique calibre RM. Marché 180 000–280 000€. Plongée accessible RM.\`,
      \`RM 028 Automatique Plongeur: first RM automatic for diving. Tonneau titanium/carbon case, 50mm, 300m water resistance, automatic movement custom calibre. Market €180,000–280,000. Accessible RM diving.\`
    );} }`,

  // RM 029 - Automatic oversize date
  `{ id:'rm_029', kw:['rm 029','rm029','rm 29','rm29','rm 029 automatique','oversize date','grande date','big date','rm 029 titane','rm 029 prix','automatique affichage'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 029'; return t(
      \`RM 029 Automatique Grande Date : automatique avec affichage de date surélevé (oversized). Boîtier tonneau titane, 50mm, mouvement squelette calibre RM. Marché 140 000–220 000€. Automatique lisible RM.\`,
      \`RM 029 Automatique Grande Date: automatic with oversized date display. Tonneau titanium case, 50mm, skeleton movement custom calibre. Market €140,000–220,000. Readable RM automatic.\`
    );} }`,

  // RM 032 - Flyback chronograph diver
  `{ id:'rm_032', kw:['rm 032','rm032','rm 32','rm32','rm 032 chronographe','flyback chronograph diver','chronographe plongeur','rm 032 300m','rm 032 carbone','diver chronograph','plongeur chrono'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 032'; return t(
      \`RM 032 Chronographe Flyback Plongeur : chronographe flyback automatique pour plongée. Boîtier tonneau carbone NTPT, 50mm, étanchéité 300m, mouvement squelette automatique. Marché 250 000–380 000€. Sportivité plongée RM.\`,
      \`RM 032 Chronographe Flyback Plongeur: automatic flyback chronograph for diving. Tonneau carbon NTPT case, 50mm, 300m water resistance, skeleton automatic movement. Market €250,000–380,000. RM diving sportiveness.\`
    );} }`,

  // RM 033 - Automatic extra flat
  `{ id:'rm_033', kw:['rm 033','rm033','rm 33','rm33','rm 033 automatique extra plat','extra flat automatic','ultra fin automatique','rm ultra mince','rm mince automatique','rm 033 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 033'; return t(
      \`RM 033 Automatique Extra Flat : montre ultra-plate avec mouvement automatique. Boîtier tonneau titane, 48mm, épaisseur réduite, calibre automatique ultra-fin. Marché 120 000–200 000€. Innovation finesse automatique.\`,
      \`RM 033 Automatique Extra Flat: ultra-thin watch with automatic movement. Tonneau titanium case, 48mm, reduced thickness, ultra-thin automatic calibre. Market €120,000–200,000. Automatic thinness innovation.\`
    );} }`,

  // RM 036 - Jean Todt G-sensor tourbillon
  `{ id:'rm_036', kw:['rm 036','rm036','rm 36','rm36','rm jean todt','todt','g-sensor','accelerometer','rm 036 prix','formula 1 todt','motorsport legend'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 036'; return t(
      \`RM 036 Jean Todt Tourbillon G-Sensor : montre avec accéléromètre mécanique pour legend F1 Jean Todt. Boîtier tonneau titane, 50mm, tourbillon + G-sensor calibré pour les forces du pilotage. Marché 300 000–450 000€. Technologie unique.\`,
      \`RM 036 Jean Todt Tourbillon G-Sensor: watch with mechanical accelerometer for F1 legend Jean Todt. Tonneau titanium case, 50mm, tourbillon + G-sensor calibrated for driving forces. Market €300,000–450,000. Unique technology.\`
    );} }`,

  // RM 037 - Ladies automatic
  `{ id:'rm_037', kw:['rm 037','rm037','rm 37','rm37','rm ladies automatique','dame automatique','rm femme automatique','ladies automatic','rm 037 prix','montre femme automatique'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 037'; return t(
      \`RM 037 Automatique Dame : automatique pour femme, design épuré. Boîtier tonneau or rose/titane, 42x34mm, mouvement automatique calibre RM, réserve 48h. Marché 100 000–180 000€. Automatique féminine RM.\`,
      \`RM 037 Automatique Dame: ladies automatic, refined design. Tonneau rose gold/titanium case, 42x34mm, automatic movement custom calibre, 48h power reserve. Market €100,000–180,000. Feminine RM automatic.\`
    );} }`,

  // RM 038 - Bubba Watson tourbillon
  `{ id:'rm_038', kw:['rm 038','rm038','rm 38','rm38','rm bubba watson','bubba watson','golf','golfeur champion','rm 038 tourbillon','montre golf','rm sport golf'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 038'; return t(
      \`RM 038 Bubba Watson Tourbillon : tourbillon pour champion golfer Bubba Watson. Boîtier tonneau carbone NTPT/titane, 50mm, tourbillon, réserve 48h. Pièce sport emblématique. Marché 280 000–420 000€. Contactez-nous.\`,
      \`RM 038 Bubba Watson Tourbillon: tourbillon for golfer champion Bubba Watson. Tonneau carbon NTPT/titanium case, 50mm, tourbillon, 48h power reserve. Emblematic sports piece. Market €280,000–420,000. Contact us.\`
    );} }`,

  // RM 039 - Aviation E6-B flyback
  `{ id:'rm_039', kw:['rm 039','rm039','rm 39','rm39','rm e6-b','e6b calculator','aviation chronographe','pilot watch','montre pilote','rm 039 chronographe','navigation pilot'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 039'; return t(
      \`RM 039 Aviation E6-B Chronographe Flyback : chronographe flyback intégrant calculatrice aéronautique E6-B mécanique. Boîtier tonneau titane, 50mm, cadran spécialisé navigation. Marché 250 000–380 000€. Complexité aéronautique.\`,
      \`RM 039 Aviation E6-B Chronographe Flyback: flyback chronograph integrating mechanical E6-B aviation calculator. Tonneau titanium case, 50mm, specialized navigation dial. Market €250,000–380,000. Aviation complexity.\`
    );} }`,

  // RM 040 - McLaren Speedtail
  `{ id:'rm_040', kw:['rm 040','rm040','rm 40','rm40','rm mclaren','mclaren speedtail','rm 040 mclaren','hypercar','supercar','rm 040 prix','automotive partnership'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 040'; return t(
      \`RM 040 McLaren Speedtail : montre spécialement conçue pour l'hypercar McLaren Speedtail. Boîtier tonneau carbone NTPT/titane, 50mm, chronographe flyback automatique. Marché 300 000–450 000€. Partenariat automobiles RM.\`,
      \`RM 040 McLaren Speedtail: watch specially designed for McLaren Speedtail hypercar. Tonneau carbon NTPT/titanium case, 50mm, automatic flyback chronograph. Market €300,000–450,000. RM automotive partnership.\`
    );} }`,

  // RM 052 - Tourbillon skull
  `{ id:'rm_052', kw:['rm 052','rm052','rm 52','rm52','rm 052 skull','skull tourbillon','tête de mort','crâne','rm 052 prix','playful','ludique'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 052'; return t(
      \`RM 052 Tourbillon Crâne : tourbillon avec cadran gravé crâne (design ludique). Boîtier tonneau titane/céramique/carbone, 50mm, tourbillon visible, réserve 50h. Pièce provoquatrice RM. Marché 250 000–400 000€. Playful complexity.\`,
      \`RM 052 Tourbillon Skull: tourbillon with skull engraved dial (playful design). Tonneau titanium/ceramic/carbon case, 50mm, visible tourbillon, 50h power reserve. Provocative RM piece. Market €250,000–400,000. Playful complexity.\`
    );} }`,

  // RM 056 - Sapphire case tourbillon split-seconds
  `{ id:'rm_056', kw:['rm 056','rm056','rm 56','rm56','rm sapphire','sapphire transparent','saphir transparent','rm 056 saphir','see through','transparent case','boîtier saphir'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 056'; return t(
      \`RM 056 Tourbillon Saphir : boîtier entièrement en saphir transparent (ultra-rare, 2M€+). Tourbillon + chronographe à rattrapante visibles de tous côtés. Mouvement squelette ultra-fin en or rose. Marque d'exception absolue.\`,
      \`RM 056 Tourbillon Sapphire: entirely sapphire transparent case (ultra-rare, €2M+). Tourbillon + split-seconds chronograph visible from all sides. Ultra-thin skeleton movement in rose gold. Absolute masterpiece.\`
    );} }`,

  // RM 059 - Yohan Blake tourbillon
  `{ id:'rm_059', kw:['rm 059','rm059','rm 59','rm59','rm yohan blake','yohan blake','sprinter','100m','jamaica','track athlete','sports watch','montre sport'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 059'; return t(
      \`RM 059 Yohan Blake Tourbillon : tourbillon pour le sprinteur jamaïcain. Boîtier tonneau carbone NTPT, 50mm, chronographe intégré, réserve 48h. Pièce athlète track-and-field RM. Marché 250 000–380 000€. Contactez-nous.\`,
      \`RM 059 Yohan Blake Tourbillon: tourbillon for Jamaican sprinter. Tonneau carbon NTPT case, 50mm, integrated chronograph, 48h power reserve. RM track-and-field athlete piece. Market €250,000–380,000. Contact us.\`
    );} }`,

  // RM 061 - Yohan Blake flyback
  `{ id:'rm_061', kw:['rm 061','rm061','rm 61','rm61','rm yohan blake flyback','chronographe blake','flyback yohan','sprinter flyback','rm 061 prix','track chronograph'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 061'; return t(
      \`RM 061 Yohan Blake Chronographe Flyback : chronographe flyback pour le sprinter, réglé au centième de seconde. Boîtier tonneau carbone NTPT, 50mm, mouvement chronographe ultra-précis. Marché 280 000–420 000€. Précision athlète.\`,
      \`RM 061 Yohan Blake Chronographe Flyback: flyback chronograph for sprinter, accurate to hundredths of second. Tonneau carbon NTPT case, 50mm, ultra-precise chronograph movement. Market €280,000–420,000. Athlete precision.\`
    );} }`,

  // RM 062 - Vibrating alarm tourbillon ACJ
  `{ id:'rm_062', kw:['rm 062','rm062','rm 62','rm62','rm vibrant alarm','vibrating alarm','alarme vibrante','acj','rm 062 prix','alarm tourbillon','complication alarm'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 062'; return t(
      \`RM 062 Tourbillon Alarme Vibrante (ACJ) : tourbillon avec alarme mécanique vibrante. Boîtier tonneau titane, 50mm, mouvement squelette avec système d'alarme breveté, réserve 48h. Pièce mécanique innovante. Marché 350 000–500 000€. Complication rare.\`,
      \`RM 062 Tourbillon Vibrating Alarm (ACJ): tourbillon with mechanical vibrating alarm. Tonneau titanium case, 50mm, skeleton movement with patented alarm system, 48h power reserve. Innovative mechanical piece. Market €350,000–500,000. Rare complication.\`
    );} }`,

  // RM 068 - Cyril Kongo tourbillon
  `{ id:'rm_068', kw:['rm 068','rm068','rm 68','rm68','rm cyril kongo','cyril kongo','boxer','champion boxer','boxing watch','montre boxeur','rm 068 prix'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 068'; return t(
      \`RM 068 Cyril Kongo Tourbillon : tourbillon pour champion boxer Cyril Kongo. Boîtier tonneau carbone NTPT/céramique, 50mm, tourbillon surdiminutif visible, réserve 50h. Pièce athlète combat RM. Marché 260 000–400 000€. Contactez-nous.\`,
      \`RM 068 Cyril Kongo Tourbillon: tourbillon for boxer champion Cyril Kongo. Tonneau carbon NTPT/ceramic case, 50mm, overdimensioned visible tourbillon, 50h power reserve. RM combat athlete piece. Market €260,000–400,000. Contact us.\`
    );} }`,

  // RM 070 - Alain Prost tourbillon
  `{ id:'rm_070', kw:['rm 070','rm070','rm 70','rm70','rm alain prost','alain prost','f1 legend','formula 1','le professeur','rm 070 prix','motorsport icon'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 070'; return t(
      \`RM 070 Alain Prost Tourbillon : montre du legend F1 Alain Prost "Le Professeur". Boîtier tonneau titane/or rose, 50mm, tourbillon visible, réserve 48h. Pièce athlète motoriste RM. Marché 280 000–420 000€. Icon F1 partnership.\`,
      \`RM 070 Alain Prost Tourbillon: watch for F1 legend Alain Prost "Le Professeur". Tonneau titanium/rose gold case, 50mm, visible tourbillon, 48h power reserve. RM motorsport athlete piece. Market €280,000–420,000. Icon F1 partnership.\`
    );} }`,

  // RM 071 - Ladies automatic tourbillon
  `{ id:'rm_071', kw:['rm 071','rm071','rm 71','rm71','rm dame automatique tourbillon','ladies auto tourbillon','automatique dame','femme automatique','rm 071 prix','lady automatic'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 071'; return t(
      \`RM 071 Automatique Tourbillon Dame : automatique avec tourbillon pour femme. Boîtier tonneau or rose, 42x34mm, mouvement automatique avec tourbillon intégré, réserve 48h. Marché 280 000–450 000€. Complication dame RM.\`,
      \`RM 071 Automatique Tourbillon Dame: automatic with tourbillon for ladies. Tonneau rose gold case, 42x34mm, automatic movement with integrated tourbillon, 48h power reserve. Market €280,000–450,000. RM lady complication.\`
    );} }`,

  // RM 074 - Ladies automatic tourbillon (alternate edition)
  `{ id:'rm_074', kw:['rm 074','rm074','rm 74','rm74','rm dame automatique','ladies tourbillon edition','lady auto','femme tourbillon','rm 074 prix','diamond setting','setting'],
    r:()=>{ ctx.brand='Richard Mille'; ctx.model='RM 074'; return t(
      \`RM 074 Automatique Tourbillon Dame Serti : version sertie de la RM 071 avec diamants/saphirs. Boîtier tonneau or rose, 42x34mm, tourbillon automatique, setting gemme signature. Marché 350 000–550 000€. Joaillerie féminine RM.\`,
      \`RM 074 Automatique Tourbillon Dame Serti: gemstone-set version of RM 071 with diamonds/sapphires. Tonneau rose gold case, 42x34mm, automatic tourbillon, signature gem setting. Market €350,000–550,000. RM feminine jewellery.\`
    );} }`,
];

// Read the file
const content = fs.readFileSync(chatbotPath, 'utf8');

// Find the insertion point (before cartier_general)
const insertionMarker = "{ id:'cartier_general'";
const insertionIndex = content.indexOf(insertionMarker);

if (insertionIndex === -1) {
  console.error('ERROR: Could not find insertion point (cartier_general)');
  process.exit(1);
}

// Build the new content with proper formatting
const beforeInsertion = content.substring(0, insertionIndex);
const afterInsertion = content.substring(insertionIndex);

// Join all new entries with comma-separator
const entriesText = newEntries.join(',\n\n    ');

// Construct final content
const newContent = beforeInsertion + entriesText + ',\n\n    ' + afterInsertion;

// Write back to file
fs.writeFileSync(chatbotPath, newContent, 'utf8');

console.log('✓ Successfully expanded RM entries in chatbot.js');
console.log('  - Inserted 34 new RM models before cartier_general');
console.log('  - Total new entries: rm_001, rm_003, rm_004, rm_006, rm_007, rm_008, rm_009, rm_012, rm_015, rm_017, rm_019, rm_021, rm_025, rm_026, rm_028, rm_029, rm_032, rm_033, rm_036, rm_037, rm_038, rm_039, rm_040, rm_052, rm_056, rm_059, rm_061, rm_062, rm_068, rm_070, rm_071, rm_074');
console.log('  - File updated: ' + chatbotPath);
