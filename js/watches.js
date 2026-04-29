/* ============================================================
   NOS MONTRES — Watch Data + Language Engine
   ============================================================ */

const WATCHES = [
  {
    id: '1737944', brand: 'Rolex',
    name_fr: 'Rolex Oyster Perpetual 41 Corail',
    name_en: 'Rolex Oyster Perpetual 41 Coral',
    ref: '124300 Red', papers: true, box: true, year: 2022, price: 14500,
    note_fr: '', note_en: '',
    img: 'IMG-7772-Y5vh.jpeg'
  },
  {
    id: '1737943', brand: 'Rolex',
    name_fr: 'Rolex DateJust 41 Wimbledon',
    name_en: 'Rolex DateJust 41 Wimbledon',
    ref: '126300 Wimbledon Oyster', papers: true, box: true, year: 2023, price: 9500,
    note_fr: '', note_en: '',
    img: 'IMG-7771-C54e.jpeg'
  },
  {
    id: '1737942', brand: 'Rolex',
    name_fr: 'Rolex DateJust 36',
    name_en: 'Rolex DateJust 36',
    ref: '16234', papers: false, box: true, year: 1993, price: 6500,
    note_fr: '', note_en: '',
    img: 'IMG-1340-mZs7.jpeg'
  },
  {
    id: '1737941', brand: 'Rolex',
    name_fr: 'Rolex Explorer II',
    name_en: 'Rolex Explorer II',
    ref: '226570', papers: true, box: true, year: 2023, price: 9500,
    note_fr: '', note_en: '',
    img: 'IMG-1296-HzNs.jpeg'
  },
  {
    id: '1737940', brand: 'Rolex',
    name_fr: 'Rolex DateJust 41 Wimbledon',
    name_en: 'Rolex DateJust 41 Wimbledon',
    ref: '126300 Wimbledon', papers: true, box: true, year: 2023, price: 10500,
    note_fr: '', note_en: '',
    img: '479fa276-9dae-4a01-a895-b85a14a8342f-KK2x.jpeg'
  },
  {
    id: '1737939', brand: 'Rolex',
    name_fr: "Rolex GMT Master II 'Bruce Wayne'",
    name_en: "Rolex GMT Master II 'Bruce Wayne'",
    ref: '126710GRNR', papers: true, box: true, year: 2024, price: 18500,
    note_fr: '', note_en: '',
    img: 'IMG-8144-PeMi.jpeg'
  },
  {
    id: '1737938', brand: 'Richard Mille',
    name_fr: 'Richard Mille RM65-01 Titanium',
    name_en: 'Richard Mille RM65-01 Titanium',
    ref: 'RM65-01', papers: true, box: true, year: 2022, price: 235000,
    note_fr: '', note_en: '',
    img: 'c552deb8-4084-4deb-93e7-15a7ce0b2aaf-8BG2.jpeg'
  },
  {
    id: '1737937', brand: 'Rolex',
    name_fr: 'Rolex Skydweller Or Rose',
    name_en: 'Rolex Skydweller Rose Gold',
    ref: '326935', papers: true, box: true, year: 2016, price: 35000,
    note_fr: 'État : Très bon', note_en: 'Condition: Very good',
    img: 'aae4046d-f822-44bb-82fc-d64c6cca21e7-WUsJ.jpeg'
  },
  {
    id: '1737935', brand: 'Audemars Piguet',
    name_fr: 'Audemars Piguet Royal Oak 41 Anniversaire',
    name_en: 'Audemars Piguet Royal Oak 41 Anniversary',
    ref: '26240ST Blue', papers: true, box: true, year: 2022, price: 58500,
    note_fr: '', note_en: '',
    img: 'IMG-1358-iYgo.jpeg'
  },
  {
    id: '1737934', brand: 'Rolex',
    name_fr: 'Rolex Date Just 41',
    name_en: 'Rolex Date Just 41',
    ref: '126334', papers: true, box: true, year: 2024, price: 12900,
    note_fr: '', note_en: '',
    img: 'IMG-1334-V3NN.jpeg'
  },
  {
    id: '1737933', brand: 'Patek Philippe',
    name_fr: 'Patek Philippe Nautilus 5726 Neuve',
    name_en: 'Patek Philippe Nautilus 5726 New',
    ref: '5726-001', papers: true, box: true, year: 2019, price: 110000,
    note_fr: 'Dernière Production — Neuve', note_en: 'Last Production — New',
    img: 'IMG-5178-VIZv.jpeg'
  },
  {
    id: '1737931', brand: 'Rolex',
    name_fr: 'Rolex Daytona Céramique Noir 2025',
    name_en: 'Rolex Daytona Black Ceramic 2025',
    ref: '126500LN', papers: true, box: true, year: 2025, price: 27500,
    note_fr: 'Neuve', note_en: 'New',
    img: 'IMG-6220-elid.jpeg'
  },
  {
    id: '1737930', brand: 'Rolex',
    name_fr: 'Rolex Submariner Date Or/Acier',
    name_en: 'Rolex Submariner Date Gold/Steel',
    ref: '116613LB', papers: false, box: true, year: 2010, price: 11500,
    note_fr: '', note_en: '',
    img: 'IMG-0947-bCpr.jpeg'
  },
  {
    id: '1737927', brand: 'Audemars Piguet',
    name_fr: 'Audemars Piguet Royal Oak Offshore',
    name_en: 'Audemars Piguet Royal Oak Offshore',
    ref: '25940SK', papers: true, box: true, year: 2008, price: 17500,
    note_fr: '', note_en: '',
    img: 'IMG-0892-Efhz.jpeg'
  },
  {
    id: '1737926', brand: 'Audemars Piguet',
    name_fr: 'Audemars Piguet Léo Messi',
    name_en: 'Audemars Piguet Léo Messi',
    ref: '26325TS', papers: true, box: true, year: 2014, price: 34000,
    note_fr: '', note_en: '',
    img: 'IMG-0876-SePI.jpeg'
  },
  {
    id: '1737924', brand: 'Rolex',
    name_fr: 'Rolex DateJust 26mm Diamants',
    name_en: 'Rolex DateJust 26mm Diamonds',
    ref: '179161 MOP Diamants', papers: true, box: true, year: 2006, price: 6500,
    note_fr: '', note_en: '',
    img: 'IMG-0674-EmyW.jpeg'
  },
  {
    id: '1737921', brand: 'Rolex',
    name_fr: 'Rolex Date Just 41',
    name_en: 'Rolex Date Just 41',
    ref: '126334', papers: true, box: true, year: 2019, price: 11500,
    note_fr: '', note_en: '',
    img: 'IMG-0694-Ef9e.jpeg'
  },
  {
    id: '1737920', brand: 'Rolex',
    name_fr: 'Rolex Oyster Perpetual 31',
    name_en: 'Rolex Oyster Perpetual 31',
    ref: '177234', papers: true, box: true, year: 2009, price: 6500,
    note_fr: '', note_en: '',
    img: 'IMG-0647-BFXN.jpeg'
  },
  {
    id: '1737916', brand: 'Cartier',
    name_fr: 'Cartier Baignoire Or Rose 2025',
    name_en: 'Cartier Baignoire Rose Gold 2025',
    ref: 'WJBA0042', papers: true, box: true, year: 2025, price: 24000,
    note_fr: '', note_en: '',
    img: '0A28E77E-4F90-4C25-8873-81BE389F3F5D-upDT.jpeg'
  },
  {
    id: '1737915', brand: 'Rolex',
    name_fr: 'Rolex GMT Master II 16710',
    name_en: 'Rolex GMT Master II 16710',
    ref: '16710', papers: false, box: true, year: 2001, price: 9500,
    note_fr: 'Série K', note_en: 'K Series',
    img: 'IMG-0725-97yG.jpeg'
  },
  {
    id: '1737913', brand: 'Rolex',
    name_fr: 'Rolex GMT Master II Aiguille Verte',
    name_en: 'Rolex GMT Master II Green Hand',
    ref: '116710LN', papers: true, box: true, year: 2013, price: 11900,
    note_fr: '', note_en: '',
    img: 'IMG-4408-UBP1.jpeg'
  },
  {
    id: '1737911', brand: 'Rolex',
    name_fr: 'Rolex Submariner Date Matte Dial',
    name_en: 'Rolex Submariner Date Matte Dial',
    ref: '16800', papers: false, box: true, year: 1983, price: 9500,
    note_fr: '', note_en: '',
    img: 'IMG-0741-SL0g.jpeg'
  },
  {
    id: '1737910', brand: 'Rolex',
    name_fr: 'Rolex Lady-DateJust Or Jaune 26mm',
    name_en: 'Rolex Lady-DateJust Yellow Gold 26mm',
    ref: '69178', papers: false, box: true, year: 1978, price: 6000,
    note_fr: '', note_en: '',
    img: 'P1766205-9JoU.jpeg'
  },
  {
    id: '1737899', brand: 'Rolex',
    name_fr: 'Rolex DateJust Or 26mm',
    name_en: 'Rolex DateJust Gold 26mm',
    ref: '6917', papers: false, box: true, year: null, price: 8500,
    note_fr: 'Service Rolex 2024', note_en: 'Rolex Service 2024',
    img: 'IMG-9499-0UJn.jpeg'
  },
  {
    id: '1737894', brand: 'Rolex',
    name_fr: 'Rolex Submariner Starbucks Neuve 2024',
    name_en: 'Rolex Submariner Starbucks New 2024',
    ref: '126610LV', papers: true, box: true, year: 2024, price: 13900,
    note_fr: 'Neuve', note_en: 'New',
    img: 'P1766669-WI7X.jpeg'
  },
  {
    id: '1737891', brand: 'Rolex',
    name_fr: 'Rolex DateJust 41 Green 2024',
    name_en: 'Rolex DateJust 41 Green 2024',
    ref: '126300 Mint', papers: true, box: true, year: 2024, price: 11000,
    note_fr: '', note_en: '',
    img: 'P1777015-I7W6.jpeg'
  },
  {
    id: '1737879', brand: 'Patek Philippe',
    name_fr: 'Patek Philippe Nautilus Or Rose 7010R',
    name_en: 'Patek Philippe Nautilus Rose Gold 7010R',
    ref: '7010R/011', papers: true, box: true, year: 2019, price: 53000,
    note_fr: 'Service Patek Philippe 2026', note_en: 'Patek Philippe Service 2026',
    img: 'P1777125-eQmi.jpeg'
  },
  {
    id: '1737876', brand: 'Audemars Piguet',
    name_fr: 'Audemars Piguet Offshore Lady Diamants',
    name_en: 'Audemars Piguet Offshore Lady Diamonds',
    ref: '26048SK', papers: true, box: true, year: 2015, price: 22500,
    note_fr: '', note_en: '',
    img: 'IMG-8745-zgLm.jpeg'
  },
  {
    id: '1737863', brand: 'Rolex',
    name_fr: 'Rolex Daytona Or Rose 2024',
    name_en: 'Rolex Daytona Rose Gold 2024',
    ref: '126505', papers: true, box: true, year: 2024, price: 49500,
    note_fr: 'Neuve', note_en: 'New',
    img: 'IMG-8351-EPUe.jpeg'
  },
  {
    id: '1737851', brand: 'Rolex',
    name_fr: 'Rolex Turn-O-Graph 36',
    name_en: 'Rolex Turn-O-Graph 36',
    ref: '116264', papers: true, box: true, year: 2005, price: 7500,
    note_fr: 'Révision Rolex 2025', note_en: 'Rolex Service 2025',
    img: 'P1766496-zgzW.jpeg'
  },
  {
    id: '1737841', brand: 'Patek Philippe',
    name_fr: 'Patek Philippe Nautilus 5990/1R',
    name_en: 'Patek Philippe Nautilus 5990/1R',
    ref: '5990/1R', papers: true, box: true, year: 2022, price: 239000,
    note_fr: 'Neuve', note_en: 'New',
    img: 'IMG-7527-EPru.jpeg'
  },
  {
    id: '1737825', brand: 'Patek Philippe',
    name_fr: 'Patek Philippe Nautilus 5980-1A Gris',
    name_en: 'Patek Philippe Nautilus 5980-1A Grey',
    ref: '5980-1A Gris', papers: true, box: true, year: 2013, price: 85000,
    note_fr: 'Boite et Archives', note_en: 'Box and Archives',
    img: 'P1733763-v9I0.jpeg'
  }
];

/* ============================================================
   LANGUAGE ENGINE
   ============================================================ */

const NM = {
  lang: 'fr',

  init() {
    const saved = localStorage.getItem('nm_lang') || 'fr';
    this.setLang(saved, false);
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => this.setLang(btn.dataset.lang));
    });
    // Nav mobile toggle
    const burger = document.getElementById('burger');
    const navLinks = document.getElementById('navLinks');
    if (burger && navLinks) {
      burger.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('open');
        burger.classList.toggle('active');
        // Lock body scroll while menu is open
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
      // Close menu + restore scroll when any nav link is tapped
      navLinks.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', () => {
          navLinks.classList.remove('open');
          burger.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
    }
    // Dropdowns
    document.querySelectorAll('.has-drop').forEach(item => {
      item.addEventListener('click', (e) => {
        if (window.innerWidth < 960) {
          e.preventDefault();
          item.classList.toggle('open');
        }
      });
    });
    // Sticky nav
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('mainNav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
    });
  },

  setLang(lang, save = true) {
    this.lang = lang;
    if (save) localStorage.setItem('nm_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);

    // CSS handles visibility via html[data-lang] attribute selectors.
    // Clear any leftover inline display styles so CSS takes full control.
    document.querySelectorAll('.fr, .en').forEach(el => {
      el.style.removeProperty('display');
    });

    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active-lang', btn.dataset.lang === lang);
    });
  },

  imgUrl(filename) {
    return `https://www.nosmontres.com/uploads/${filename}`;
  },

  formatPrice(price) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(price);
  },

  watchCard(w, lang) {
    const name = lang === 'fr' ? w.name_fr : w.name_en;
    const note = lang === 'fr' ? w.note_fr : w.note_en;
    const papersLabel = lang === 'fr' ? "Papiers" : "Papers";
    const boxLabel = lang === 'fr' ? "Boite" : "Box";
    const yearLabel = lang === 'fr' ? "Année" : "Year";
    const discoverLabel = lang === 'fr' ? "Découvrir" : "Discover";
    return `
      <a class="watch-card" href="${NM.rootPath || ''}shop/${(w.dynamic || String(w.id).startsWith('new_')) ? 'watch.html?id=' + w.id : w.id + '.html'}">
        <div class="watch-card__img-wrap">
          <img src="${this.imgUrl(w.img)}" alt="${name}" loading="lazy">
        </div>
        <div class="watch-card__body">
          <span class="watch-card__brand">${w.brand}</span>
          <h3 class="watch-card__name">${name}</h3>
          <span class="watch-card__ref">Réf. ${w.ref}</span>
          <div class="watch-card__meta">
            <span>${papersLabel}: ${w.papers ? '✓' : '—'}</span>
            <span>${boxLabel}: ${w.box ? '✓' : '—'}</span>
            ${w.year ? `<span>${yearLabel}: ${w.year}</span>` : ''}
          </div>
          ${note ? `<p class="watch-card__note">${note}</p>` : ''}
          <div class="watch-card__footer">
            <span class="watch-card__price">${this.formatPrice(w.price)}</span>
            <span class="watch-card__cta">${discoverLabel} →</span>
          </div>
        </div>
      </a>
    `;
  },

  renderGrid(containerId, filter = null) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const watches = filter ? WATCHES.filter(w => w.brand === filter) : WATCHES;
    container.innerHTML = watches.map(w => this.watchCard(w, this.lang)).join('');
    this.initZoom();
  },

  // ── In-box magnifier (scale 2.4× at cursor position) ──────────────────────
  initZoom() {
    function attachZoom(wrap, img) {
      if (!img || wrap._zmInit) return;
      wrap._zmInit = true;
      wrap.style.cursor = 'zoom-in';
      wrap.addEventListener('mousemove', function(e) {
        var r = wrap.getBoundingClientRect();
        var px = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        var py = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        img.style.transformOrigin = px + '% ' + py + '%';
        img.style.transform = 'scale(2.4)';
        img.style.transition = 'transform 0.08s ease';
      });
      wrap.addEventListener('mouseleave', function() {
        img.style.transform = '';
        img.style.transformOrigin = '';
        img.style.transition = 'transform 0.3s ease';
      });
    }
    // Watch grid cards
    document.querySelectorAll('.watch-card__img-wrap').forEach(function(wrap) {
      attachZoom(wrap, wrap.querySelector('img'));
    });
    // Watch detail gallery (single image or first in gallery)
    document.querySelectorAll('.watch-detail__gallery').forEach(function(gallery) {
      attachZoom(gallery, gallery.querySelector('img'));
    });
  }
};

document.addEventListener('DOMContentLoaded', () => { NM.init(); NM.initZoom(); });
