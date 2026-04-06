/* Collection page renderer — used by rolex.html, audemars-piguet.html, etc. */
function renderCollectionPage(brand, titleFr, titleEn, descFr, descEn, historyFr, historyEn) {
  // Page hero
  document.querySelector('.page-hero__eyebrow.fr').textContent = titleFr;
  document.querySelector('.page-hero__eyebrow.en').textContent = titleEn;

  // Watch grid for this brand
  const grid = document.getElementById('watchGrid');
  if (grid) {
    const watches = WATCHES.filter(w => w.brand === brand);
    grid.innerHTML = watches.map(w => NM.watchCard(w, NM.lang)).join('');
  }

  // Re-render on lang change
  const orig = NM.setLang.bind(NM);
  NM.setLang = function(lang, save) {
    orig(lang, save);
    if (grid) {
      const watches = WATCHES.filter(w => w.brand === brand);
      grid.innerHTML = watches.map(w => NM.watchCard(w, lang)).join('');
    }
  };
}
