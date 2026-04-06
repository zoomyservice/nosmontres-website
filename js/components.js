/* ============================================================
   NOS MONTRES — Shared HTML Components (nav + footer)
   Injected by: NM.renderNav() and NM.renderFooter()
   ============================================================ */

NM.renderNav = function(activePage = '') {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const root = NM.rootPath || '';
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="nav-logo" href="${root}index.html">
        <img src="https://www.nosmontres.com/uploads/NOSMONTRESLOGO-q9Ti.png" alt="Nos Montres">
      </a>
      <ul id="navLinks">
        <li><a class="nav-link${activePage==='home'?' active':''}" href="${root}index.html">
          <span class="fr">Accueil</span><span class="en">Home</span>
        </a></li>
        <li><a class="nav-link${activePage==='about'?' active':''}" href="${root}a-propos.html">
          <span class="fr">À Propos</span><span class="en">About</span>
        </a></li>
        <li class="has-drop">
          <span class="nav-link">
            <span class="fr">Collections</span><span class="en">Collections</span> ▾
          </span>
          <div class="drop-menu">
            <a href="${root}rolex.html">Rolex</a>
            <a href="${root}audemars-piguet.html">Audemars Piguet</a>
            <a href="${root}patek-philippe.html">Patek Philippe</a>
            <a href="${root}richard-mille.html">Richard Mille</a>
            <a href="${root}index.html#boutique">
              <span class="fr">Toutes les montres</span><span class="en">All watches</span>
            </a>
          </div>
        </li>
        <li class="has-drop">
          <span class="nav-link">
            <span class="fr">Nos Montres</span><span class="en">Our Watches</span> ▾
          </span>
          <div class="drop-menu">
            <a href="${root}montre-rolex-submariner.html">Rolex Submariner</a>
            <a href="${root}montre-rolex-occasion.html">
              <span class="fr">Rolex Occasion</span><span class="en">Pre-Owned Rolex</span>
            </a>
            <a href="${root}montre-rolex-daytona.html">Rolex Daytona</a>
            <a href="${root}montre-audemars-piguet-royal-oak.html">AP Royal Oak</a>
          </div>
        </li>
        <li class="has-drop">
          <span class="nav-link">
            <span class="fr">Services</span><span class="en">Services</span> ▾
          </span>
          <div class="drop-menu">
            <a href="${root}revision-Rolex-Paris.html">
              <span class="fr">Révision Rolex Paris</span><span class="en">Rolex Revision Paris</span>
            </a>
            <a href="${root}revision-Audemars-Piguet-Paris.html">
              <span class="fr">Révision AP Paris</span><span class="en">AP Revision Paris</span>
            </a>
            <a href="${root}reparation-Rolex-Paris.html">
              <span class="fr">Réparation Rolex Paris</span><span class="en">Rolex Repair Paris</span>
            </a>
            <a href="${root}entretien-montre-Rolex.html">
              <span class="fr">Entretien Rolex</span><span class="en">Rolex Maintenance</span>
            </a>
            <a href="${root}changement-de-pile-de-montre.html">
              <span class="fr">Changement de Pile</span><span class="en">Battery Replacement</span>
            </a>
          </div>
        </li>
        <li><a class="nav-link${activePage==='rdv'?' active':''}" href="${root}prendre-rendez-vous.html">
          <span class="fr">Rendez-vous</span><span class="en">Appointment</span>
        </a></li>
      </ul>
      <div class="nav-right">
        <div class="lang-toggle">
          <button data-lang="fr">FR</button>
          <span class="sep">|</span>
          <button data-lang="en">EN</button>
        </div>
        <a class="nav-cta" href="${root}prendre-rendez-vous.html">
          <span class="fr">Prendre RDV</span><span class="en">Book Now</span>
        </a>
        <button class="burger" id="burger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  `;
};

NM.renderFooter = function() {
  const footer = document.getElementById('siteFooter');
  if (!footer) return;
  const root = NM.rootPath || '';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <img class="footer-brand__logo" src="https://www.nosmontres.com/uploads/NOSMONTRESLOGO-q9Ti.png" alt="Nos Montres">
          <p class="footer-brand__desc fr">Boutique de montres de luxe à Paris. Expert en Rolex, Audemars Piguet, Patek Philippe et Richard Mille.</p>
          <p class="footer-brand__desc en">Luxury watch boutique in Paris. Expert in Rolex, Audemars Piguet, Patek Philippe and Richard Mille.</p>
          <div class="footer-brand__social">
            <a href="https://www.instagram.com/nosmontres/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.chrono24.com" target="_blank" rel="noopener">Chrono24</a>
          </div>
        </div>
        <div class="footer-col">
          <span class="footer-col__title fr">Collections</span>
          <span class="footer-col__title en">Collections</span>
          <ul>
            <li><a href="${root}rolex.html">Rolex</a></li>
            <li><a href="${root}audemars-piguet.html">Audemars Piguet</a></li>
            <li><a href="${root}patek-philippe.html">Patek Philippe</a></li>
            <li><a href="${root}richard-mille.html">Richard Mille</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <span class="footer-col__title fr">Services</span>
          <span class="footer-col__title en">Services</span>
          <ul>
            <li><a href="${root}revision-Rolex-Paris.html"><span class="fr">Révision Rolex</span><span class="en">Rolex Revision</span></a></li>
            <li><a href="${root}revision-Audemars-Piguet-Paris.html"><span class="fr">Révision AP</span><span class="en">AP Revision</span></a></li>
            <li><a href="${root}reparation-Rolex-Paris.html"><span class="fr">Réparation Rolex</span><span class="en">Rolex Repair</span></a></li>
            <li><a href="${root}entretien-montre-Rolex.html"><span class="fr">Entretien Rolex</span><span class="en">Rolex Maintenance</span></a></li>
            <li><a href="${root}changement-de-pile-de-montre.html"><span class="fr">Changement de Pile</span><span class="en">Battery Change</span></a></li>
          </ul>
        </div>
        <div class="footer-col">
          <span class="footer-col__title fr">Contact</span>
          <span class="footer-col__title en">Contact</span>
          <ul>
            <li><a href="tel:0181800847">01 81 80 08 47</a></li>
            <li><a href="tel:0622807014">06 22 80 70 14</a></li>
            <li><a href="mailto:contact.nosmontres@gmail.com">contact.nosmontres@gmail.com</a></li>
            <li><span style="font-size:0.82rem;color:rgba(255,255,255,0.5)">46 rue de Miromesnil<br>75008 Paris</span></li>
          </ul>
          <div style="margin-top:24px">
            <span class="footer-col__title fr">Newsletter</span>
            <span class="footer-col__title en">Newsletter</span>
            <form class="footer-newsletter" onsubmit="return false">
              <input type="email" placeholder="Email">
              <button type="submit"><span class="fr">OK</span><span class="en">OK</span></button>
            </form>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span class="footer-copyright">© 2025 Nos Montres — <a href="${root}mentions-legales.html" style="color:inherit">
          <span class="fr">Mentions légales</span><span class="en">Legal notice</span>
        </a></span>
        <span class="footer-copyright">
          <span class="fr">Boutique de montres de luxe Paris</span>
          <span class="en">Luxury watch boutique Paris</span>
        </span>
      </div>
    </div>
  `;
};
