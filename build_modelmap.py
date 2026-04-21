import json, re, subprocess, sys

def slug_to_name(slug):
    slug = re.sub(r'--mod\d+', '', slug)
    slug = slug.replace('.htm', '')
    parts = slug.split('-')
    result = []
    for p in parts:
        if re.match(r'^(rm|gmt|ii|iii|iv|vi|vii|viii|xii|mc|c)$', p, re.I):
            result.append(p.upper())
        else:
            result.append(p.capitalize())
    return ' '.join(result)

def make_entries(paths):
    entries = []
    seen = set()
    for p in paths:
        clean = p.split('#')[0]
        if clean in seen:
            continue
        seen.add(clean)
        m = re.match(r'^/[^/]+/([^/]+)\.htm', clean)
        if not m:
            continue
        slug = m.group(1)
        name = slug_to_name(slug)
        entries.append({"name": name, "path": clean})
    return entries

modelmap = {
    "rolex": make_entries([
        "/rolex/gmt-master-ii--mod4.htm","/rolex/daytona--mod2.htm","/rolex/submariner--mod1.htm",
        "/rolex/datejust--mod45.htm","/rolex/day-date--mod47.htm","/rolex/yacht-master-ii--mod59.htm",
        "/rolex/oyster-perpetual--mod55.htm","/rolex/sea-dweller--mod49.htm","/rolex/explorer-ii--mod51.htm",
        "/rolex/milgauss--mod54.htm","/rolex/yacht-master--mod58.htm","/rolex/gmt-master--mod3.htm",
        "/rolex/lady-datejust--mod53.htm","/rolex/explorer--mod50.htm","/rolex/air-king--mod5.htm",
        "/rolex/submariner-no-date--mod2460.htm","/rolex/submariner-date--mod981.htm",
        "/rolex/land-dweller--mod3217.htm","/rolex/1908--mod3109.htm","/rolex/sky-dweller--mod611.htm",
        "/rolex/submariner-date--mod981.htm#snippet",
        "/rolex/air-king-date--mod957.htm","/rolex/cellini--mod43.htm","/rolex/cellini-danaos--mod972.htm",
        "/rolex/cellini-date--mod970.htm","/rolex/cellini-dual-time--mod971.htm",
        "/rolex/cellini-moonphase--mod2722.htm","/rolex/cellini-prince--mod973.htm",
        "/rolex/cellini-time--mod974.htm","/rolex/chronograph--mod44.htm",
        "/rolex/datejust-31--mod3023.htm","/rolex/datejust-36--mod2787.htm","/rolex/datejust-41--mod3025.htm",
        "/rolex/datejust-ii--mod46.htm","/rolex/datejust-oysterquartz--mod952.htm",
        "/rolex/datejust-turn-o-graph--mod950.htm","/rolex/day-date-36--mod2723.htm",
        "/rolex/day-date-40--mod964.htm","/rolex/day-date-ii--mod48.htm",
        "/rolex/day-date-oysterquartz--mod954.htm","/rolex/lady-datejust-pearlmaster--mod951.htm",
        "/rolex/oyster--mod3030.htm","/rolex/oysterdate-precision--mod3075.htm",
        "/rolex/oyster-perpetual-26--mod2730.htm","/rolex/oyster-perpetual-28--mod3028.htm",
        "/rolex/oyster-perpetual-31--mod2729.htm","/rolex/oyster-perpetual-34--mod2728.htm",
        "/rolex/oyster-perpetual-36--mod2727.htm","/rolex/oyster-perpetual-39--mod2726.htm",
        "/rolex/oyster-perpetual-41--mod3029.htm","/rolex/oyster-perpetual-date--mod955.htm",
        "/rolex/oyster-perpetual-lady-date--mod956.htm","/rolex/oyster-precision--mod57.htm",
        "/rolex/pearlmaster--mod524.htm","/rolex/precision--mod3027.htm","/rolex/prince--mod523.htm",
        "/rolex/sea-dweller-4000--mod953.htm","/rolex/sea-dweller-deepsea--mod878.htm",
        "/rolex/yacht-master-37--mod2724.htm","/rolex/yacht-master-40--mod2725.htm",
        "/rolex/yacht-master-42--mod2761.htm"
    ]),
    "audemarspiguet": make_entries([
        "/audemarspiguet/royal-oak--mod116.htm","/audemarspiguet/royal-oak-offshore--mod117.htm",
        "/audemarspiguet/jules-audemars--mod112.htm","/audemarspiguet/edward-piguet--mod111.htm",
        "/audemarspiguet/royal-oak-chronograph--mod1170.htm","/audemarspiguet/royal-oak-concept--mod2368.htm",
        "/audemarspiguet/royal-oak-dual-time--mod2418.htm",
        "/audemarspiguet/royal-oak-offshore-chronograph--mod1177.htm",
        "/audemarspiguet/royal-oak-offshore-diver--mod1176.htm",
        "/audemarspiguet/royal-oak-perpetual-calendar--mod1173.htm",
        "/audemarspiguet/royal-oak-selfwinding--mod1172.htm",
        "/audemarspiguet/royal-oak-tourbillon--mod1171.htm",
        "/audemarspiguet/royal-oak-double-balance-wheel-openworked--mod2732.htm",
        "/audemarspiguet/royal-oak-jumbo--mod2733.htm","/audemarspiguet/code-1159--mod2734.htm",
        "/audemarspiguet/millenary--mod114.htm","/audemarspiguet/remaster02--mod3150.htm",
        "/audemarspiguet/haute-joaillerie--mod2616.htm","/audemarspiguet/huitieme--mod2419.htm",
        "/audemarspiguet/millenary-4101--mod1168.htm","/audemarspiguet/millenary-chronograph--mod2417.htm",
        "/audemarspiguet/millenary-ladies--mod115.htm","/audemarspiguet/promesse--mod1184.htm",
        "/audemarspiguet/quantieme-perpetual-calendar--mod3139.htm",
        "/audemarspiguet/royal-oak-day-date--mod1174.htm","/audemarspiguet/royal-oak-lady--mod113.htm",
        "/audemarspiguet/royal-oak-mini--mod3151.htm",
        "/audemarspiguet/royal-oak-offshore-chronograph-volcano--mod1181.htm",
        "/audemarspiguet/royal-oak-offshore-diver-chronograph--mod2731.htm",
        "/audemarspiguet/royal-oak-offshore-grand-prix--mod1180.htm",
        "/audemarspiguet/royal-oak-offshore-lady--mod118.htm",
        "/audemarspiguet/royal-oak-offshore-tourbillon-chronograph--mod1179.htm",
        "/audemarspiguet/tradition--mod1183.htm"
    ]),
    "patekphilippe": make_entries([
        "/patekphilippe/nautilus--mod106.htm","/patekphilippe/calatrava--mod93.htm",
        "/patekphilippe/grand-complications--mod101.htm","/patekphilippe/complications--mod96.htm",
        "/patekphilippe/aquanaut--mod92.htm","/patekphilippe/golden-ellipse--mod97.htm",
        "/patekphilippe/gondolo--mod98.htm","/patekphilippe/twenty4--mod109.htm",
        "/patekphilippe/vintage--mod110.htm","/patekphilippe/grandmaster-chime--mod2646.htm",
        "/patekphilippe/cubitus--mod3184.htm","/patekphilippe/travel-time--mod108.htm",
        "/patekphilippe/annual-calendar--mod1963.htm",
        "/patekphilippe/annual-calendar-chronograph--mod94.htm","/patekphilippe/beta-21--mod2013.htm",
        "/patekphilippe/celestial--mod538.htm","/patekphilippe/chronograph--mod1964.htm",
        "/patekphilippe/ellipse--mod3138.htm","/patekphilippe/hour-glass--mod102.htm",
        "/patekphilippe/minute-repeater--mod1965.htm",
        "/patekphilippe/minute-repeater-perpetual-calendar--mod1966.htm",
        "/patekphilippe/neptune--mod2436.htm","/patekphilippe/pagoda--mod107.htm",
        "/patekphilippe/perpetual-calendar--mod99.htm",
        "/patekphilippe/perpetual-calendar-chronograph--mod1967.htm",
        "/patekphilippe/pocket-watch--mod3203.htm","/patekphilippe/sky-moon-tourbillon--mod1968.htm",
        "/patekphilippe/top-hat--mod3202.htm","/patekphilippe/world-time--mod95.htm",
        "/patekphilippe/world-time-chronograph--mod2574.htm"
    ]),
    "richardmille": make_entries([
        "/richardmille/rm-011--mod880.htm","/richardmille/rm-035--mod1447.htm",
        "/richardmille/rm-027--mod1443.htm","/richardmille/rm-055--mod1449.htm",
        "/richardmille/rm-030--mod1445.htm","/richardmille/rm-010--mod882.htm",
        "/richardmille/rm-029--mod1444.htm","/richardmille/rm-061--mod1451.htm",
        "/richardmille/rm-005--mod1450.htm","/richardmille/rm-016--mod881.htm",
        "/richardmille/rm-028--mod883.htm","/richardmille/rm-032--mod1446.htm",
        "/richardmille/rm-037--mod2906.htm","/richardmille/rm-052--mod1448.htm",
        "/richardmille/rm-07--mod2904.htm","/richardmille/rm-43-01--mod3204.htm",
        "/richardmille/rm-63--mod2905.htm","/richardmille/rm-67--mod2903.htm",
        "/richardmille/rm-69--mod2958.htm","/richardmille/rm-88--mod3194.htm",
        "/richardmille/rm-up-01--mod3195.htm"
    ]),
    "cartier": make_entries([
        "/cartier/tank--mod186.htm","/cartier/santos--mod180.htm","/cartier/panthere--mod168.htm",
        "/cartier/crash--mod1049.htm","/cartier/ballon-bleu--mod165.htm",
        "/cartier/calibre-de-cartier--mod166.htm","/cartier/baignoire--mod164.htm",
        "/cartier/pasha--mod172.htm","/cartier/drive-de-cartier--mod2437.htm",
        "/cartier/ronde-de-cartier--mod2523.htm","/cartier/rotonde-de-cartier--mod453.htm",
        "/cartier/tortue--mod451.htm","/cartier/tank-louis-cartier--mod184.htm",
        "/cartier/tank-francaise--mod183.htm","/cartier/tank-solo--mod185.htm",
        "/cartier/tank-americaine--mod181.htm","/cartier/santos-dumont--mod178.htm",
        "/cartier/ballon-blanc--mod1047.htm","/cartier/ronde-louis-cartier--mod175.htm",
        "/cartier/roadster--mod173.htm","/cartier/21-chronoscaph--mod162.htm",
        "/cartier/21-must-de-cartier--mod163.htm","/cartier/ballerine--mod777.htm",
        "/cartier/ballon-bleu-28mm--mod1053.htm","/cartier/ballon-bleu-33mm--mod1052.htm",
        "/cartier/ballon-bleu-36mm--mod1051.htm","/cartier/ballon-bleu-40mm--mod1057.htm",
        "/cartier/ballon-bleu-42mm--mod1055.htm","/cartier/ballon-bleu-44mm--mod1056.htm",
        "/cartier/calibre-de-cartier-chronograph--mod2522.htm",
        "/cartier/calibre-de-cartier-diver--mod2438.htm","/cartier/captive-de-cartier--mod2465.htm",
        "/cartier/ceinture--mod3228.htm","/cartier/cle-de-cartier--mod1048.htm",
        "/cartier/cloche--mod3229.htm","/cartier/colisee--mod3230.htm","/cartier/cougar--mod776.htm",
        "/cartier/delices-de-cartier--mod639.htm","/cartier/diabolo--mod2467.htm",
        "/cartier/hypnose--mod2464.htm","/cartier/la-dona-de-cartier--mod167.htm",
        "/cartier/lanieres--mod1050.htm","/cartier/pasha-c--mod171.htm",
        "/cartier/pasha-seatimer--mod170.htm","/cartier/ronde-croisiere-de-cartier--mod2439.htm",
        "/cartier/ronde-solo-de-cartier--mod174.htm","/cartier/santos-100--mod176.htm",
        "/cartier/santos-demoiselle--mod177.htm","/cartier/santos-galbee--mod179.htm",
        "/cartier/tank-a-guichets--mod3218.htm","/cartier/tank-anglaise--mod747.htm",
        "/cartier/tank-divan--mod182.htm","/cartier/tank-mc--mod906.htm",
        "/cartier/tank-vermeil--mod778.htm","/cartier/tonneau--mod452.htm",
        "/cartier/trinity--mod2466.htm"
    ])
}

for brand, models in modelmap.items():
    print(f"{brand}: {len(models)}")
total = sum(len(v) for v in modelmap.values())
print(f"total: {total}")

with open('/Users/zoomzoom/workspace/nosmontres/modelmap.json', 'w') as f:
    json.dump(modelmap, f)
print(f"Written: {len(json.dumps(modelmap))} bytes")
