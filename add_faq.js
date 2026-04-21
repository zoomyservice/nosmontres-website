const fs = require('fs');
let code = fs.readFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', 'utf8');

const newEntries = `
    // ── COMMON WATCH SHOPPING FAQ (from research) ────────────────────────────────

    { id:'trade_in', kw:['trade in','trade-in','reprendre','reprise','part exchange','échange','échanger ma montre','exchange my watch','trade my watch','reprendre ma montre','reprise montre','swap','troquer','trade up','upgrade my watch','upgrader ma montre','put toward','mettre en acompte'],
      r:()=>t(
        \`Oui, nous acceptons les reprises ! Apportez votre montre pour une évaluation gratuite. La valeur estimée peut être déduite de votre prochain achat. Contactez-nous pour plus de détails.\`,
        \`Yes, we accept trade-ins! Bring your watch for a free evaluation. The estimated value can be deducted from your next purchase. Contact us for details.\`
      ) },

    { id:'return_policy', kw:['return policy','politique retour','retour','refund','remboursement','rembourser','can I return','puis-je retourner','satisfaction garantie','satisfaction guarantee','échange possible','exchange possible','return watch','retourner montre','cooling off','délai rétractation','14 jours','14 days','changement avis','change mind','buyer remorse'],
      r:()=>t(
        \`Nous offrons un délai de rétractation selon la loi française. Chaque montre est inspectée avant vente pour garantir votre satisfaction. Contactez-nous pour les conditions exactes de retour.\`,
        \`We offer a cooling-off period under French law. Every watch is inspected before sale to guarantee your satisfaction. Contact us for exact return conditions.\`
      ) },

    { id:'case_materials', kw:['case material','matériau boîtier','matière boîtier','titanium','titane','ceramic case','boîtier céramique','carbon fiber','fibre carbone','gold case','boîtier or','steel vs gold','acier vs or','titanium vs steel','titane vs acier','platinum case','boîtier platine','rose gold vs yellow','or rose vs or jaune','white gold','or blanc','which material','quel matériau','materiau montre','watch material','bronze watch','montre bronze','tungsten','carbide'],
      r:()=>t(
        \`Matériaux courants : **Acier 316L/904L** (résistant, abordable), **Titane** (léger, hypoallergénique), **Or** (jaune/rose/blanc, luxe classique), **Platine** (le plus rare/lourd), **Céramique** (inrayable, légère), **Carbone** (ultra-léger, RM). Le choix affecte poids, prix et durabilité.\`,
        \`Common materials: **Steel 316L/904L** (durable, affordable), **Titanium** (light, hypoallergenic), **Gold** (yellow/rose/white, classic luxury), **Platinum** (rarest/heaviest), **Ceramic** (scratch-proof, light), **Carbon** (ultra-light, RM). Choice affects weight, price and durability.\`
      ) },

    { id:'crystal_types', kw:['crystal type','type de verre','mineral crystal','verre minéral','acrylic crystal','verre acrylique','hesalite','plexiglas','plexi','sapphire vs mineral','saphir vs minéral','crystal comparison','comparaison verre','which crystal','quel verre','crystal scratch','rayer verre','crystal replacement','remplacement verre','polywatch'],
      r:()=>t(
        \`3 types de verres : **Saphir** (montres de luxe — quasi inrayable, 9/10 Mohs), **Minéral** (montres moyennes — résistant mais rayable), **Acrylique/Hesalite** (vintage — polissable mais fragile). Toutes nos montres de luxe sont en saphir.\`,
        \`3 crystal types: **Sapphire** (luxury watches — nearly scratch-proof, 9/10 Mohs), **Mineral** (mid-range — resistant but scratchable), **Acrylic/Hesalite** (vintage — polishable but fragile). All our luxury watches use sapphire.\`
      ) },

    { id:'in_house_movement', kw:['in-house','in house','manufacture movement','mouvement manufacture','calibre maison','own movement','propre mouvement','eta movement','mouvement eta','sellita','generic movement','mouvement générique','in-house vs eta','manufacture vs eta','who makes movement','qui fabrique le mouvement','developed in-house','développé en interne','valjoux','miyota'],
      r:()=>t(
        \`Un mouvement manufacture (in-house) est conçu et fabriqué par la marque elle-même. Rolex, AP, Patek, RM utilisent exclusivement des mouvements maison. Un mouvement ETA/Sellita est un calibre générique suisse utilisé par de nombreuses marques. In-house = prestige et valeur supérieurs.\`,
        \`A manufacture (in-house) movement is designed and built by the brand itself. Rolex, AP, Patek, RM use exclusively in-house movements. An ETA/Sellita movement is a generic Swiss calibre used by many brands. In-house = higher prestige and value.\`
      ) },

    { id:'swiss_made', kw:['swiss made','swiss','suisse','made in switzerland','fabriqué en suisse','label swiss made','swiss made meaning','que signifie swiss made','what does swiss made mean','swiss quality','qualité suisse','100% swiss','swiss movement','mouvement suisse','swiss law','loi swiss made','swissness'],
      r:()=>t(
        \`"Swiss Made" signifie : mouvement suisse, assemblage en Suisse, et 60%+ de la valeur produite en Suisse. Toutes les marques que nous vendons (Rolex, AP, Patek, RM, Cartier) sont Swiss Made avec mouvements manufacture.\`,
        \`"Swiss Made" means: Swiss movement, assembled in Switzerland, and 60%+ of value produced in Switzerland. All brands we sell (Rolex, AP, Patek, RM, Cartier) are Swiss Made with manufacture movements.\`
      ) },

    { id:'chronometer_certification', kw:['chronometer','chronomètre','cosc','contrôle officiel suisse','chronometer vs chronograph','chronomètre vs chronographe','difference chronometer chronograph','différence chronomètre chronographe','certified chronometer','chronomètre certifié','cosc certified','certifié cosc','superlative chronometer','chronomètre superlatif'],
      r:()=>t(
        \`**Chronomètre** = montre certifiée COSC pour sa précision (-4/+6 sec/jour). **Chronographe** = fonction chrono/stopwatch. Ce sont deux choses différentes ! Toutes les Rolex sont des chronomètres superlatifs (-2/+2 sec/jour). AP et Patek ont leurs propres standards encore plus stricts.\`,
        \`**Chronometer** = COSC-certified watch for accuracy (-4/+6 sec/day). **Chronograph** = stopwatch function. They are two different things! All Rolex are Superlative Chronometers (-2/+2 sec/day). AP and Patek have their own even stricter standards.\`
      ) },

    { id:'watch_frequency', kw:['frequency','fréquence','beats per hour','battements par heure','bph','hertz','hz','28800','21600','36000','high frequency','haute fréquence','low frequency','basse fréquence','vibrations','oscillation','4 hz','3 hz','5 hz','tick rate'],
      r:()=>t(
        \`La fréquence mesure la vitesse d'oscillation du balancier. **21 600 bph (3Hz)** = montres classiques, **28 800 bph (4Hz)** = standard moderne (Rolex, AP), **36 000 bph (5Hz)** = haute fréquence (Zenith). Plus haute fréquence = meilleure précision théorique mais révision plus fréquente.\`,
        \`Frequency measures balance wheel oscillation speed. **21,600 bph (3Hz)** = classic watches, **28,800 bph (4Hz)** = modern standard (Rolex, AP), **36,000 bph (5Hz)** = high frequency (Zenith). Higher frequency = better theoretical accuracy but more frequent servicing.\`
      ) },

    { id:'limited_edition', kw:['limited edition','édition limitée','limited','limité','special edition','édition spéciale','numéroté','numbered','how many made','combien fabriqué','rare edition','édition rare','commemorative','commémorative','anniversary edition','édition anniversaire','exclusive','exclusif','collector edition','édition collector','one of','pièce unique','unique piece'],
      r:()=>t(
        \`Les éditions limitées sont produites en nombre restreint, augmentant leur valeur collector. Rolex produit rarement des "limited editions" officielles. AP, Patek, RM et Cartier font régulièrement des séries numérotées. Contactez-nous pour la disponibilité de pièces rares.\`,
        \`Limited editions are produced in restricted numbers, increasing collector value. Rolex rarely makes official "limited editions." AP, Patek, RM and Cartier regularly release numbered series. Contact us for rare piece availability.\`
      ) },

    { id:'aftermarket_parts', kw:['aftermarket','pièces non originales','non original','frankenwatch','franken','replacement parts','pièces détachées','third party','tiers','modified','modifié','custom dial','cadran custom','aftermarket bracelet','bracelet non original','original parts','pièces originales','all original','tout original','replaced dial','cadran remplacé','redial','re-dial','refinished'],
      r:()=>t(
        \`Nous vendons uniquement des montres avec pièces 100% originales. Les pièces aftermarket (cadrans, aiguilles, lunettes non d'origine) réduisent considérablement la valeur. Chaque montre est inspectée et certifiée authentique avant mise en vente.\`,
        \`We only sell watches with 100% original parts. Aftermarket parts (non-original dials, hands, bezels) significantly reduce value. Every watch is inspected and certified authentic before listing.\`
      ) },

    { id:'lug_to_lug', kw:['lug to lug','lug-to-lug','entre cornes','distance entre cornes','case diameter','diamètre boîtier','case thickness','épaisseur boîtier','watch dimensions','dimensions montre','case size','taille boîtier','mm','millimètres','how big','quelle taille','wears big','porte grand','wears small','porte petit','wrist presence','présence au poignet','overhang','dépasser poignet'],
      r:()=>t(
        \`**Diamètre** = largeur du boîtier (36–44mm typique). **Lug-to-lug** = hauteur totale (la mesure la plus importante pour le confort). **Épaisseur** = profil (<10mm = fin, >14mm = épais). Idéalement, les cornes ne dépassent pas votre poignet. Venez essayer en boutique.\`,
        \`**Diameter** = case width (36–44mm typical). **Lug-to-lug** = total height (the most important comfort measurement). **Thickness** = profile (<10mm = thin, >14mm = thick). Ideally lugs shouldn't overhang your wrist. Come try in-store.\`
      ) },

    { id:'how_to_wind', kw:['how to wind','comment remonter','winding','remontage','remonter ma montre','wind my watch','how to set','comment régler','set the date','régler la date','set the time','régler l heure','quickset','date rapide','crown positions','positions couronne','screw down crown','couronne vissée','hand winding','remontage manuel','overwinding','trop remonter','can I overwind','surremontage'],
      r:()=>t(
        \`**Couronne vissée (Rolex, etc.)** : dévissez (antihoraire), position 1 = remontage, position 2 = date, position 3 = heure. Ne réglez JAMAIS la date entre 21h–3h. Remontage manuel : 20–40 tours suffisent. Les automatiques modernes ont un embrayage anti-surremontage.\`,
        \`**Screw-down crown (Rolex, etc.)**: unscrew (counter-clockwise), position 1 = winding, position 2 = date, position 3 = time. NEVER set date between 9PM–3AM. Manual wind: 20–40 turns is enough. Modern automatics have an anti-overwind clutch.\`
      ) },

    { id:'watch_storage', kw:['storage','rangement','store watch','ranger montre','watch box','boîte montre','watch case','coffret','safe','coffre fort','travel case','étui voyage','watch roll','how to store','comment ranger','store collection','ranger collection','humidity','humidité','keep watch safe','protéger montre','watch cushion','coussin montre'],
      r:()=>t(
        \`Rangez vos montres dans un coffret doublé à l'abri de la lumière, humidité, et champs magnétiques. Utilisez un remontoir pour automatiques portées rarement. Pour voyager, un étui individuel rembourré. Pour les collections, un coffre-fort ignifuge est recommandé.\`,
        \`Store watches in a lined box away from light, humidity, and magnetic fields. Use a winder for rarely-worn automatics. For travel, a padded individual pouch. For collections, a fireproof safe is recommended.\`
      ) },

    { id:'scratch_repair', kw:['scratch repair','réparation rayure','remove scratch','enlever rayure','buff out','polir rayure','deep scratch','rayure profonde','desk diving mark','marque de bureau','scratched case','boîtier rayé','scratched bracelet','bracelet rayé','scuff','éraflure','ding','dent','nick','entaille','case repair','réparation boîtier'],
      r:()=>t(
        \`Rayures légères : polissage professionnel (satinage ou miroir selon finition d'origine). Rayures profondes : peut nécessiter un polissage plus poussé qui enlève du métal. **Attention** : trop polir réduit la valeur (surtout vintage). Nous pouvons évaluer et conseiller en boutique.\`,
        \`Light scratches: professional polishing (satin or mirror depending on original finish). Deep scratches: may need heavier polishing that removes metal. **Warning**: over-polishing reduces value (especially vintage). We can assess and advise in-store.\`
      ) },

    { id:'engraving', kw:['engraving','gravure','engrave','graver','personalize','personnaliser','personalise','customise','customize','inscription','personalized watch','montre personnalisée','caseback engraving','gravure fond','message gravé','engraved message','initials','initiales','can you engrave','pouvez-vous graver'],
      r:()=>t(
        \`La gravure personnalisée est possible sur certaines montres (fond du boîtier). **Attention** : graver une montre de luxe peut réduire sa valeur de revente. Nous pouvons vous conseiller avant de procéder. Contactez-nous.\`,
        \`Custom engraving is possible on some watches (caseback). **Warning**: engraving a luxury watch can reduce resale value. We can advise before proceeding. Contact us.\`
      ) },

    { id:'occasion_watch', kw:['wedding watch','montre mariage','graduation watch','montre diplôme','retirement watch','montre retraite','anniversary watch','montre anniversaire','birthday watch','montre anniversaire','milestone','étape','celebrate','célébrer','commemorative','commémorative','special occasion','occasion spéciale','mark the occasion','marquer l occasion','gift for him','cadeau pour lui','gift for her','cadeau pour elle','memorable','mémorable'],
      r:()=>t(
        \`Une montre de luxe est le cadeau parfait pour les moments importants. **Mariage** : Datejust, Calatrava. **Retraite** : Day-Date, Royal Oak. **Diplôme** : Submariner, Santos. Contactez-nous pour des recommandations personnalisées selon l'occasion et le budget.\`,
        \`A luxury watch is the perfect gift for milestones. **Wedding**: Datejust, Calatrava. **Retirement**: Day-Date, Royal Oak. **Graduation**: Submariner, Santos. Contact us for personalised recommendations based on occasion and budget.\`
      ) },

    { id:'travel_watch', kw:['travel watch','montre voyage','best for travel','pour voyager','gmt watch','montre gmt','dual time','double fuseau','world timer','heure mondiale','time zone','fuseau horaire','frequent traveler','voyageur fréquent','jet lag','business travel','voyage affaires','two time zones','deux fuseaux'],
      r:()=>t(
        \`Pour les voyageurs : **GMT/Dual Time** (Rolex GMT-Master II, Patek 5164 Aquanaut Travel Time) affiche 2 fuseaux. **World Time** (Patek 5230) affiche 24 fuseaux. Ces montres permettent de suivre l'heure de votre domicile en déplacement.\`,
        \`For travellers: **GMT/Dual Time** (Rolex GMT-Master II, Patek 5164 Aquanaut Travel Time) shows 2 zones. **World Time** (Patek 5230) shows 24 zones. These watches let you track home time while travelling.\`
      ) },

    { id:'small_wrist', kw:['small wrist','petit poignet','thin wrist','poignet fin','wrist size','taille poignet','too big','trop grosse','too large','trop grande','small watch','petite montre','36mm','34mm','38mm','compact watch','montre compacte','fits small','convient petit','slim wrist','poignet mince','narrow wrist','poignet étroit','woman wrist','poignet femme','child wrist'],
      r:()=>t(
        \`Pour petits poignets (<16cm) : **36mm** (Datejust 36, OP 36, Santos Medium, Calatrava), **34mm** (Cartier Panthère Small). **37mm** (Royal Oak 15450). Venez essayer en boutique — la taille idéale dépend de la forme du boîtier et du lug-to-lug, pas seulement du diamètre.\`,
        \`For small wrists (<16cm): **36mm** (Datejust 36, OP 36, Santos Medium, Calatrava), **34mm** (Cartier Panthère Small). **37mm** (Royal Oak 15450). Try in-store — ideal size depends on case shape and lug-to-lug, not just diameter.\`
      ) },

    { id:'depreciation', kw:['depreciation','dépréciation','lose value','perdre valeur','value drop','perte de valeur','which watches depreciate','quelles montres déprécient','bad investment','mauvais investissement','will it lose','va-t-elle perdre','value retention','rétention valeur','hold value','garder valeur','best value','meilleure valeur','worst investment','pire investissement','secondary market','marché secondaire'],
      r:()=>t(
        \`Rolex, Patek, AP sont les marques qui conservent le mieux leur valeur (parfois au-dessus du prix boutique). Les modèles sport-acier sont les plus demandés. Les montres avec boîte et papiers d'origine conservent 15–20% de valeur en plus. Contactez-nous pour une évaluation.\`,
        \`Rolex, Patek, AP are the brands that best hold value (sometimes above retail). Steel sport models are most in demand. Watches with original box and papers retain 15–20% more value. Contact us for a valuation.\`
      ) },

    { id:'dial_types', kw:['dial type','type cadran','guilloché','guilloche','sunburst','soleil','lacquer','laque','enamel dial','cadran émail','mother of pearl','nacre','meteorite dial','cadran météorite','porcelain dial','cadran porcelaine','fumé','fumée','smoked dial','gradient','dégradé','aventurine','tropical dial','cadran tropical','patina dial','dial finish','finition cadran','dial texture','texture cadran'],
      r:()=>t(
        \`Finitions de cadrans : **Sunburst** (reflets radiants, Rolex/AP), **Guilloché** (gravure mécanique, Breguet/Patek), **Émail** (grand feu, artisanal), **Nacre** (iridescent, Lady-Datejust), **Météorite** (chaque pièce unique), **Laque** (profondeur, Cartier). Le cadran est l'âme esthétique de la montre.\`,
        \`Dial finishes: **Sunburst** (radiant reflections, Rolex/AP), **Guilloché** (mechanical engraving, Breguet/Patek), **Enamel** (grand feu, artisanal), **Mother of pearl** (iridescent, Lady-Datejust), **Meteorite** (each piece unique), **Lacquer** (depth, Cartier). The dial is the aesthetic soul of the watch.\`
      ) },

    { id:'customs_import', kw:['customs','douane','import duty','droits d importation','import tax','taxe importation','duty free','hors taxe','détaxe','tax free','customs duty','droits de douane','import watch','importer montre','export','exportation','shipping abroad','expédier à l étranger','declare watch','déclarer montre','customs form','formulaire douane','vat refund','remboursement tva'],
      r:()=>t(
        \`Pour les acheteurs hors UE : vous pouvez bénéficier de la détaxe (remboursement TVA 20%). Nous préparons les formulaires nécessaires. Pour l'import dans votre pays, renseignez-vous sur les droits de douane locaux. Nous expédions avec assurance et documents complets.\`,
        \`For non-EU buyers: you may qualify for détaxe (20% VAT refund). We prepare the necessary forms. For import into your country, check your local customs duties. We ship with insurance and complete documentation.\`
      ) },

    { id:'service_interval', kw:['how often service','combien de temps entre révisions','service interval','intervalle révision','when to service','quand réviser','service schedule','calendrier révision','years between service','ans entre révisions','service every','révision tous les','5 years','5 ans','7 years','7 ans','10 years','10 ans','regular service','révision régulière','service frequency','fréquence révision','overdue service','révision en retard','skip service','sauter révision'],
      r:()=>t(
        \`Intervalles recommandés : **Rolex** = tous les 10 ans (garantie 5 ans). **AP** = tous les 5–8 ans. **Patek** = tous les 5–7 ans. **RM** = tous les 5 ans. **Cartier** = tous les 5–7 ans. Porter une montre non révisée trop longtemps use les composants et augmente le coût de révision.\`,
        \`Recommended intervals: **Rolex** = every 10 years (5-year warranty). **AP** = every 5–8 years. **Patek** = every 5–7 years. **RM** = every 5 years. **Cartier** = every 5–7 years. Wearing an overdue watch wears down components and increases service cost.\`
      ) },

`;

// Find insertion point: after bezel_types entry
const marker = "Bezel types: **Rotating ceramic** (Submariner, GMT — scratch-proof, unidirectional), **Tachymeter** (Daytona — speed measurement), **Fluted** (Datejust — white/yellow gold, decorative), **Grande Tapisserie** (AP RO Offshore).`\n      ) },";

if (code.includes(marker)) {
  code = code.replace(marker, marker + '\n' + newEntries);
  console.log('✅ 23 new FAQ entries inserted');
} else {
  console.log('❌ Could not find bezel_types marker');
  // Try a shorter marker
  const short = "Grande Tapisserie** (AP RO Offshore).`\n      ) },";
  if (code.includes(short)) {
    code = code.replace(short, short + '\n' + newEntries);
    console.log('✅ 23 new FAQ entries inserted (short marker)');
  } else {
    console.log('❌ Could not find any marker');
  }
}

fs.writeFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', code);
console.log('📊 New file size: ' + code.split('\n').length + ' lines');
