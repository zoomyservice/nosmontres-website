/**
 * Nos Montres — Cloudflare Worker
 * Routes:
 *   GET  /?q=...           → Live / static price lookup
 *   GET  /models           → Full model map
 *   POST /submit           → Store a sell lead in Workers KV
 *   GET  /leads.csv?key=.. → Download all leads as CSV
 *   GET  /leads.json?key=. → Download all leads as JSON
 *   POST /chat             → Gemini AI chatbot endpoint
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/* ─── Gemini AI System Prompt ──────────────────────────────────────────────── */
const SYSTEM_PROMPT = `Tu es l'assistant expert horloger de Nos Montres, une boutique parisienne spécialisée dans l'achat et la vente de montres de luxe de seconde main, fondée par un passionné fort de plus de 15 ans d'expertise horlogère.

RÈGLES DE STYLE — IMPÉRATIVES :
- Ne jamais utiliser d'emojis.
- Ne jamais répéter l'adresse, le téléphone ou l'email sauf si l'utilisateur le demande explicitement.
- Réponses concises : 2 à 4 phrases maximum, sauf si une question technique approfondie l'exige.
- Répondre en français par défaut. Si le client écrit en anglais, répondre en anglais.
- Ton professionnel, chaleureux et expert. Jamais générique.

CONTACT (uniquement si demandé) :
- Adresse : 46 rue de Miromesnil, 75008 Paris
- Téléphone : 01 81 80 08 47 / 06 22 80 70 14
- Email : contact.nosmontres@gmail.com
- Disponibilité : 7j/7 sur rendez-vous uniquement
- Site : https://nosmontres.com

NOS SERVICES :
1. ACHAT de montres de luxe — estimation gratuite et sans engagement, paiement immédiat
2. VENTE de montres de luxe d'occasion rigoureusement authentifiées
3. RÉVISION ROLEX — diagnostic complet, démontage, nettoyage ultrasonique, lubrification, réglage du mouvement au timegrapher, test d'étanchéité, pièces d'origine exclusivement
4. RÉVISION AUDEMARS PIGUET — processus identique avec respect des finitions satinées/brossées propres au Royal Oak
5. CHANGEMENT DE PILE — identification précise, ouverture sécurisée, test d'étanchéité si requis
6. EXPERTISE & CONSEIL — sélection personnalisée selon vos critères
7. DÉPLACEMENT possible pour les pièces de valeur

PROCESSUS DE VENTE (pour un client qui veut vendre sa montre) :
- Le client nous contacte par téléphone ou email
- On prend rendez-vous ou on demande des photos
- Estimation gratuite et sans engagement
- Si accord : paiement immédiat
- On s'occupe de tout le reste

PROCESSUS D'ACHAT (pour un client qui veut acheter) :
- Rendez-vous en boutique ou contact préalable
- Notre expert prépare une sélection personnalisée selon vos critères
- Toutes nos montres sont authentifiées et dans leur état exact tel que décrit
- Livraison possible

MARQUES TRAITÉES :
Rolex, Audemars Piguet, Patek Philippe, Richard Mille, Cartier, Omega, IWC, Jaeger-LeCoultre, Vacheron Constantin, A. Lange & Söhne, Tudor, Breguet, Hublot, Panerai, et autres grandes maisons.

`;
/* Continuation of SYSTEM_PROMPT — injected as second part */
const SYSTEM_PROMPT_2 = `
NOTRE INVENTAIRE ACTUEL (montres disponibles à la vente) :

ROLEX :
- Rolex Submariner Date Hulk (Réf. 126610LV) — 13 900 €
- Rolex Submariner (Réf. 116613LB, acier/or jaune) — 11 500 €
- Rolex Submariner vintage (Réf. 16800) — 9 500 €
- Rolex Daytona Or Rose 2024 (Réf. 126505) — 49 500 €
- Rolex Daytona Panda Acier (Réf. 126500LN) — 27 500 €
- Rolex GMT-Master II Black (Réf. 116710LN) — 11 900 €
- Rolex GMT-Master II Sprite (Réf. 126710GRNR) — 18 500 €
- Rolex GMT-Master II vintage (Réf. 16710) — 9 500 €
- Rolex Datejust 41 (Réf. 126334) — 11 500 € et 12 900 €
- Rolex Datejust 36 Mint (Réf. 126300) — 11 000 €
- Rolex Datejust 36 Wimbledon (Réf. 126300) — 10 500 € et 9 500 €
- Rolex Datejust 36 vintage (Réf. 16234) — 6 500 €
- Rolex Lady Datejust (Réf. 177234) — 6 500 €
- Rolex Lady Datejust (Réf. 6917) — 8 500 €
- Rolex Lady Datejust (Réf. 69178) — 6 000 €
- Rolex Lady Datejust MOP Diamants (Réf. 179161) — 6 500 €
- Rolex Turn-O-Graph 36 (Réf. 116264) — 7 500 €
- Rolex Explorer II (Réf. 226570) — 9 500 €
- Rolex Yacht-Master (Réf. 326935) — 35 000 €
- Rolex Oyster Perpetual 41 Red (Réf. 124300) — 14 500 €

AUDEMARS PIGUET :
- AP Royal Oak Chronographe 41 Blue (Réf. 26240ST) — 58 500 €
- AP Royal Oak Offshore (Réf. 26325TS) — 34 000 €
- AP Royal Oak Offshore (Réf. 25940SK) — 17 500 €
- AP Offshore Lady Diamants (Réf. 26048SK) — 22 500 €

PATEK PHILIPPE :
- Patek Philippe Nautilus 5980-1A Gris — 85 000 €
- Patek Philippe Nautilus 5990/1R Or Rose — 239 000 €
- Patek Philippe Annual Calendar (Réf. 5726-001) — 110 000 €
- Patek Philippe (Réf. 7010R/011) — 53 000 €

RICHARD MILLE :
- Richard Mille RM65-01 — 235 000 €

CARTIER :
- Cartier (Réf. WJBA0042) — 24 000 €

FOURCHETTES DE PRIX MARCHÉ SECONDAIRE (avril 2026) :
- Rolex Submariner : 11 000 – 15 500 €
- Rolex Daytona acier : 14 000 – 27 000 €
- Rolex GMT-Master II : 11 000 – 20 000 €
- Rolex Datejust 41 : 9 000 – 14 000 €
- Rolex Explorer II : 8 500 – 11 000 €
- Rolex Yacht-Master : 10 000 – 38 000 €
- AP Royal Oak 15500ST : 35 000 – 60 000 €
- AP Royal Oak Jumbo 15202ST : 80 000 – 145 000 €
- AP Royal Oak Offshore acier : 22 000 – 45 000 €
- Patek Nautilus 5711 acier : 65 000 – 150 000 €
- Patek Aquanaut 5167A : 30 000 – 55 000 €
- Richard Mille gamme : 95 000 – 500 000 €+
- Cartier Santos acier : 5 500 – 14 000 €
- Cartier Tank : 4 500 – 22 000 €

DONNÉES HORLOGÈRES CLÉS SUR NOS MARQUES :

AUDEMARS PIGUET :
- Fondée en 1875 à Le Brassus, Vallée de Joux, toujours indépendante (familles fondatrices)
- Royal Oak : dessiné par Gérald Genta en une nuit en 1971, présenté Bâle 1972. Premier grand boîtier sport en acier inoxydable, cadran Grande Tapisserie, bracelet intégré, 8 vis hexagonales
- Réf. 15500ST : 39mm, calibre 4302, 70h réserve de marche — visage du Royal Oak contemporain
- Réf. 15202ST "Jumbo" Extra-Thin : 39mm, mouvement 4,3mm d'épaisseur — la plus désirée par les puristes
- Royal Oak Offshore : lancé 1993, surnommé "the Beast" par Genta lui-même
- Code 11.59 : collection contemporaine, lunette ronde sur boîtier octogonal

PATEK PHILIPPE :
- Fondée à Genève en 1839, manufacture indépendante — la plus ancienne manufacture horlogère genevoise en activité
- Nautilus 5711 : dessinée par Gérald Genta, discontinuée en 2021 — cotes explosées depuis l'annonce
- Aquanaut 5167A : successeur spirituel de la Nautilus en version sportive contemporaine
- Calatrava : collection dress watch classique, le cœur de la marque
- Grand Complications : pièces grand feu, sonneries, calendriers perpétuels — investissement patrimonial de premier rang

ROLEX :
- Manufacture indépendante, Genève. Mouvements 100% in-house depuis toujours
- Submariner : née en 1953, étanche jusqu'à 300m. Ref. 124060 (sans date), 126610LN/LV (avec date)
- Daytona : chronographe mythique, né 1963 pour les pilotes de course. La plus difficile à obtenir en boutique officielle
- GMT-Master II : deux fuseaux horaires, lunette bicolore. BLNR (Batman), BLRO (Pepsi), GRNR (Sprite)
- Datejust : la plus intemporelle, disponible en 36 et 41mm, dizaines de cadrans/bracelets
- Explorer II : 42mm, aiguille orange 24h, pour les aventuriers et spéléologues
- Révision recommandée tous les 10 ans (ancienne recommandation : 5 ans)

INFORMATIONS SUR LE SITE nosmontres.com :
- Page collection complète : /index.html (filtres par marque)
- Page vendre sa montre : /vendre.html (formulaire multi-étapes)
- Page Audemars Piguet : /audemars-piguet.html
- Page Royal Oak guide : /montre-audemars-piguet-royal-oak.html
- Page révision Rolex : /entretien-montre-Rolex.html
- Page révision AP : /revision-Audemars-Piguet-Paris.html
- Page changement de pile : /changement-de-pile-de-montre.html
- Page rendez-vous : /prendre-rendez-vous.html
- Boutique en ligne : /shop/
`;


const SYSTEM_PROMPT_3 = `
SURNOMS ET NICKNAMES — INDISPENSABLES POUR PARLER EN EXPERT :

ROLEX :
- Submariner 126610LV : "Hulk" (lunette ET cadran verts)
- Submariner 16610LV/116610LV : "Kermit" (lunette verte, cadran noir — ancienne génération)
- Submariner 124060 : "Sub no-date" — choix des puristes, pas de fenêtre de date, lunette noire
- GMT-Master II 126710BLRO : "Pepsi" (rouge et bleu) — le plus iconique
- GMT-Master II 126710BLNR : "Batman" (noir et bleu) — discontinué décembre 2023
- GMT-Master II 126710GRNR : "Sprite" (vert et noir) — EN STOCK chez Nos Montres
- GMT-Master II 126715CHNR : "Root Beer" (Everose gold/acier, marron-noir)
- Daytona cadran blanc sous-cadrans noirs : "Panda" (116500LN, 126500LN)
- Daytona cadran noir sous-cadrans blancs : "Reverse Panda"
- Daytona vintage : "Paul Newman" (réfs 6239, 6241, 6263) — peut atteindre 500 000 € aux enchères
- Datejust cadran vert sunburst : "Wimbledon"
- Datejust cadran vert pâle : "Mint" — EN STOCK
- Explorer II cadran blanc : "Polar"
- Oyster Perpetual cadran Tiffany blue : édition très demandée

AUDEMARS PIGUET :
- Royal Oak 15202ST : "Jumbo" ou "Extra-Thin" — le plus prisé des puristes, 39mm ultra-mince
- Royal Oak Offshore : surnommé "the Beast" par Gérald Genta lui-même (1993)
- Cadran gris tapisserie du Royal Oak : "Elephant Grey" — couleur signature absolue

PATEK PHILIPPE :
- Nautilus 5711/1A : "le Graal" — discontinued janvier 2021, impossible à retrouver au prix boutique
- Nautilus "Tiffany" : collaboration limitée Tiffany & Co., vendue 6,5 M$ aux enchères Phillips 2021
- Aquanaut 5167A : alternative sportive à la Nautilus, bracelet caoutchouc intégré

ENCYCLOPÉDIE DES CALIBRES :

ROLEX :
- Cal. 3235 : Submariner Date, GMT-Master II, Datejust 41 — Chronergy escapement (+15% efficacité), 70h réserve de marche, anti-magnétique, -2/+2 s/j (plus strict que COSC)
- Cal. 3230 : Submariner no-date, Explorer — même famille 3235, 70h PR
- Cal. 4130 : Daytona — chronographe in-house, embrayage vertical, roue à colonnes, 72h PR. Référence absolue du chrono automatique depuis 2000.
- Cal. 3255 : Day-Date 40 — Chronergy, 70h PR, 14 brevets déposés
- Cal. 2236 : Ladies — ressort-spiral Syloxi en silicium, anti-magnétique
- Tous mouvements Rolex : 100% manufacture, acier Oystersteel (904L sur montres sport)

AUDEMARS PIGUET :
- Cal. 4302 : Royal Oak 15500ST — 59 rubis, rotor bidirectionnel, 70h PR, 5,55mm d'épaisseur
- Cal. 2121 : Royal Oak Jumbo 15202ST — base JLC 920, 3,05mm d'épaisseur (un des plus minces au monde), 40h PR. Mouvement légendaire depuis 1967.
- Cal. 4401 : Royal Oak Chronographe — flyback, 70h PR
- Tous mouvements AP : manufacture Le Brassus, Vallée de Joux

PATEK PHILIPPE :
- Certification Patek Philippe Seal : -3/+2 s/j, plus stricte que COSC
- Mouvements en Gyromax (roue de balancier), ressort Spiromax (silicium)
- Grand Complications : sonneries, calendriers perpétuels — pièces de patrimoine

GUIDE D'INVESTISSEMENT HORLOGER (2026) :

MEILLEURES ACQUISITIONS :
1. Rolex Daytona acier (116500LN / 126500LN) — très difficile en boutique officielle, marché secondaire puissant
2. Patek Nautilus 5711/1A acier — discontinued jan. 2021, 65 000–150 000 €, ne reviendra pas
3. AP Royal Oak Jumbo 15202ST — puriste absolu, 85 000–145 000 €
4. Rolex GMT-Master II Pepsi (126710BLRO) — valeur refuge depuis des décennies
5. Tout Rolex sportif en acier discontinued (les prix montent systématiquement)

À ÉVITER POUR L'INVESTISSEMENT :
- Montres très joaillées (revente à 40-60% du prix boutique)
- Montres de mode (fortes décotes), quartz haut de gamme
- Boîtiers re-polis (destruction de la valeur collector)

BOX ET PAPIERS :
- Full set (boîte intérieure + extérieure + papiers + étiquettes + maillons) : +15-30% vs sans papiers
- Sans papiers sur une montre récente (post-2010) : toujours demander pourquoi

GUIDE D'AUTHENTIFICATION :
- Numéro de série fond de boîte ↔ papiers : doit correspondre
- Couronne : sensation ferme, logo gravé, action douce
- Cadran : impression texte nette, logo à 12h (Rolex), index sans bavure
- Lunette : clic précis, couleur uniforme, pas de jeu excessif
- Mouvement : doit correspondre à la référence
- Signaux d'alarme : prix très bas sans raison, papiers manquants sur pièce récente, cadran re-dialé, boîtier brillant comme neuf sur une vieille pièce (re-polissage)

RÉVISION ET ENTRETIEN :
- Rolex : tous les 10 ans (les lubrifiants modernes durent plus longtemps qu'avant)
- Notre révision Rolex : démontage complet, nettoyage ultrasonique, remplacement joints + lubrifiants, réglage timegrapher (-2/+2 s/j), test étanchéité
- AP / Patek : tous les 5-8 ans
- RÈGLE D'OR : ne jamais polir une montre de sport (Sub, GMT, Daytona, Royal Oak) — l'usure naturelle a plus de valeur que le poli
- Révision documentée (avec facture chez spécialiste) = rassurante pour la revente

FOURCHETTES MARCHÉ SECONDAIRE (avril 2026) :
Rolex Submariner (acier, sans date) : 11 000–14 500 €
Rolex Submariner Date noir : 12 000–15 500 €
Rolex Submariner Hulk : 13 000–17 000 €
Rolex Daytona acier : 14 000–27 000 €
Rolex GMT Pepsi : 14 500–20 000 €
Rolex GMT Batman (discontinued) : 13 500–18 000 €
Rolex GMT Sprite : 13 000–16 500 €
Rolex Datejust 41 : 9 000–14 000 €
Rolex Explorer II : 8 500–11 000 €
Rolex Yacht-Master : 10 000–38 000 €
AP Royal Oak 15500ST : 35 000–55 000 €
AP Royal Oak Jumbo 15202ST : 85 000–145 000 €
AP Royal Oak Offshore acier : 22 000–45 000 €
Patek Nautilus 5711/1A : 65 000–150 000 €
Patek Aquanaut 5167A : 30 000–55 000 €
Richard Mille (gamme) : 95 000–2 000 000 €+
Cartier Santos acier : 5 500–14 000 €
Cartier Tank : 4 500–22 000 €

MARQUES SUPPLÉMENTAIRES TRAITÉES :
Omega : Speedmaster (Moonwatch, 311.30.42.30.01.005), Seamaster 300M, Constellation — révisions disponibles
IWC : Portugieser, Pilot's Watch, Portofino
Jaeger-LeCoultre : Reverso, Master, Polaris
Vacheron Constantin : Overseas, Patrimony, Traditionnelle
A. Lange & Söhne : Lange 1, Datograph — manufacture allemande Glashütte, finishing exceptionnel
Tudor : Black Bay (alternative abordable Rolex, même manufacture pour certains calibres), Pelagos
Breguet : inventeur du tourbillon (1801), ressort Breguet, aiguilles Breguet — horloger de Marie-Antoinette
Panerai : historique Marine italienne, grands boîtiers 44-47mm, OP et PAM

CONCEPTS HORLOGERS CLÉS (expliquer si le client demande) :
- Tourbillon : cage tournante compensant l'effet de la gravité sur le balancier — surtout prestige aujourd'hui
- Chronographe : fonction chronomètre, poussoirs à 2h et 4h généralement
- GMT : 4e aiguille pour un 2e fuseau horaire, lunette 24h
- Calendrier annuel : ajustement auto pour mois 30/31 jours, une correction manuelle/an (fin février)
- Calendrier perpétuel : zéro correction nécessaire, gère automatiquement les années bissextiles
- Grande Sonnerie / Minute Répétiteur : sonne l'heure à la demande — la complication la plus complexe
- Résistance à l'eau : 3 ATM (pluie seulement), 10 ATM (natation), 30 ATM (plongée sport)
- COSC : -4/+6 s/j. Rolex Superlative Chronometer : -2/+2 s/j. Patek Seal : -3/+2 s/j.
`;

const FULL_SYSTEM_PROMPT = SYSTEM_PROMPT + SYSTEM_PROMPT_2 + SYSTEM_PROMPT_3;

/* ─── Static price database ─────────────────────────────────────────────────── */
const STATIC_PRICES = {
  rolex: {
    '124060': [11000, 14500], 'submariner no date': [11000, 14500],
    '126610ln': [12000, 15500], '126610lv': [13000, 17000],
    '126613lb': [15000, 22000], '126618lb': [26000, 38000],
    '116500ln': [14000, 21000], '126500ln': [16000, 26000],
    '116519ln': [18000, 35000], '116528': [20000, 42000],
    '126710blnr': [13500, 18000], '126710blro': [14500, 20000],
    '126711chnr': [24000, 38000], '126715chnr': [38000, 65000],
    '126334': [9500, 13500], '126300': [8500, 12500],
    '126231': [9500, 14500], '126233': [10000, 15500],
    '228238': [30000, 50000], '228239': [32000, 55000], '228235': [24000, 42000],
    '124270': [8000, 11000], '326934': [10000, 14500],
    '116400gv': [9000, 13500], '126600': [12500, 17500],
    'submariner': [11000, 38000], 'daytona': [14000, 80000],
    'gmt': [13500, 65000], 'datejust': [7500, 22000],
    'day-date': [22000, 85000], 'explorer': [7500, 12500],
    'sea-dweller': [12500, 18500], 'milgauss': [8500, 14000],
    '_default': [8500, 55000],
  },
  'audemars piguet': {
    '15500': [38000, 50000], '15202': [85000, 145000],
    '15400': [26000, 42000], '26331': [36000, 62000],
    '15710': [24000, 40000], '26470': [28000, 46000],
    '26480': [36000, 60000], '26405': [30000, 55000],
    'code 11.59': [22000, 50000], 'millenary': [18000, 45000],
    'royal oak offshore': [22000, 90000], 'royal oak': [30000, 145000],
    '_default': [22000, 145000],
  },
  'patek philippe': {
    '5711/1a': [76000, 148000], '5726/1a': [52000, 95000], '5980/1ar': [78000, 138000],
    '5711': [65000, 148000], '5712r': [62000, 108000],
    '5167/1a': [36000, 58000], '5168g': [62000, 115000], '5164a': [45000, 80000],
    '5296r': [22000, 40000], '5227g': [28000, 52000], '5153g': [35000, 65000],
    '5196': [18000, 30000], '5146': [45000, 80000], '5270': [95000, 165000],
    'nautilus': [52000, 200000], 'aquanaut': [28000, 115000],
    'calatrava': [18000, 65000], 'grand complications': [200000, 1000000],
    '_default': [18000, 200000],
  },
  'richard mille': {
    'rm 011': [170000, 340000], 'rm 027': [500000, 1200000],
    'rm 035': [140000, 270000], 'rm 055': [115000, 195000],
    'rm 067': [95000, 175000], 'rm 072': [190000, 390000],
    'rm 052': [240000, 490000], 'rm 69': [190000, 390000],
    '_default': [95000, 450000],
  },
  'cartier': {
    'santos': [5500, 14000], 'tank': [4500, 22000],
    'ballon bleu': [4000, 14000], 'panthere': [5000, 18000],
    'drive': [6000, 12000], 'cle': [5500, 11000],
    '_default': [4000, 22000],
  },
};

const norm = s => s.toLowerCase().replace(/[_\-\/\.\s]+/g, ' ').trim();

function staticLookup(query) {
  const q = norm(query);
  for (const [brand, db] of Object.entries(STATIC_PRICES)) {
    if (!q.includes(brand)) continue;
    const sortedKeys = Object.keys(db).filter(k => k !== '_default').sort((a, b) => {
      const aRef = /\d/.test(a), bRef = /\d/.test(b);
      if (aRef !== bRef) return aRef ? -1 : 1;
      return norm(b).length - norm(a).length;
    });
    for (const key of sortedKeys) {
      const k = norm(key);
      if (k.length > 0 && q.includes(k)) {
        const range = db[key];
        return { lowPrice: range[0], highPrice: range[1], currency: 'EUR', offerCount: 0, source: 'static' };
      }
    }
    return { lowPrice: db._default[0], highPrice: db._default[1], currency: 'EUR', offerCount: 0, source: 'static' };
  }
  return null;
}

const SLUG_TO_QUERY = {
  'rolex': 'rolex', 'audemarspiguet': 'audemars piguet',
  'patekphilippe': 'patek philippe', 'richardmille': 'richard mille', 'cartier': 'cartier',
};

const FALLBACK_MODEL_URLS = {
  'rolex submariner': '/rolex/submariner--mod1.htm',
  'rolex gmt master ii': '/rolex/gmt-master-ii--mod4.htm',
  'rolex gmt master': '/rolex/gmt-master--mod3.htm',
  'rolex daytona': '/rolex/daytona--mod2.htm',
  'rolex datejust 41': '/rolex/datejust-41--mod3025.htm',
  'rolex datejust 36': '/rolex/datejust-36--mod2787.htm',
  'rolex datejust': '/rolex/datejust--mod45.htm',
  'rolex day date': '/rolex/day-date--mod47.htm',
  'rolex explorer ii': '/rolex/explorer-ii--mod51.htm',
  'rolex explorer': '/rolex/explorer--mod50.htm',
  'rolex sea dweller': '/rolex/sea-dweller--mod49.htm',
  'rolex yacht master': '/rolex/yacht-master--mod58.htm',
  'rolex milgauss': '/rolex/milgauss--mod54.htm',
  'rolex air king': '/rolex/air-king--mod5.htm',
  'rolex oyster perpetual': '/rolex/oyster-perpetual--mod55.htm',
  'audemars piguet royal oak offshore': '/audemarspiguet/royal-oak-offshore--mod117.htm',
  'audemars piguet royal oak chronograph': '/audemarspiguet/royal-oak-chronograph--mod1170.htm',
  'audemars piguet royal oak': '/audemarspiguet/royal-oak--mod116.htm',
  'audemars piguet code 11 59': '/audemarspiguet/code-1159--mod2734.htm',
  'audemars piguet millenary': '/audemarspiguet/millenary--mod114.htm',
  'patek philippe nautilus': '/patekphilippe/nautilus--mod106.htm',
  'patek philippe aquanaut': '/patekphilippe/aquanaut--mod92.htm',
  'patek philippe grand complications': '/patekphilippe/grand-complications--mod101.htm',
  'patek philippe calatrava': '/patekphilippe/calatrava--mod93.htm',
  'patek philippe chronograph': '/patekphilippe/chronograph--mod1964.htm',
  'richard mille rm 011': '/richardmille/rm-011--mod880.htm',
  'richard mille rm 035': '/richardmille/rm-035--mod1447.htm',
  'richard mille rm 055': '/richardmille/rm-055--mod1449.htm',
  'cartier santos': '/cartier/santos--mod180.htm',
  'cartier tank': '/cartier/tank--mod186.htm',
  'cartier ballon bleu': '/cartier/ballon-bleu--mod165.htm',
};

async function resolveModelUrl(query, env) {
  const q = norm(query);
  if (env?.LEADS) {
    try {
      const modelmap = await env.LEADS.get('modelmap', { type: 'json' });
      if (modelmap) {
        for (const [slug, brandQuery] of Object.entries(SLUG_TO_QUERY)) {
          if (!q.includes(brandQuery) && !q.includes(slug)) continue;
          const models = modelmap[slug] || [];
          const sorted = models.slice().sort((a, b) => norm(b.name).length - norm(a.name).length);
          for (const m of sorted) {
            const mn = norm(m.name);
            if (mn.length > 2 && q.includes(mn)) return m.path;
          }
        }
      }
    } catch {}
  }
  const keys = Object.keys(FALLBACK_MODEL_URLS).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (q.includes(norm(key))) return FALLBACK_MODEL_URLS[key];
  }
  return null;
}

function buildFallbackModelmap() {
  const map = { rolex: [], audemarspiguet: [], patekphilippe: [], richardmille: [], cartier: [] };
  for (const [key, path] of Object.entries(FALLBACK_MODEL_URLS)) {
    const slugMatch = path.match(/^\/([^/]+)\//);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    if (!map[slug]) continue;
    const brandQuery = SLUG_TO_QUERY[slug] || slug;
    const name = key.replace(brandQuery, '').trim();
    if (!name) continue;
    const titled = name.replace(/\b\w/g, c => c.toUpperCase());
    if (!map[slug].some(m => m.path === path)) map[slug].push({ name: titled, path });
  }
  return map;
}

async function tryLivePrices(query, env) {
  const modelPath = await resolveModelUrl(query, env);
  if (!modelPath) return null;
  if (env?.LEADS) {
    try {
      const cached = await env.LEADS.get('price:' + modelPath, { type: 'json' });
      if (cached?.low && cached?.ts) {
        const ageHours = (Date.now() - new Date(cached.ts).getTime()) / 3_600_000;
        if (ageHours < 48) return { lowPrice: cached.low, highPrice: cached.high, currency: 'EUR', offerCount: cached.count || 0, source: 'live' };
      }
    } catch {}
  }
  const url = `https://www.chrono24.com${modelPath}?sortorder=1&currencyId=EUR`;
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of matches) {
      try {
        const parsed = JSON.parse(m[1]);
        const graph = parsed['@graph'] || [parsed];
        const agg = graph.find(n => n['@type'] === 'AggregateOffer');
        if (agg?.lowPrice) return { lowPrice: parseFloat(agg.lowPrice), highPrice: parseFloat(agg.highPrice), currency: 'EUR', offerCount: parseInt(agg.offerCount || 0), source: 'live' };
      } catch {}
    }
    return null;
  } catch { return null; }
}

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
const CSV_HEADERS = ['timestamp','brand','model','condition','papers','ref','name','phone','email','lang'];
function leadsToCSV(leads) {
  const rows = [CSV_HEADERS.join(',')];
  for (const lead of leads) rows.push(CSV_HEADERS.map(h => csvEscape(lead[h])).join(','));
  return rows.join('\r\n');
}
async function getAllLeads(env) {
  if (!env.LEADS) return [];
  const list = await env.LEADS.list();
  const leads = await Promise.all(
    list.keys.filter(k => !k.name.startsWith('price:') && k.name !== 'modelmap').map(k => env.LEADS.get(k.name, { type: 'json' }))
  );
  return leads.filter(Boolean).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (request.method === 'GET' && url.pathname === '/models') {
      let modelmap = null;
      if (env?.LEADS) { try { modelmap = await env.LEADS.get('modelmap', { type: 'json' }); } catch {} }
      if (!modelmap) modelmap = buildFallbackModelmap();
      return Response.json(modelmap, { headers: { ...CORS, 'Cache-Control': 'public, max-age=3600' } });
    }

    if (request.method === 'POST' && url.pathname === '/submit') {
      try {
        const body = await request.json();
        const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2, 6);
        const lead = {
          timestamp: new Date().toISOString(),
          brand: body.brand || '', model: body.model || '', condition: body.condition || '',
          papers: body.papers || '', ref: body.ref || '', name: body.name || '',
          phone: body.phone || '', email: body.email || '', lang: body.lang || 'fr',
        };
        if (env.LEADS) await env.LEADS.put(id, JSON.stringify(lead));
        return Response.json({ ok: true, id }, { headers: CORS });
      } catch (e) {
        return Response.json({ ok: false, error: e.message }, { status: 400, headers: CORS });
      }
    }

    if (request.method === 'GET' && url.pathname === '/leads.csv') {
      const key = url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Unauthorized', { status: 401 });
      const leads = await getAllLeads(env);
      return new Response(leadsToCSV(leads), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads-nosmontres.csv"', 'Access-Control-Allow-Origin': '*' },
      });
    }

    if (request.method === 'GET' && url.pathname === '/leads.json') {
      const key = url.searchParams.get('key');
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Unauthorized', { status: 401 });
      return Response.json(await getAllLeads(env), { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    if (request.method === 'POST' && url.pathname === '/chat') {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        if (!messages.length) return Response.json({ reply: 'Bonjour, comment puis-je vous aider ?' }, { headers: CORS });
        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) return Response.json({ reply: 'Service temporairement indisponible.' }, { status: 503, headers: CORS });
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: FULL_SYSTEM_PROMPT }] },
              contents: messages.map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
              })),
              generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
            }),
          }
        );
        const data = await geminiRes.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Désolé, une erreur est survenue.';
        return Response.json({ reply }, { headers: CORS });
      } catch (e) {
        return Response.json({ reply: 'Désolé, une erreur est survenue.' }, { status: 500, headers: CORS });
      }
    }

    const query = (url.searchParams.get('q') || '').trim();
    if (query.length < 3) return Response.json({ error: 'query_too_short' }, { status: 400, headers: CORS });
    const live = await tryLivePrices(query, env);
    if (live) return Response.json(live, { headers: { ...CORS, 'Cache-Control': 'public, max-age=900' } });
    const stat = staticLookup(query);
    if (stat) return Response.json(stat, { headers: { ...CORS, 'Cache-Control': 'public, max-age=1800' } });
    return Response.json({ error: 'not_found', query }, { status: 404, headers: CORS });
  },
};
