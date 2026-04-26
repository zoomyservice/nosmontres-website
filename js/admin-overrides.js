(function () {
  'use strict';
  const WORKER = 'https://nosmontres-prices.zoozoomfast.workers.dev';
  const TEXT_MAP = {
    nm_hero_eyebrow_fr:'.hero__eyebrow.fr', nm_hero_eyebrow_en:'.hero__eyebrow.en',
    nm_hero_title_fr:'.hero__title.fr', nm_hero_title_en:'.hero__title.en',
    nm_hero_sub_fr:'.hero__sub.fr', nm_hero_sub_en:'.hero__sub.en',
    nm_strip_quote_fr:'.about-strip__quote.fr', nm_strip_quote_en:'.about-strip__quote.en',
    nm_strip_body_fr:'.about-strip__body.fr', nm_strip_body_en:'.about-strip__body.en',
    nm_ap_quote_fr:'.feature-row__title.fr', nm_ap_quote_en:'.feature-row__title.en',
    nm_ap_body_fr:'.feature-row__body.fr', nm_ap_body_en:'.feature-row__body.en',
    nm_stat1_num:'.stat-item:nth-child(1) .stat-number',
    nm_stat2_num:'.stat-item:nth-child(2) .stat-number',
    nm_stat3_num:'.stat-item:nth-child(3) .stat-number',
    nm_stat4_num:'.stat-item:nth-child(4) .stat-number',
    nm_vendre_title_fr:'.sell-hero__title.fr', nm_vendre_title_en:'.sell-hero__title.en',
    nm_vendre_sub_fr:'.sell-hero__sub.fr', nm_vendre_sub_en:'.sell-hero__sub.en',
    nm_rdv_title_fr:'.rdv-info__title.fr', nm_rdv_title_en:'.rdv-info__title.en',
    nm_rdv_body_fr:'.rdv-info__body.fr', nm_rdv_body_en:'.rdv-info__body.en',
  };
  const CSS_VAR_MAP = {
    nm_css_gold:'--gold', nm_css_gold_lt:'--gold-lt',
    nm_css_charcoal:'--charcoal', nm_css_cream:'--cream',
    nm_css_ivory:'--ivory', nm_css_mid:'--mid',
  };
  fetch(WORKER + '/content').then(r => r.json()).then(data => {
    if (!data || !Object.keys(data).length) return;
    Object.entries(TEXT_MAP).forEach(([k, sel]) => {
      if (data[k]) try { document.querySelectorAll(sel).forEach(el => { el.textContent = data[k]; }); } catch {}
    });
    let css = '';
    Object.entries(CSS_VAR_MAP).forEach(([k, v]) => { if (data[k]) css += v + ':' + data[k] + ';'; });
    if (css) { const s = document.createElement('style'); s.textContent = ':root{' + css + '}'; document.head.appendChild(s); }
    if (data.watches_json) {
      try {
        const upd = JSON.parse(data.watches_json);
        if (typeof WATCHES !== 'undefined' && Array.isArray(WATCHES)) {
          WATCHES.length = 0; upd.forEach(w => WATCHES.push(w));
          if (window.WatchEngine && document.getElementById('watchGrid')) WatchEngine.renderGrid('watchGrid');
        }
      } catch {}
    }
    if (data.nm_font_heading || data.nm_font_body) {
      const fs = document.createElement('style'); let ft = '';
      if (data.nm_font_heading) ft += 'h1,h2,h3,.hero__title,.section-title{font-family:' + data.nm_font_heading + '!important;}';
      if (data.nm_font_body)    ft += 'body,p{font-family:' + data.nm_font_body + '!important;}';
      fs.textContent = ft; document.head.appendChild(fs);
    }
    const pg = (location.pathname.split('/').pop() || 'index.html').replace('.html','').replace(/-/g,'_');
    const wk = '_wysiwyg_' + pg;
    if (data[wk]) { try { const ov = JSON.parse(data[wk]); Object.entries(ov).forEach(([s,t]) => { try { document.querySelectorAll(s).forEach(e => { e.textContent = t; }); } catch {} }); } catch {} }
    const wImgKey = '_wysiwyg_' + pg + '_imgs';
    if (data[wImgKey]) {
      try {
        const imgOverrides = JSON.parse(data[wImgKey]);
        Object.entries(imgOverrides).forEach(([sel, src]) => {
          try { document.querySelectorAll(sel).forEach(el => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.15s ease';
            el.src = src;
            el.addEventListener('load', () => { el.style.opacity = '1'; }, { once: true });
          }); } catch {}
        });
      } catch {}
    }
  }).catch(() => {});
})();
