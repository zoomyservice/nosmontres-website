(function () {
  'use strict';

  const WORKER_URL = 'https://nosmontres-prices.zoozoomfast.workers.dev';

  // ─── Language helper ──────────────────────────────────────────────────────────
  function lang() {
    if (window.NM && window.NM.lang) return window.NM.lang;
    return localStorage.getItem('nm_lang') || 'fr';
  }
  function t(fr, en) { return lang() === 'en' ? en : fr; }

  // ─── Business facts ───────────────────────────────────────────────────────────
  const BIZ = {
    addr:    '46 rue de Miromesnil, 75008 Paris',
    phone1:  '01 81 80 08 47',
    phone2:  '06 22 80 70 14',
    email:   'contact.nosmontres@gmail.com',
    hours:   '7j/7 sur rendez-vous',
    hoursEn: '7 days / week, by appointment',
  };

  // ─── Conversation history (multi-turn context for Gemini) ────────────────────
  // Each entry: { role: 'user' | 'assistant', content: string }
  const history = [];

  // ─── Call the AI worker ───────────────────────────────────────────────────────
  async function askAI(userMessage) {
    history.push({ role: 'user', content: userMessage });
    const res = await fetch(WORKER_URL + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    const reply = data.reply || t('Désolé, une erreur est survenue.', 'Sorry, an error occurred.');
    history.push({ role: 'assistant', content: reply });
    return reply;
  }

  // ─── UI RENDER ────────────────────────────────────────────────────────────────
  function render() {
    const style = document.createElement('style');
    style.textContent = `
      #nm-chat-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;
        width:60px;height:60px;border-radius:50%;background:#1a1a1a;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        box-shadow:0 4px 20px rgba(0,0,0,.45);transition:transform .2s;}
      #nm-chat-bubble:hover{transform:scale(1.08);}
      #nm-chat-bubble svg{width:28px;height:28px;fill:none;stroke:#c9a84c;stroke-width:2;}
      #nm-chat-window{position:fixed;bottom:96px;right:24px;z-index:9999;
        width:380px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 120px);
        background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.22);
        display:none;flex-direction:column;overflow:hidden;font-family:'Inter',sans-serif;}
      #nm-chat-header{background:#1a1a1a;padding:16px 18px;display:flex;
        align-items:center;gap:12px;}
      #nm-chat-header .logo{width:36px;height:36px;border-radius:50%;
        background:#c9a84c;display:flex;align-items:center;justify-content:center;
        font-size:16px;font-weight:700;color:#1a1a1a;}
      #nm-chat-header .info{flex:1;}
      #nm-chat-header .name{color:#fff;font-size:14px;font-weight:600;}
      #nm-chat-header .status{color:#c9a84c;font-size:11px;margin-top:2px;}
      #nm-chat-header .close-btn{background:none;border:none;color:#888;
        font-size:20px;cursor:pointer;padding:0 4px;line-height:1;}
      #nm-chat-messages{flex:1;overflow-y:auto;padding:16px;
        display:flex;flex-direction:column;gap:10px;background:#f8f7f5;}
      .nm-msg{max-width:88%;padding:10px 13px;border-radius:12px;
        font-size:13.5px;line-height:1.55;word-break:break-word;}
      .nm-msg.bot{background:#fff;border:1px solid #e8e3d8;border-radius:12px 12px 12px 2px;
        color:#1a1a1a;align-self:flex-start;}
      .nm-msg.user{background:#1a1a1a;color:#fff;border-radius:12px 12px 2px 12px;
        align-self:flex-end;}
      .nm-msg strong{font-weight:700;}
      .nm-msg a{color:#c9a84c;text-decoration:underline;}
      .nm-msg ul,.nm-msg ol{margin:6px 0 0 16px;padding:0;}
      .nm-msg li{margin-bottom:3px;}
      .nm-typing{display:flex;gap:4px;padding:10px 14px;background:#fff;
        border:1px solid #e8e3d8;border-radius:12px 12px 12px 2px;align-self:flex-start;width:52px;}
      .nm-typing span{width:7px;height:7px;background:#c9a84c;border-radius:50%;
        animation:nm-bounce .9s infinite;}
      .nm-typing span:nth-child(2){animation-delay:.15s;}
      .nm-typing span:nth-child(3){animation-delay:.3s;}
      @keyframes nm-bounce{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-6px);}}
      #nm-chat-input-row{padding:12px 14px;background:#fff;
        border-top:1px solid #eee;display:flex;gap:8px;align-items:center;}
      #nm-chat-input{flex:1;border:1px solid #ddd;border-radius:22px;
        padding:9px 14px;font-size:13px;outline:none;background:#fafafa;
        transition:border-color .2s;}
      #nm-chat-input:focus{border-color:#c9a84c;}
      #nm-chat-send{background:#1a1a1a;color:#fff;border:none;
        border-radius:50%;width:36px;height:36px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        transition:background .2s;}
      #nm-chat-send:hover{background:#c9a84c;}
      #nm-chat-send svg{width:16px;height:16px;fill:none;stroke:#fff;stroke-width:2.2;}
      @media(max-width:440px){#nm-chat-window{width:calc(100vw - 16px);right:8px;bottom:80px;}}
    `;
    document.head.appendChild(style);

    // ── Bubble ────────────────────────────────────────────────────────────────
    const bubble = document.createElement('div');
    bubble.id = 'nm-chat-bubble';
    bubble.title = t('Estimation en direct', 'Live estimate');
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(bubble);

    // ── Chat window ───────────────────────────────────────────────────────────
    const win = document.createElement('div');
    win.id = 'nm-chat-window';
    const headerStatus  = t('Expert · Réponses instantanées', 'Expert · Instant answers');
    const inputPlaceholder = t('Posez votre question…', 'Ask your question…');
    win.innerHTML = `
      <div id="nm-chat-header">
        <div class="logo">NM</div>
        <div class="info">
          <div class="name">Nos Montres Expert</div>
          <div class="status">● ${headerStatus}</div>
        </div>
        <button class="close-btn" id="nm-close">✕</button>
      </div>
      <div id="nm-chat-messages"></div>
      <div id="nm-chat-input-row">
        <input id="nm-chat-input" type="text" placeholder="${inputPlaceholder}" autocomplete="off" />
        <button id="nm-chat-send"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
      </div>`;
    document.body.appendChild(win);

    const msgs    = win.querySelector('#nm-chat-messages');
    const input   = win.querySelector('#nm-chat-input');
    const sendBtn = win.querySelector('#nm-chat-send');
    const closeBtn= win.querySelector('#nm-close');

    // ── Markdown renderer ─────────────────────────────────────────────────────
    function md(text) {
      return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/•\s/g, '• ')
        .replace(/\n/g, '<br>');
    }

    function addMsg(text, who) {
      const el = document.createElement('div');
      el.className = `nm-msg ${who}`;
      el.innerHTML = who === 'bot' ? md(text) : text.replace(/</g, '&lt;');
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }

    function showTyping() {
      const el = document.createElement('div');
      el.className = 'nm-typing';
      el.innerHTML = '<span></span><span></span><span></span>';
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }

    // ── Send message ──────────────────────────────────────────────────────────
    let busy = false;
    async function send() {
      const raw = input.value.trim();
      if (!raw || busy) return;
      busy = true;
      input.disabled = true;
      sendBtn.disabled = true;

      addMsg(raw, 'user');
      input.value = '';
      const typing = showTyping();

      try {
        const reply = await askAI(raw);
        typing.remove();
        addMsg(reply, 'bot');
      } catch (err) {
        typing.remove();
        addMsg(
          t(
            `Désolé, le service est temporairement indisponible. Appelez-nous directement : **${BIZ.phone1}**`,
            `Sorry, the service is temporarily unavailable. Call us directly: **${BIZ.phone1}**`
          ),
          'bot'
        );
      } finally {
        busy = false;
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
      }
    }

    // ── Open / close ──────────────────────────────────────────────────────────
    function openChat() {
      win.style.display = 'flex';
      bubble.style.display = 'none';

      // Show greeting once on first open (static — instant, no API call)
      if (!msgs.children.length) {
        const greetFr = `Bonjour ! 👋 Je suis l'assistant expert horloger de **Nos Montres**.\n\nPosez-moi n'importe quelle question sur les montres de luxe — prix, modèles, histoire, conseils d'achat, ou comment vendre votre montre.\n\n📍 ${BIZ.addr}\n📞 ${BIZ.phone1}`;
        const greetEn = `Hello! 👋 I'm the expert watch advisor at **Nos Montres**.\n\nAsk me anything about luxury watches — prices, models, history, buying advice, or how to sell your watch.\n\n📍 ${BIZ.addr}\n📞 ${BIZ.phone1}`;
        const greetText = t(greetFr, greetEn);

        // Add to history so Gemini has context for follow-up
        history.push({ role: 'assistant', content: greetText });

        const typing = showTyping();
        setTimeout(() => {
          typing.remove();
          addMsg(greetText, 'bot');
          input.focus();
        }, 500);
      } else {
        input.focus();
      }
    }

    bubble.addEventListener('click', openChat);
    closeBtn.addEventListener('click', () => {
      win.style.display = 'none';
      bubble.style.display = 'flex';
    });
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
  }

  render();
})();
