(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  // ─── Language ─────────────────────────────────────────────────────────────────
  function lang() {
    if (window.NM && window.NM.lang) return window.NM.lang;
    return localStorage.getItem('nm_lang') || 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  // ─── Business facts ───────────────────────────────────────────────────────────
  const BIZ = {
    addr:   '46 rue de Miromesnil, 75008 Paris',
    phone1: '01 81 80 08 47',
    phone2: '06 22 80 70 14',
    email:  'contact.nosmontres@gmail.com',
  };

  // ─── Current stock ─────────────────────────────────────────────────────────────
  const STOCK = [
    { brand:'Rolex', model:'Submariner Date Hulk',       ref:'126610LV',         price:13900  },
    { brand:'Rolex', model:'Submariner acier/or',        ref:'116613LB',         price:11500  },
    { brand:'Rolex', model:'Submariner vintage',         ref:'16800',            price:9500   },
    { brand:'Rolex', model:'Daytona Or Rose 2024',       ref:'126505',           price:49500  },
    { brand:'Rolex', model:'Daytona Panda Acier',        ref:'126500LN',         price:27500  },
    { brand:'Rolex', model:'GMT-Master II Black',        ref:'116710LN',         price:11900  },
    { brand:'Rolex', model:'GMT-Master II Sprite',       ref:'126710GRNR',       price:18500  },
    { brand:'Rolex', model:'GMT-Master II vintage',      ref:'16710',            price:9500   },
    { brand:'Rolex', model:'Datejust 41',                ref:'126334',           price:11500  },
    { brand:'Rolex', model:'Datejust 41',                ref:'126334',           price:12900  },
    { brand:'Rolex', model:'Datejust 36 Mint',           ref:'126300',           price:11000  },
    { brand:'Rolex', model:'Datejust 36 Wimbledon',      ref:'126300 Wimbledon', price:10500  },
    { brand:'Rolex', model:'Datejust 36 Wimbledon',      ref:'126300 Wimbledon', price:9500   },
    { brand:'Rolex', model:'Datejust 36 vintage',        ref:'16234',            price:6500   },
    { brand:'Rolex', model:'Lady Datejust',              ref:'177234',           price:6500   },
    { brand:'Rolex', model:'Lady Datejust',              ref:'6917',             price:8500   },
    { brand:'Rolex', model:'Lady Datejust',              ref:'69178',            price:6000   },
    { brand:'Rolex', model:'Lady Datejust MOP Diamants', ref:'179161',           price:6500   },
    { brand:'Rolex', model:'Turn-O-Graph 36',            ref:'116264',           price:7500   },
    { brand:'Rolex', model:'Explorer II',                ref:'226570',           price:9500   },
    { brand:'Rolex', model:'Yacht-Master',               ref:'326935',           price:35000  },
    { brand:'Rolex', model:'Oyster Perpetual 41 Red',    ref:'124300',           price:14500  },
    { brand:'Audemars Piguet', model:'Royal Oak Chronographe 41 Blue', ref:'26240ST',    price:58500  },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore',             ref:'26325TS',    price:34000  },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore',             ref:'25940SK',    price:17500  },
    { brand:'Audemars Piguet', model:'Royal Oak Offshore Lady Diamants',ref:'26048SK',   price:22500  },
    { brand:'Patek Philippe',  model:'Nautilus Chronographe',          ref:'5980-1A',    price:85000  },
    { brand:'Patek Philippe',  model:'Nautilus Travel Time',           ref:'5990/1R',    price:239000 },
    { brand:'Patek Philippe',  model:'Annual Calendar',                ref:'5726-001',   price:110000 },
    { brand:'Patek Philippe',  model:'Complications',                  ref:'7010R/011',  price:53000  },
    { brand:'Richard Mille',   model:'RM 65-01',                       ref:'RM65-01',    price:235000 },
    { brand:'Cartier',         model:'Juste un Clou',                  ref:'WJBA0042',   price:24000  },
  ];

  // ─── Conversation memory (last 20 turns) ──────────────────────────────────────
  const memory = {
    history: [],
    push(role, text) {
      this.history.push({ role, text: text.slice(0, 500) });
      if (this.history.length > 20) this.history.shift();
    },
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function fmt(n) { return n.toLocaleString('fr-FR') + ' \u20ac'; }
  function stockMatch(text) {
    const q = text.toLowerCase().replace(/[\s\-\.]/g, '');
    return STOCK.filter(w =>
      q.includes(w.ref.toLowerCase().replace(/[\s\-\.]/g, '')) ||
      q.includes(w.model.toLowerCase().replace(/[\s\-\.]/g, ''))
    );
  }

  const SELL_INTENT = /\b(vendre|vente|je veux vendre|sell|selling|estimation|estimer|rachat|buyback|how much for|combien pour|valeur de ma)\b/i;

  // ─── Gemini via Worker ────────────────────────────────────────────────────────
  async function callGemini(messages) {
    try {
      const res = await fetch(WORKER_URL + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.reply || null;
    } catch { return null; }
  }

  // ─── Lead save to KV ──────────────────────────────────────────────────────────
  async function saveLead(name, email, message) {
    try {
      await fetch(WORKER_URL + '/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, lang: lang() }),
      });
    } catch {}
  }

  let leadCaptured = false;

  // ─── Main response handler — pure Gemini, no KB ───────────────────────────────
  async function getResponse(userText) {
    const raw = userText.trim();
    if (!raw) return '';
    memory.push('user', raw);

    // Sell intent triggers lead capture form
    if (SELL_INTENT.test(raw) && !leadCaptured) setTimeout(() => showLeadForm('sell'), 1200);

    // Inject live stock context when user mentions a watch we carry
    const matches = stockMatch(raw);
    let enrichedMsg = raw;
    if (matches.length) {
      const ctx = matches.map(w => w.brand + ' ' + w.model + ' ref.' + w.ref + ': ' + fmt(w.price)).join('; ');
      enrichedMsg = '[STOCK ACTUEL DISPONIBLE: ' + ctx + ']\n\n' + raw;
    }

    // Prepend language directive so Gemini always replies in the correct language
    if (lang() === 'en') enrichedMsg = '[IMPORTANT: Respond in English only.]\n\n' + enrichedMsg;

    // Build conversation history for Gemini (exclude current turn, add enriched version)
    const msgs = memory.history.slice(0, -1).slice(-14)
      .map(h => ({ role: h.role === 'bot' ? 'assistant' : 'user', content: h.text }));
    msgs.push({ role: 'user', content: enrichedMsg });

    const reply = await callGemini(msgs);
    const fallback = t(
      'Service temporairement indisponible. Contactez-nous : **' + BIZ.phone1 + '**',
      'Service temporarily unavailable. Contact us: **' + BIZ.phone1 + '**'
    );
    const finalReply = reply || fallback;
    memory.push('bot', finalReply);
    return finalReply;
  }

  // ─── Greeting (instant — no API call on open) ─────────────────────────────────
  function getGreeting() {
    const grFr = [
      "Bonjour\u00a0! Je suis l'assistant horloger de **Nos Montres**, votre boutique parisienne sp\u00e9cialis\u00e9e en montres de luxe de seconde main. Posez-moi n'importe quelle question.",
      "Bonjour\u00a0! Comment puis-je vous aider \u2014 achat, vente, r\u00e9vision, ou conseil horloger\u00a0?",
    ];
    const grEn = [
      "Hello! I'm the **Nos Montres** watch assistant \u2014 Parisian pre-owned luxury watch specialist. Ask me anything.",
      "Hello! How can I help \u2014 buying, selling, servicing, or watch advice?",
    ];
    const pool = lang() === 'en' ? grEn : grFr;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ─── Quick buttons ─────────────────────────────────────────────────────────────
  const QUICK_BTNS = [
    { label: () => t('\ud83d\udc8e Collection', '\ud83d\udc8e Collection'), msg: () => t('Voir la collection en stock', 'Show collection in stock') },
    { label: () => t('\ud83d\udcb0 Prix', '\ud83d\udcb0 Prices'),           msg: () => t('Quels sont vos prix\u00a0?', 'What are your prices?') },
    { label: () => t('\ud83d\udce4 Vendre', '\ud83d\udce4 Sell'),           msg: () => t('Je veux vendre ma montre', 'I want to sell my watch') },
    { label: () => t('\ud83d\udd50 Horaires', '\ud83d\udd50 Hours'),        msg: () => t('Quels sont vos horaires\u00a0?', 'What are your opening hours?') },
    { label: () => t('\ud83d\udccd Adresse', '\ud83d\udccd Address'),       msg: () => t('O\u00f9 \u00eates-vous situ\u00e9s\u00a0?', 'Where are you located?') },
    { label: () => t('\ud83d\udd27 R\u00e9vision', '\ud83d\udd27 Service'), msg: () => t('Je cherche une r\u00e9vision', 'I need a service') },
  ];

  let open = false, scrollLocked = false, bubbleTimer = null;

  function lockBodyScroll() {
    if (window.innerWidth < 768 && !scrollLocked) { document.body.style.overflow = 'hidden'; scrollLocked = true; }
  }
  function unlockBodyScroll() { document.body.style.overflow = ''; scrollLocked = false; }

  // ─── Markdown renderer ────────────────────────────────────────────────────────
  function mdRender(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/^[\u2022\-] (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  function addMsg(text, sender) {
    const wrap = document.getElementById('nm-msgs');
    if (!wrap) return;
    const div = document.createElement('div');
    div.className = 'nm-msg nm-' + sender;
    div.innerHTML = mdRender(text);
    wrap.appendChild(div);
    wrap.scrollTop = wrap.scrollHeight;
  }

  function showTyping() {
    const wrap = document.getElementById('nm-msgs');
    if (!wrap || document.getElementById('nm-typing')) return;
    const div = document.createElement('div');
    div.id = 'nm-typing'; div.className = 'nm-msg nm-bot nm-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    wrap.appendChild(div); wrap.scrollTop = wrap.scrollHeight;
  }
  function hideTyping() { const el = document.getElementById('nm-typing'); if (el) el.remove(); }

  function renderQuickBtns() {
    const c = document.getElementById('nm-quick');
    if (!c) return; c.innerHTML = '';
    QUICK_BTNS.forEach(btn => {
      const b = document.createElement('button');
      b.className = 'nm-qbtn'; b.textContent = btn.label();
      b.addEventListener('click', () => handleSend(btn.msg()));
      c.appendChild(b);
    });
  }

  let sending = false;

  async function handleSend(text) {
    if (sending) return;
    const input = document.getElementById('nm-input');
    const msg = (text || (input && input.value) || '').trim();
    if (!msg) return;
    sending = true;
    if (input) { input.value = ''; input.disabled = true; }
    const sendBtn = document.getElementById('nm-send');
    if (sendBtn) sendBtn.disabled = true;
    const qc = document.getElementById('nm-quick'); if (qc) qc.style.display = 'none';
    addMsg(msg, 'user');
    showTyping();
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    const reply = await getResponse(msg);
    hideTyping();
    addMsg(reply, 'bot');
    // Re-enable after response + small cooldown (invisible to real users reading the reply)
    setTimeout(() => {
      sending = false;
      if (input) { input.disabled = false; input.focus(); }
      if (sendBtn) sendBtn.disabled = false;
    }, 1500);
  }

  // ─── Lead capture form ────────────────────────────────────────────────────────
  function showLeadForm(intent) {
    if (leadCaptured) return;
    const wrap = document.getElementById('nm-msgs');
    if (!wrap || document.getElementById('nm-lead-form')) return;
    const isSell = intent === 'sell';
    const card = document.createElement('div');
    card.className = 'nm-msg nm-bot nm-lead-card'; card.id = 'nm-lead-form';
    card.innerHTML =
      '<div class="nm-lead-title">' + t(isSell ? '\ud83d\udce4 Estimation rapide' : '\ud83d\udd0d On vous trouve \u00e7a', isSell ? '\ud83d\udce4 Quick estimate' : '\ud83d\udd0d We\'ll find it for you') + '</div>' +
      '<input class="nm-lead-inp" id="nm-lead-name" type="text" placeholder="' + t('Votre pr\u00e9nom', 'Your first name') + '" autocomplete="given-name"/>' +
      '<input class="nm-lead-inp" id="nm-lead-email" type="email" placeholder="' + t('Votre email', 'Your email') + '" autocomplete="email"/>' +
      '<textarea class="nm-lead-inp nm-lead-ta" id="nm-lead-msg" placeholder="' + t(isSell ? 'Mod\u00e8le, r\u00e9f., \u00e9tat\u2026' : 'Mod\u00e8le recherch\u00e9, budget\u2026', isSell ? 'Model, ref., condition\u2026' : 'Model sought, budget\u2026') + '"></textarea>' +
      '<div class="nm-lead-btns"><button class="nm-lead-submit" id="nm-lead-send">' + t('Envoyer', 'Send') + '</button><button class="nm-lead-cancel" id="nm-lead-skip">' + t('Plus tard', 'Later') + '</button></div>';
    wrap.appendChild(card); wrap.scrollTop = wrap.scrollHeight;
    document.getElementById('nm-lead-send').addEventListener('click', async () => {
      const name  = (document.getElementById('nm-lead-name')  || {}).value || '';
      const email = (document.getElementById('nm-lead-email') || {}).value || '';
      const msg   = (document.getElementById('nm-lead-msg')   || {}).value || '';
      if (!name || !email) { addMsg(t("Merci d'indiquer au moins votre pr\u00e9nom et email.", 'Please provide at least your name and email.'), 'bot'); return; }
      card.remove(); leadCaptured = true;
      await saveLead(name, email, '[' + intent.toUpperCase() + '] ' + msg);
      addMsg(t('Merci ' + name + '\u00a0! Nous vous recontactons sous 24h.', 'Thanks ' + name + '! We\'ll get back to you within 24h.'), 'bot');
    });
    document.getElementById('nm-lead-skip').addEventListener('click', () => {
      card.remove();
      addMsg(t('Pas de probl\u00e8me. Appelez-nous au ' + BIZ.phone1 + ' quand vous voulez.', 'No problem. Call us on ' + BIZ.phone1 + ' whenever you\'re ready.'), 'bot');
    });
  }

  // ─── CSS ──────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('nm-chat-css')) return;
    const s = document.createElement('style'); s.id = 'nm-chat-css';
    s.textContent = '#nm-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;cursor:pointer;display:flex;flex-direction:column;align-items:flex-end;gap:10px}' +
      '#nm-toggle{width:58px;height:58px;border-radius:50%;background:#1a1a1a;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.45);transition:transform .2s}' +
      '#nm-toggle:hover{transform:scale(1.08)}#nm-toggle svg{width:28px;height:28px;fill:#c8a96e}' +
      '#nm-attention{background:#1a1a1a;color:#c8a96e;padding:10px 16px;border-radius:12px 12px 0 12px;font-size:13px;font-family:inherit;max-width:220px;text-align:right;box-shadow:0 4px 16px rgba(0,0,0,.3);animation:nm-pop .3s ease;line-height:1.4}' +
      '@keyframes nm-pop{from{opacity:0;transform:scale(.8) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}' +
      '#nm-window{position:fixed;bottom:100px;right:24px;width:360px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 120px);background:#111;border:1px solid #2a2a2a;border-radius:18px;display:flex;flex-direction:column;z-index:9998;box-shadow:0 12px 48px rgba(0,0,0,.6);font-family:"Helvetica Neue",Arial,sans-serif;overflow:hidden;transition:opacity .25s,transform .25s;transform-origin:bottom right}' +
      '#nm-window.nm-hidden{opacity:0;transform:scale(.92);pointer-events:none}' +
      '#nm-header{background:#1a1a1a;padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid #2a2a2a;flex-shrink:0}' +
      '.nm-hlogo{width:36px;height:36px;border-radius:50%;background:#c8a96e;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#111;flex-shrink:0}' +
      '.nm-htitle{flex:1}.nm-htitle strong{display:block;color:#e8d5b0;font-size:14px;letter-spacing:.5px}.nm-htitle span{color:#999;font-size:11px}' +
      '#nm-close{background:none;border:none;cursor:pointer;color:#555;font-size:20px;line-height:1;padding:4px;transition:color .2s}#nm-close:hover{color:#c8a96e}' +
      '#nm-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:#2a2a2a transparent}' +
      '#nm-msgs::-webkit-scrollbar{width:4px}#nm-msgs::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}' +
      '.nm-msg{max-width:84%;padding:10px 14px;border-radius:14px;font-size:13.5px;line-height:1.55;word-break:break-word;color:#fff}' +
      '.nm-msg ul{margin:6px 0 0;padding-left:14px}.nm-msg li{margin:3px 0}.nm-msg a{color:#c8a96e;text-decoration:none}.nm-msg a:hover{text-decoration:underline}' +
      '.nm-bot{background:#1e1e1e;border-bottom-left-radius:4px;align-self:flex-start;border:1px solid #2a2a2a}' +
      '.nm-user{background:#c8a96e;color:#111;border-bottom-right-radius:4px;align-self:flex-end;font-weight:500}' +
      '.nm-typing{display:flex;gap:5px;align-items:center;padding:12px 16px}' +
      '.nm-typing span{width:7px;height:7px;background:#555;border-radius:50%;animation:nm-dot 1.3s infinite}' +
      '.nm-typing span:nth-child(2){animation-delay:.2s}.nm-typing span:nth-child(3){animation-delay:.4s}' +
      '@keyframes nm-dot{0%,80%,100%{transform:scale(.7);opacity:.4}40%{transform:scale(1);opacity:1}}' +
      '#nm-quick{padding:8px 14px 0;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0}' +
      '.nm-qbtn{background:#1e1e1e;border:1px solid #333;color:#bbb;padding:6px 11px;border-radius:20px;font-size:12px;cursor:pointer;transition:all .2s;white-space:nowrap}' +
      '.nm-qbtn:hover{background:#c8a96e;color:#111;border-color:#c8a96e}' +
      '#nm-form{padding:12px 14px 14px;border-top:1px solid #1e1e1e;display:flex;gap:8px;flex-shrink:0}' +
      '#nm-input{flex:1;background:#1a1a1a;border:1px solid #2a2a2a;border-radius:24px;padding:9px 16px;color:#e0e0e0;font-size:16px;outline:none;transition:border-color .2s;font-family:inherit}' +
      '#nm-input::placeholder{color:#444}#nm-input:focus{border-color:#c8a96e}' +
      '#nm-send{width:38px;height:38px;border-radius:50%;background:#c8a96e;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .2s;align-self:flex-end}' +
      '#nm-send:hover{background:#d4b87a}#nm-send svg{width:16px;height:16px;fill:#111}' +
      '#nm-powered{text-align:center;padding:4px 0 8px;color:#666;font-size:10px;flex-shrink:0}' +
      '.nm-lead-card{width:100%!important;max-width:100%!important;display:flex;flex-direction:column;gap:8px;background:#1a1a1a!important;border:1px solid rgba(200,169,110,.27)!important}' +
      '.nm-lead-title{font-size:13px;font-weight:600;color:#c8a96e;margin-bottom:2px}' +
      '.nm-lead-inp{background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:8px 12px;color:#ddd;font-size:12.5px;outline:none;font-family:inherit;transition:border-color .2s;width:100%;box-sizing:border-box}' +
      '.nm-lead-inp:focus{border-color:#c8a96e}.nm-lead-ta{resize:none;height:60px}' +
      '.nm-lead-btns{display:flex;gap:8px;margin-top:2px}' +
      '.nm-lead-submit{flex:1;background:#c8a96e;color:#111;border:none;border-radius:8px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s;font-family:inherit}' +
      '.nm-lead-submit:hover{background:#d4b87a}' +
      '.nm-lead-cancel{background:none;border:1px solid #333;color:#666;border-radius:8px;padding:8px 12px;font-size:12px;cursor:pointer;font-family:inherit}' +
      '.nm-lead-cancel:hover{color:#aaa;border-color:#555}' +
      '@media(max-width:480px){#nm-window{bottom:0;right:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}#nm-bubble{bottom:16px;right:16px}}';
    document.head.appendChild(s);
  }

  // ─── Build DOM ────────────────────────────────────────────────────────────────
  function buildDOM() {
    const bubble = document.createElement('div'); bubble.id = 'nm-bubble';
    if (!localStorage.getItem('nm_popup_seen')) {
      localStorage.setItem('nm_popup_seen', '1');
      const attn = document.createElement('div'); attn.id = 'nm-attention';
      attn.textContent = t("Besoin d'aide pour choisir ou vendre une montre\u00a0?", 'Need help choosing or selling a watch?');
      bubble.appendChild(attn);
    }
    const toggle = document.createElement('button'); toggle.id = 'nm-toggle'; toggle.setAttribute('aria-label', 'Chat');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg>';
    bubble.appendChild(toggle);
    document.body.appendChild(bubble);

    const win = document.createElement('div'); win.id = 'nm-window'; win.classList.add('nm-hidden');
    win.innerHTML =
      '<div id="nm-header">' +
        '<div class="nm-hlogo">NM</div>' +
        '<div class="nm-htitle"><strong>Nos Montres</strong><span>' + t('Assistant horloger', 'Watch assistant') + '</span></div>' +
        '<button id="nm-close" aria-label="Fermer">&#x2715;</button>' +
      '</div>' +
      '<div id="nm-msgs"></div>' +
      '<div id="nm-quick"></div>' +
      '<div id="nm-form">' +
        '<input id="nm-input" type="text" placeholder="' + t('Posez votre question\u2026', 'Ask your question\u2026') + '" autocomplete="off"/>' +
        '<button id="nm-send" aria-label="Envoyer"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
      '</div>' +
      '<div id="nm-powered">Powered by Nos Montres</div>';
    document.body.appendChild(win);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() {
    injectCSS(); buildDOM(); renderQuickBtns();
    const win     = document.getElementById('nm-window');
    const toggle  = document.getElementById('nm-toggle');
    const closeBtn= document.getElementById('nm-close');
    const input   = document.getElementById('nm-input');
    const sendBtn = document.getElementById('nm-send');

    function openChat() {
      open = true; win.classList.remove('nm-hidden'); lockBodyScroll();
      const attn = document.getElementById('nm-attention'); if (attn) attn.style.display = 'none';
      clearTimeout(bubbleTimer);
      const msgs = document.getElementById('nm-msgs');
      if (msgs && msgs.children.length === 0) setTimeout(() => addMsg(getGreeting(), 'bot'), 300);
      setTimeout(() => { if (input) input.focus(); }, 350);
    }
    function closeChat() { open = false; win.classList.add('nm-hidden'); unlockBodyScroll(); }

    toggle.addEventListener('click', () => open ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);
    sendBtn.addEventListener('click', () => handleSend());
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } });

    bubbleTimer = setTimeout(() => {
      const attn = document.getElementById('nm-attention');
      if (attn && !open) { attn.style.transition = 'opacity .4s'; attn.style.opacity = '0'; setTimeout(() => attn.remove(), 400); }
    }, 9000);
    document.addEventListener('click', e => { if (open && !win.contains(e.target) && !toggle.contains(e.target)) closeChat(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) closeChat(); });
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
