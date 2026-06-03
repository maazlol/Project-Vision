// ================================================
//   FREEHUNGER — components.js
//   Navbar + Footer + Auth State
// ================================================

const FHComponents = {

  _injectStyles() {
    if (document.getElementById('fh-component-styles')) return;
    const s = document.createElement('style');
    s.id = 'fh-component-styles';
    s.textContent = `
      .fh-nav-active { color: #10b981 !important; font-weight: 700; }

      .fh-footer-reset {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 0.75rem;
        padding: 0.75rem 1rem;
        font-size: 0.88rem;
        margin-top: 0.75rem;
        color: #d1fae5;
      }

      /* ---- Nav Links ---- */
      #mainNav .nav-link {
        font-size: 0.875rem;
        font-weight: 500;
        padding: 0.4rem 0.5rem !important;
        margin: 0 0.1rem;
        border-radius: 0.5rem;
        transition: all 0.2s ease;
        color: #1f2937 !important;
        white-space: nowrap;
      }
      #mainNav .nav-link:hover {
        color: #10b981 !important;
        background: #f0fdf4;
      }
      #mainNav .navbar-brand {
        font-weight: 800;
        font-size: 1.4rem;
        color: #10b981 !important;
        letter-spacing: -0.5px;
        margin-right: 1rem;
      }

      /* ---- Settings Button ---- */
      .fh-settings-btn {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 1.5px solid #e5e7eb;
        background: white;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        flex-shrink: 0;
      }
      .fh-settings-btn:hover {
        border-color: #10b981;
        color: #10b981;
        background: #f0fdf4;
        transform: rotate(45deg);
      }

      /* ---- Nav Avatar ---- */
      .fh-nav-avatar {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 2px solid #10b981;
        object-fit: cover;
        flex-shrink: 0;
      }
      .fh-nav-avatar-initials {
        width: 34px; height: 34px;
        border-radius: 50%;
        border: 2px solid #10b981;
        background: linear-gradient(135deg, #10b981, #059669);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 0.78rem;
        flex-shrink: 0;
      }

      /* ---- Mobile Nav ---- */
      @media (max-width: 991px) {
        #mainNav .nav-link {
          padding: 0.6rem 0.75rem !important;
          margin: 0.1rem 0;
        }
        #fhNavCollapse {
          background: white;
          border-radius: 0.75rem;
          padding: 0.75rem;
          margin-top: 0.5rem;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1);
          border: 1px solid #f0f0f0;
        }
      }
    `;
    document.head.appendChild(s);
  },

  // ── NAVBAR ────────────────────────────────────
  _buildNav(activePage) {
    const isLogin = (activePage === 'login');

    const nav = document.createElement('nav');
    nav.className = 'navbar navbar-expand-lg fixed-top';
    nav.id = 'mainNav';

    nav.innerHTML = `
      <div class="container">
        <a class="navbar-brand" href="index.html">FreeHunger</a>

        <button class="navbar-toggler border-0" type="button"
                data-bs-toggle="collapse" data-bs-target="#fhNavCollapse"
                style="box-shadow:none;">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="fhNavCollapse">
          <ul class="navbar-nav ms-auto align-items-lg-center">

            <li class="nav-item">
              <a class="nav-link ${activePage === 'home' ? 'fh-nav-active' : ''}"
                 href="index.html">Home</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'impactfeed' ? 'fh-nav-active' : ''}"
                 href="impactfeed.html">Feed</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'dashboard' ? 'fh-nav-active' : ''}"
                 href="dashboard.html">ViewToHelp</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'news' ? 'fh-nav-active' : ''}"
                 href="news.html">News</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'blog' ? 'fh-nav-active' : ''}"
                 href="blog.html">Blog</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'sponsor' ? 'fh-nav-active' : ''}"
                 href="sponsor.html">Sponsor</a>
            </li>

            <li class="nav-item">
              <a class="nav-link ${activePage === 'about' ? 'fh-nav-active' : ''}"
                 href="about.html">About</a>
            </li>

            ${isLogin ? '' : `
            <li class="nav-item ms-lg-2 mt-3 mt-lg-0" id="navAuthBtn">
              <a class="btn btn-primary px-4" href="login.html"
                 style="font-size:0.875rem;padding:0.45rem 1.1rem;">Login</a>
            </li>`}

          </ul>
        </div>
      </div>
    `;

    return nav;
  },

  // ── FOOTER ────────────────────────────────────
  _buildFooter() {
    const footer = document.createElement('footer');
    footer.innerHTML = `
      <div class="container">
        <div class="row g-4">

          <div class="col-lg-4">
            <div style="font-size:1.4rem;font-weight:800;color:white;margin-bottom:0.75rem;">
              FreeHunger
            </div>
            <p style="color:#9ca3af;font-size:0.92rem;line-height:1.7;">
              A platform dedicated to ending hunger through community,
              technology and small acts of kindness.
            </p>
            <div class="social-links mt-4">
              <a href="#"><i class="bi bi-facebook"></i></a>
              <a href="#"><i class="bi bi-twitter-x"></i></a>
              <a href="#"><i class="bi bi-instagram"></i></a>
              <a href="#"><i class="bi bi-linkedin"></i></a>
            </div>
          </div>

          <div class="col-lg-2 ms-lg-auto">
            <h5>Quick Links</h5>
            <ul class="footer-links">
              <li><a href="index.html">Home</a></li>
              <li><a href="impactfeed.html">Feed</a></li>
              <li><a href="dashboard.html">ViewToHelp</a></li>
              <li><a href="news.html">News</a></li>
              <li><a href="blog.html">Blog</a></li>
              <li><a href="sponsor.html">Sponsor</a></li>
              <li><a href="about.html">About</a></li>
            </ul>
          </div>

          <div class="col-lg-2">
            <h5>Support</h5>
            <ul class="footer-links">
              <li><a href="index.html#how-it-works">How It Works</a></li>
              <li><a href="sponsor.html#contact-form">Contact</a></li>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Use</a></li>
            </ul>
          </div>

          <div class="col-lg-3">
            <h5>Monthly Reset</h5>
            <p style="color:#9ca3af;font-size:0.88rem;">
              NGO rankings reset every month to ensure fair distribution of donations.
            </p>
            <div class="fh-footer-reset">
              <i class="bi bi-arrow-clockwise me-2"></i>
              Next reset in <strong>14 days</strong>
            </div>
          </div>

        </div>

        <hr class="my-5" style="border-color:#1f2937;">

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <p class="small mb-0" style="color:#6b7280;">
            &copy; 2026 FreeHunger. All rights reserved. Credits in PKR.
          </p>
          <p class="small mb-0" style="color:#6b7280;">
            Made with care for Pakistan
          </p>
        </div>
      </div>
    `;
    return footer;
  },

  // ── STICKY SCROLL ─────────────────────────────
  _initSticky() {
    window.addEventListener('scroll', () => {
      const nav = document.getElementById('mainNav');
      if (!nav) return;
      if (window.scrollY > 50) {
        nav.classList.add('shadow-sm');
        nav.style.padding = '0.4rem 0';
      } else {
        nav.classList.remove('shadow-sm');
        nav.style.padding = '0.85rem 0';
      }
    });
  },

  // ── FIREBASE AUTH NAV BUTTON ──────────────────
  _initFirebaseAuth() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) {
      setTimeout(() => this._initFirebaseAuth(), 500);
      return;
    }
    try {
      const db = firebase.firestore();
      firebase.auth().onAuthStateChanged(user => {
        const btn = document.getElementById('navAuthBtn');
        if (!btn) return;

        if (user) {
          db.collection('users').doc(user.uid).onSnapshot(doc => {
            const data     = doc.exists ? doc.data() : {};
            const name     = data.name || user.displayName || user.email || 'User';
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            const credits  = data.credits || 0;

            let avatarHtml = '';
            if (data.avatarType === 'emoji') {
              avatarHtml = `<span class="fh-nav-avatar-initials" style="background:${data.avatarBg || '#10b981'};font-size:1rem;">${data.avatarValue || '😊'}</span>`;
            } else if (data.avatarType === 'image' && data.avatarValue) {
              avatarHtml = `<img src="${data.avatarValue}" class="fh-nav-avatar" alt="avatar">`;
            } else {
              avatarHtml = `<span class="fh-nav-avatar-initials">${initials}</span>`;
            }

            btn.innerHTML = `
              <div class="d-flex align-items-center gap-2 mt-3 mt-lg-0">
                <div class="d-none d-xl-flex flex-column align-items-end me-1">
                  <span style="font-weight:700;font-size:0.8rem;color:#1f2937;line-height:1.2;">${name.split(' ')[0]}</span>
                  <span style="font-size:0.7rem;color:#10b981;font-weight:600;">Rs. ${credits.toLocaleString()}</span>
                </div>
                ${avatarHtml}
                <a href="settings.html" class="fh-settings-btn" title="Settings">
                  <i class="bi bi-gear-fill"></i>
                </a>
                <button class="btn btn-outline-danger px-2 py-1" title="Logout"
                  style="font-size:0.8rem;"
                  onclick="firebase.auth().signOut().then(()=>window.location.href='index.html')">
                  <i class="bi bi-box-arrow-right"></i>
                </button>
              </div>`;

          }, () => {
            const name     = user.displayName || user.email || 'User';
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
            btn.innerHTML = `
              <div class="d-flex align-items-center gap-2 mt-3 mt-lg-0">
                <span class="fh-nav-avatar-initials">${initials}</span>
                <a href="settings.html" class="fh-settings-btn">
                  <i class="bi bi-gear-fill"></i>
                </a>
                <button class="btn btn-outline-danger px-2 py-1" style="font-size:0.8rem;"
                  onclick="firebase.auth().signOut().then(()=>window.location.href='index.html')">
                  <i class="bi bi-box-arrow-right"></i>
                </button>
              </div>`;
          });

        } else {
          btn.innerHTML = `
            <a class="btn btn-primary px-4" href="login.html"
               style="font-size:0.875rem;padding:0.45rem 1.1rem;">Login</a>`;
        }
      });
    } catch (e) { /* Firebase not ready */ }
  },

  // ── MAIN INIT ─────────────────────────────────
  init(activePage) {
    activePage = activePage || 'home';
    this._injectStyles();

    const navHolder = document.getElementById('nav-placeholder');
    if (navHolder) navHolder.replaceWith(this._buildNav(activePage));

    const footHolder = document.getElementById('footer-placeholder');
    if (footHolder) footHolder.replaceWith(this._buildFooter());

    this._initSticky();
    if (activePage !== 'login') this._initFirebaseAuth();
  }

};
