#!/usr/bin/env python3
"""Replace static PRICES db + runEstimate with live Cloudflare Worker fetch."""

import re

path = '/Users/zoomzoom/workspace/nosmontres/vendre.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# The block to remove: from the PRICES comment through buildNoResults closing brace
old_start = "  /* ── Price database ── */"
old_end   = "  function buildNoResults(label) {"

# Find indices
i_start = html.index(old_start)
# We need to find the end of buildNoResults function
# Look for the closing of buildNoResults (the last } before </script>)
i_end_search = html.index(old_end)
# Find the closing brace of buildNoResults by counting braces from its opening {
block_open = html.index('{', i_end_search + len(old_end))
depth = 0
i = block_open
while i < len(html):
    if html[i] == '{':
        depth += 1
    elif html[i] == '}':
        depth -= 1
        if depth == 0:
            i_func_end = i + 1
            break
    i += 1

old_block = html[i_start:i_func_end]
print(f"Replacing {len(old_block)} chars ({old_block[:60]!r}...)")

new_block = '''  /* ── Live price fetch via Cloudflare Worker ── */
  // UPDATE this URL after deploying worker/index.js to Cloudflare Workers
  const WORKER_URL = 'https://nosmontres-prices.YOUR_SUBDOMAIN.workers.dev';

  function fmtCurrency(num, currency) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: currency || 'EUR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
  }

  function fmtEur(num) { return fmtCurrency(num, 'EUR'); }

  /* ── Main estimate (async — fetches live market data) ── */
  async function runEstimate() {
    const brand     = document.getElementById('selBrand').value;
    const model     = document.getElementById('selModel').value;
    const condition = document.getElementById('selCondition').value;
    const papers    = document.getElementById('selPapers').value;
    const ref       = document.getElementById('inputRef').value.trim();
    const lang      = NM.lang || 'fr';

    if (!brand)     { alert(lang === 'fr' ? 'Veuillez sélectionner une marque' : 'Please select a brand'); return; }
    if (!condition) { alert(lang === 'fr' ? "Veuillez sélectionner l\'état" : 'Please select a condition'); return; }

    const results = document.getElementById('estimateResults');
    results.className = '';
    results.innerHTML = buildLoading(lang);
    results.classList.add('visible');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const parts = [brand, model, ref].filter(Boolean);
    const query = parts.join(' ');
    const label = parts.join(' · ');

    try {
      const resp = await fetch(WORKER_URL + '?q=' + encodeURIComponent(query));
      const data = await resp.json();
      if (!resp.ok || data.error) {
        results.innerHTML = buildError(label, lang);
      } else {
        results.innerHTML = buildResults(label, data.lowPrice, data.highPrice, data.currency, data.offerCount, papers, condition);
      }
    } catch (err) {
      results.innerHTML = buildError(label, lang);
    }
  }

  function buildLoading(lang) {
    const msg = lang === 'fr' ? 'Recherche des prix en cours&hellip;' : 'Fetching live prices&hellip;';
    return `
      <div class="results-header">
        <span class="results-header__label">${msg}</span>
      </div>
      <div style="text-align:center;padding:2rem">
        <span class="price-loader"></span>
      </div>`;
  }

  function buildResults(label, minP, maxP, currency, count, papers, condition) {
    const papNote = papers === 'yes'
      ? '<span class="fr"> · avec papiers</span><span class="en"> · with papers</span>'
      : '<span class="fr"> · sans papiers</span><span class="en"> · without papers</span>';
    const condNote = condition === 'new'
      ? '<span class="fr"> · neuve</span><span class="en"> · new</span>'
      : '<span class="fr"> · occasion</span><span class="en"> · used</span>';
    const cntFr = count > 0 ? `(${count} annonces)` : '';
    const cntEn = count > 0 ? `(${count} listings)` : '';
    return `
      <div class="results-header">
        <span class="results-header__label fr">Prix du march\u00e9 en temps r\u00e9el</span>
        <span class="results-header__label en">Live market prices</span>
        <span class="results-header__watch">${label}${condNote}${papNote}</span>
      </div>
      <div class="price-range">
        <div class="price-box price-box--low">
          <span class="price-box__label fr">Annonce la moins ch\u00e8re</span>
          <span class="price-box__label en">Cheapest listing</span>
          <span class="price-box__value">${fmtCurrency(minP, currency)}</span>
        </div>
        <div class="price-box price-box--high">
          <span class="price-box__label fr">Annonce la plus ch\u00e8re</span>
          <span class="price-box__label en">Most expensive listing</span>
          <span class="price-box__value">${fmtCurrency(maxP, currency)}</span>
        </div>
      </div>
      <p class="results-note fr">Prix relev\u00e9s en temps r\u00e9el sur le march\u00e9 secondaire. ${cntFr}</p>
      <p class="results-note en">Prices fetched live from the secondary market. ${cntEn}</p>
      <div class="results-cta-row">
        <a href="prendre-rendez-vous.html" class="btn-primary-sm">
          <span class="fr">Obtenir une offre de rachat</span>
          <span class="en">Get a buyback offer</span>
        </a>
      </div>`;
  }

  function buildError(label, lang) {
    return `
      <div class="results-header">
        <span class="results-header__label fr">Estimation non disponible</span>
        <span class="results-header__label en">Estimate unavailable</span>
        <span class="results-header__watch">${label}</span>
      </div>
      <p class="results-note fr">Les prix en temps r\u00e9el sont temporairement indisponibles. Contactez-nous pour une estimation personnalis\u00e9e.</p>
      <p class="results-note en">Live prices are temporarily unavailable. Contact us for a personalised estimate.</p>
      <div class="results-cta-row">
        <a href="prendre-rendez-vous.html" class="btn-primary-sm">
          <span class="fr">Estimation personnalis\u00e9e</span>
          <span class="en">Personal estimate</span>
        </a>
      </div>`;
  }

  function buildNoResults(label) {
    return buildError(label, NM.lang || 'fr');
  }'''

html_new = html[:i_start] + new_block + html[i_func_end:]

# Also add CSS for the loading spinner if not already present
spinner_css = '''
  .price-loader {
    display: inline-block;
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid rgba(200,170,100,0.2);
    border-top-color: var(--gold, #c8aa64);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
'''

if 'price-loader' not in html_new:
    # Insert before closing </style>
    html_new = html_new.replace('</style>', spinner_css + '\n</style>', 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html_new)

print("Done. vendre.html updated.")
print(f"New file size: {len(html_new)} chars")
