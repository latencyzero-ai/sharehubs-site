/* =====================================================================
   Share Hubs — soft signup hook
   A dismissible prompt that appears ONLY at moments of intent
   (submitting a quote / partner application), never as a wall.
   ===================================================================== */
(function () {
  // Inject styles once.
  const css = `
  .sh-prompt-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);
    display:none;align-items:center;justify-content:center;z-index:9999;
    padding:20px;backdrop-filter:blur(3px)}
  .sh-prompt-overlay.show{display:flex}
  .sh-prompt{background:#121212;color:#f5f5f5;border:1px solid #242424;
    border-radius:18px;max-width:420px;width:100%;padding:34px 30px;
    text-align:center;box-shadow:0 24px 60px -12px rgba(0,0,0,.7);
    font-family:'Poppins',Arial,sans-serif;position:relative;
    animation:shPop .25s ease}
  @keyframes shPop{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}
  .sh-prompt h3{font-size:21px;margin:0 0 8px;font-weight:700}
  .sh-prompt p{font-size:14.5px;color:#c9c9c9;line-height:1.55;margin:0 0 22px}
  .sh-prompt .sh-actions{display:flex;flex-direction:column;gap:10px}
  .sh-prompt .sh-primary{background:#e11d2a;color:#fff;border:none;
    padding:13px;border-radius:9px;font-weight:600;font-size:15px;cursor:pointer;
    text-decoration:none;display:block}
  .sh-prompt .sh-primary:hover{background:#c41320}
  .sh-prompt .sh-secondary{background:transparent;color:#9a9a9a;border:none;
    padding:9px;font-size:13.5px;cursor:pointer}
  .sh-prompt .sh-secondary:hover{color:#f5f5f5}
  .sh-prompt .sh-close{position:absolute;top:14px;right:16px;background:none;
    border:none;color:#777;font-size:22px;cursor:pointer;line-height:1}
  .sh-prompt .sh-close:hover{color:#fff}
  .sh-prompt .sh-logo{width:54px;margin:0 auto 14px;display:block}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // Build the modal.
  const overlay = document.createElement('div');
  overlay.className = 'sh-prompt-overlay';
  overlay.innerHTML = `
    <div class="sh-prompt" role="dialog" aria-modal="true" aria-labelledby="shPromptTitle">
      <button class="sh-close" aria-label="Close">&times;</button>
      <img src="/img/share hubs engineering.png" alt="" class="sh-logo"
           onerror="this.style.display='none'">
      <h3 id="shPromptTitle">Almost there</h3>
      <p id="shPromptBody">Create a free account to send your request and track
        our response. It takes less than a minute.</p>
      <div class="sh-actions">
        <a class="sh-primary" id="shPromptCta" href="/login">Create free account</a>
        <button class="sh-secondary" id="shPromptDismiss">Keep browsing</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => overlay.classList.remove('show');
  overlay.querySelector('.sh-close').addEventListener('click', close);
  overlay.querySelector('#shPromptDismiss').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  /**
   * Public API: SHPrompt.open({ title, body, next })
   * `next` is where login should return the user after signing up.
   */
  window.SHPrompt = {
    open(opts = {}) {
      if (opts.title) overlay.querySelector('#shPromptTitle').textContent = opts.title;
      if (opts.body) overlay.querySelector('#shPromptBody').textContent = opts.body;
      const cta = overlay.querySelector('#shPromptCta');
      cta.href = '/login' + (opts.next ? '?next=' + encodeURIComponent(opts.next) : '');
      overlay.classList.add('show');
    },
    close,
  };
})();
