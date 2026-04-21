const fs = require('fs');
let code = fs.readFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', 'utf8');

const newEntries = `
    // ── DEEP RESEARCH FAQ BATCH 2 ────────────────────────────────────────────────

    { id:'patina_tropical', kw:['patina','patine','tropical dial','cadran tropical','aging','vieillissement','aged dial','cadran vieilli','faded dial','cadran décoloré','yellowed','jauni','spider dial','craquelé','ghost bezel','lunette fantôme','aged lume','plots vieillis','tritium','radium','vintage charm','charme vintage','aged watch','montre vieillie','natural aging','vieillissement naturel'],
      r:()=>t(
        \`La patine est l'évolution naturelle des matériaux avec le temps. Un cadran "tropical" (décoloré par le soleil) ou une lunette "ghost" peut AUGMENTER la valeur chez les collectionneurs. Ne jamais restaurer une patine authentique — elle prouve l'originalité et l'histoire de la pièce.\`,
        \`Patina is the natural evolution of materials over time. A "tropical" dial (sun-faded) or "ghost" bezel can INCREASE value among collectors. Never restore authentic patina — it proves the piece's originality and history.\`
      ) },

    { id:'how_to_use_bezel', kw:['how to use bezel','comment utiliser lunette','use gmt bezel','utiliser lunette gmt','use dive bezel','utiliser lunette plongée','use tachymeter','utiliser tachymètre','bezel function','fonction lunette','read bezel','lire lunette','elapsed time','temps écoulé','measure speed','mesurer vitesse','track time','bezel tutorial','tutoriel lunette'],
      r:()=>t(
        \`**Plongée** : alignez le 0 sur l'aiguille des minutes, lisez le temps écoulé directement. **GMT** : réglez le décalage horaire sur la lunette 24h, lisez le 2e fuseau via l'aiguille GMT. **Tachymètre** : démarrez le chrono, arrêtez après 1 km/unité — la position de l'aiguille indique la vitesse.\`,
        \`**Dive**: align 0 with minute hand, read elapsed time directly. **GMT**: set time difference on 24h bezel, read 2nd zone via GMT hand. **Tachymeter**: start chrono, stop after 1 km/unit — hand position shows speed.\`
      ) },

    { id:'bracelet_types_explained', kw:['oyster bracelet','bracelet oyster','jubilee bracelet','bracelet jubilé','president bracelet','bracelet président','oyster vs jubilee','jubilé vs oyster','three link','five link','trois maillons','cinq maillons','bracelet type','type de bracelet','which bracelet','quel bracelet','bracelet difference','différence bracelet','oyster jubilee president','sportif vs élégant bracelet'],
      r:()=>t(
        \`**Oyster** : 3 maillons, sportif, robuste (Submariner, GMT). **Jubilee** : 5 maillons, élégant, souple (Datejust). **President** : 3 maillons arrondis, or/platine uniquement (Day-Date). Le choix est esthétique — Oyster = sport, Jubilee = classique, President = prestige absolu.\`,
        \`**Oyster**: 3 links, sporty, robust (Submariner, GMT). **Jubilee**: 5 links, elegant, supple (Datejust). **President**: 3 rounded links, gold/platinum only (Day-Date). Choice is aesthetic — Oyster = sport, Jubilee = classic, President = ultimate prestige.\`
      ) },

    { id:'one_watch_collection', kw:['one watch','une seule montre','only one watch','gada','go anywhere do anything','versatile watch','montre polyvalente','all rounder','tout terrain','do it all','faire tout','one watch collection','collection une montre','if you could only have one','si vous ne pouviez en avoir qu une','everyday watch','montre quotidienne','only watch i need','seule montre nécessaire'],
      r:()=>t(
        \`Pour une montre unique polyvalente : **Rolex Datejust 41** (sport + habillé), **AP Royal Oak 15500** (luxe sport-chic), **Cartier Santos Medium** (icône élégante). Critères : acier, 100m étanche, saphir, 36-41mm. Venez essayer en boutique pour trouver LA montre.\`,
        \`For one versatile watch: **Rolex Datejust 41** (sport + dress), **AP Royal Oak 15500** (luxury sport-chic), **Cartier Santos Medium** (elegant icon). Criteria: steel, 100m WR, sapphire, 36-41mm. Come try in-store to find THE watch.\`
      ) },

    { id:'why_luxury', kw:['why luxury','pourquoi luxe','why so expensive','pourquoi si cher','worth the money','vaut le prix','why pay more','pourquoi payer plus','overpriced','trop cher','why expensive watch','pourquoi montre chère','what makes luxury','qu est-ce qui fait le luxe','justify price','justifier le prix','cheap vs expensive','pas cher vs cher','is it worth it','est-ce que ça vaut le coup','value of luxury','valeur du luxe','why not cheap watch','apple watch vs rolex'],
      r:()=>t(
        \`Une montre de luxe se distingue par : mouvement manufacture (des centaines de composants assemblés à la main), matériaux nobles (acier 904L, or, saphir), finitions artisanales (anglage, côtes de Genève), et valeur de revente. C'est un patrimoine transmissible, pas un gadget jetable.\`,
        \`A luxury watch stands apart through: manufacture movement (hundreds of hand-assembled components), noble materials (904L steel, gold, sapphire), artisan finishing (bevelling, Côtes de Genève), and resale value. It's a transferable heritage, not a disposable gadget.\`
      ) },

    { id:'stolen_check', kw:['stolen','volée','volé','check stolen','vérifier volée','watch register','registre montre','provenance','provenance montre','where does it come from','d où vient-elle','legitimate','légitime','legal','légal','clean title','titre propre','stolen database','base de données volées','is it stolen','est-elle volée','check serial','vérifier série','interpol','police','report stolen','signaler vol'],
      r:()=>t(
        \`Nous vérifions CHAQUE montre contre les bases de données de montres volées (The Watch Register, Interpol) avant mise en vente. Chaque pièce a une provenance traçable. Si vous avez des doutes sur une montre achetée ailleurs, consultez thewatchregister.com pour vérifier le numéro de série.\`,
        \`We check EVERY watch against stolen watch databases (The Watch Register, Interpol) before listing. Each piece has traceable provenance. If you have doubts about a watch bought elsewhere, visit thewatchregister.com to verify the serial number.\`
      ) },

    { id:'service_cost_detail', kw:['how much service cost','combien coûte révision','service price','prix révision','cost to service rolex','coût révision rolex','cost to service ap','coût révision ap','cost to service patek','coût révision patek','maintenance cost','coût entretien','service expensive','révision chère','service budget','budget révision','repair cost','coût réparation','overhaul cost','coût remise en état','service estimate','devis révision'],
      r:()=>t(
        \`Coûts moyens de révision complète : **Rolex** 600–1 500€ (chrono jusqu'à 2 000€). **AP** 1 000–2 500€. **Patek** 1 500–4 000€+. **RM** 2 000–5 000€+. **Cartier** 500–1 200€. Les prix varient selon complications et état. Nous pouvons vous orienter vers des horlogers certifiés.\`,
        \`Average full service costs: **Rolex** €600–1,500 (chrono up to €2,000). **AP** €1,000–2,500. **Patek** €1,500–4,000+. **RM** €2,000–5,000+. **Cartier** €500–1,200. Prices vary by complications and condition. We can direct you to certified watchmakers.\`
      ) },

    { id:'young_professional', kw:['young professional','jeune professionnel','first job','premier emploi','first bonus','premier bonus','bonus watch','montre bonus','treat yourself','se faire plaisir','reward yourself','se récompenser','career milestone','étape carrière','promotion watch','montre promotion','starter watch','montre débutant','entry level luxury','luxe entrée de gamme','affordable luxury','luxe abordable','under 30','moins de 30 ans'],
      r:()=>t(
        \`Pour un premier achat de luxe : **Cartier Santos Medium** (~7 000€), **Rolex Oyster Perpetual 36** (~7 000€), **Cartier Tank Must** (~3 000€). Acier, polyvalentes, forte valeur de revente. Investissement intelligent qui se porte au bureau comme en weekend. Venez essayer.\`,
        \`For a first luxury purchase: **Cartier Santos Medium** (~€7,000), **Rolex Oyster Perpetual 36** (~€7,000), **Cartier Tank Must** (~€3,000). Steel, versatile, strong resale. Smart investment that works at the office and on weekends. Come try them.\`
      ) },

    { id:'can_i_swim', kw:['can I swim','puis-je nager','swim with watch','nager avec montre','shower with watch','douche avec montre','pool','piscine','beach','plage','sea water','eau de mer','salt water','eau salée','hot tub','jacuzzi','sauna','steam','vapeur','swim rolex','nager rolex','waterproof enough','assez étanche','take in water','prendre eau','safe in water','sûr dans l eau','swim safe','baignade'],
      r:()=>t(
        \`**30m/3ATM** : éclaboussures seulement, PAS de nage. **50m/5ATM** : nage calme OK. **100m/10ATM** : nage, snorkeling OK. **200m+** : plongée. Rolex Submariner (300m), Seamaster (300m) = parfait pour nager. **Jamais** de sauna/jacuzzi — la chaleur détruit les joints. Rincez à l'eau douce après la mer.\`,
        \`**30m/3ATM**: splashes only, NO swimming. **50m/5ATM**: calm swimming OK. **100m/10ATM**: swimming, snorkeling OK. **200m+**: diving. Rolex Submariner (300m), Seamaster (300m) = perfect for swimming. **Never** sauna/hot tub — heat destroys seals. Rinse with fresh water after sea.\`
      ) },

    { id:'strap_types', kw:['nato strap','bracelet nato','rubber strap','bracelet caoutchouc','leather strap','bracelet cuir','alligator strap','bracelet alligator','crocodile strap','bracelet crocodile','canvas strap','bracelet toile','mesh bracelet','bracelet mailles','milanese','milanais','strap material','matière bracelet','which strap','quel bracelet','change strap','changer bracelet','swap strap','comfortable strap','bracelet confortable','strap for summer','bracelet été','strap for sport','bracelet sport'],
      r:()=>t(
        \`**Cuir/alligator** : élégant, habillé, éviter l'eau. **Caoutchouc** : sport, étanche, confortable été. **NATO** : décontracté, léger, abordable. **Acier** : polyvalent, durable, premium. **Mesh** : rétro-chic. Changer le bracelet transforme le look d'une montre — c'est le moyen le plus simple de varier les styles.\`,
        \`**Leather/alligator**: elegant, dressy, avoid water. **Rubber**: sporty, waterproof, comfortable in summer. **NATO**: casual, lightweight, affordable. **Steel**: versatile, durable, premium. **Mesh**: retro-chic. Changing the strap transforms a watch's look — it's the easiest way to vary styles.\`
      ) },

    { id:'watch_trends', kw:['watch trends','tendances montres','trending watches','montres tendance','popular now','populaire maintenant','hot watch','montre en vogue','what is trending','qu est-ce qui est tendance','2026 watches','montres 2026','new releases','nouvelles sorties','latest watch','dernière montre','what is popular','qu est-ce qui est populaire','hype','buzz','most wanted','plus recherché','fashionable watch','montre à la mode'],
      r:()=>t(
        \`Tendances actuelles : boîtiers 36–39mm (retour aux tailles classiques), cadrans colorés (vert, bleu ciel, saumon), bracelets intégrés (Royal Oak, Nautilus), montres vintage/patinées. Les Rolex sport acier, AP Royal Oak et Patek Nautilus restent les plus demandées. Contactez-nous.\`,
        \`Current trends: 36–39mm cases (return to classic sizes), coloured dials (green, sky blue, salmon), integrated bracelets (Royal Oak, Nautilus), vintage/patinated watches. Steel sport Rolex, AP Royal Oak and Patek Nautilus remain most in demand. Contact us.\`
      ) },

    { id:'watch_as_heirloom', kw:['heirloom','héritage','pass down','transmettre','generation','génération','father to son','père à fils','family watch','montre familiale','legacy','patrimoine','keep forever','garder toujours','last a lifetime','durer toute une vie','for my children','pour mes enfants','intergenerational','intergénérationnel','you never own','on ne possède jamais','patek slogan','slogan patek','next generation','prochaine génération'],
      r:()=>t(
        \`Les montres mécaniques de qualité durent plusieurs générations avec un entretien régulier. Patek Philippe : "Vous ne possédez jamais vraiment une Patek Philippe, vous en êtes le gardien pour la génération suivante." Rolex, AP, Patek et Cartier sont conçues pour traverser les décennies. Un héritage tangible.\`,
        \`Quality mechanical watches last multiple generations with regular servicing. Patek Philippe: "You never actually own a Patek Philippe, you merely look after it for the next generation." Rolex, AP, Patek and Cartier are designed to span decades. A tangible legacy.\`
      ) },

    { id:'watch_for_woman_guide', kw:['watch for wife','montre pour femme','montre pour ma femme','girlfriend watch','montre copine','women luxury watch','montre luxe femme','ladies watch guide','guide montre femme','feminine watch','montre féminine','elegant women','femme élégante','women collection','collection femme','best women watch','meilleure montre femme','lady watch','montre dame','her watch','sa montre','small elegant','petite élégante'],
      r:()=>t(
        \`Montres femmes populaires : **Cartier Panthère** (icône Art Déco, ~4 000€), **Rolex Lady-Datejust 28mm** (~7 000€+), **Patek Twenty~4** (~12 000€+), **AP Royal Oak 33/34mm** (~20 000€+), **Cartier Ballon Bleu 33mm** (~5 000€). Venez découvrir notre sélection en boutique.\`,
        \`Popular women's watches: **Cartier Panthère** (Art Deco icon, ~€4,000), **Rolex Lady-Datejust 28mm** (€7,000+), **Patek Twenty~4** (€12,000+), **AP Royal Oak 33/34mm** (€20,000+), **Cartier Ballon Bleu 33mm** (~€5,000). Come discover our selection in-store.\`
      ) },

    { id:'paris_shopping', kw:['shopping paris','paris watches','watch shopping paris','acheter montre paris','boutique paris','paris boutique','visit paris','visiter paris','tourist watch','touriste montre','paris luxury','luxe paris','place vendôme','vendome','rue du faubourg','champs élysées','8ème arrondissement','paris 8','quartier montre','watch district paris','where to buy paris','où acheter paris'],
      r:()=>t(
        \`Notre boutique est idéalement située dans le 8ème arrondissement de Paris, quartier historique de l'horlogerie de luxe. Nous accueillons clients locaux et touristes internationaux. Détaxe disponible pour les résidents hors UE. Prenez rendez-vous pour une consultation privée.\`,
        \`Our boutique is ideally located in Paris's 8th arrondissement, the historic luxury watch district. We welcome local clients and international tourists. Tax refund (détaxe) available for non-EU residents. Book an appointment for a private consultation.\`
      ) },

    { id:'watch_for_collection', kw:['build collection','construire collection','start collection','commencer collection','watch collection advice','conseil collection','how many watches','combien de montres','three watch collection','collection trois montres','five watch collection','collection cinq montres','diversify collection','diversifier collection','complement','compléter','next watch','prochaine montre','add to collection','ajouter à ma collection','round out','compléter collection','which watch next','quelle montre ensuite'],
      r:()=>t(
        \`Collection idéale en 3 montres : 1) **Sport** (Submariner, Royal Oak), 2) **Habillée** (Calatrava, Cartier Tank), 3) **Complication** (GMT, Annual Calendar). Diversifiez marques et styles. Nous pouvons vous aider à planifier votre collection selon votre budget et vos goûts.\`,
        \`Ideal 3-watch collection: 1) **Sport** (Submariner, Royal Oak), 2) **Dress** (Calatrava, Cartier Tank), 3) **Complication** (GMT, Annual Calendar). Diversify brands and styles. We can help plan your collection based on budget and taste.\`
      ) },

`;

// Find insertion point: after service_interval entry
const marker = "Wearing an overdue watch wears down components and increases service cost.\`\n      ) },";

if (code.includes(marker)) {
  code = code.replace(marker, marker + '\n' + newEntries);
  console.log('✅ 16 new deep-research FAQ entries inserted');
} else {
  console.log('❌ Could not find service_interval marker, trying alternative...');
  // Try shorter
  const short = "increases service cost.\`\n      ) },";
  if (code.includes(short)) {
    code = code.replace(short, short + '\n' + newEntries);
    console.log('✅ 16 new deep-research FAQ entries inserted (alt marker)');
  } else {
    console.log('❌ Could not find any marker');
  }
}

fs.writeFileSync('/Users/zoomzoom/workspace/nosmontres/js/chatbot.js', code);
console.log('📊 New file size: ' + code.split('\n').length + ' lines');
