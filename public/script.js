// ── Star Field ────────────────────────────────────────────────
(function initStars() {
  const canvas = document.getElementById('stars');
  const ctx    = canvas.getContext('2d');
  const STAR_COUNT = 180;
  let stars = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x:       Math.random() * canvas.width,
        y:       Math.random() * canvas.height,
        radius:  Math.random() * 1.2 + 0.2,
        opacity: Math.random() * 0.6 + 0.1,
        speed:   Math.random() * 0.003 + 0.001,
        phase:   Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
      const twinkle = Math.sin(timestamp * star.speed + star.phase);
      const alpha   = star.opacity + twinkle * 0.15;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, alpha)})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); createStars(); });
  resize();
  createStars();
  requestAnimationFrame(draw);
})();

// ── Grab Elements from the DOM ────────────────────────────────
const urlInput    = document.getElementById('url-input');
const shortenBtn  = document.getElementById('shorten-btn');
const resultBox   = document.getElementById('result');
const shortUrlEl  = document.getElementById('short-url');
const copyBtn     = document.getElementById('copy-btn');
const historyList = document.getElementById('history-list');

// ── Load / Save History via localStorage ─────────────────────
function loadHistory() {
  const stored = localStorage.getItem('snip-history');
  return stored ? JSON.parse(stored) : [];
}

function saveHistory(history) {
  localStorage.setItem('snip-history', JSON.stringify(history));
}

// ── Render History List ───────────────────────────────────────
function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<p class="empty-state">No links shortened yet.</p>';
    return;
  }

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerHTML = `
      <a class="history-short" href="${entry.shortUrl}" target="_blank">
        ${window.location.host}${entry.shortUrl}
      </a>
      <span class="history-original">${entry.original}</span>
      <button class="history-copy" data-url="${window.location.host}${entry.shortUrl}">Copy</button>
    `;
    historyList.appendChild(li);
  });
}

// ── Validate URL ──────────────────────────────────────────────
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Shorten a URL ─────────────────────────────────────────────
async function shortenUrl() {
  let raw = urlInput.value.trim();

  if (raw && !raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = 'https://' + raw;
  }

  if (!isValidUrl(raw)) {
    urlInput.style.outline = '2px solid #ff4d4d';
    urlInput.placeholder   = 'Please enter a valid URL...';
    setTimeout(() => {
      urlInput.style.outline = '';
      urlInput.placeholder   = 'Paste a long URL here...';
    }, 1500);
    return;
  }

  shortenBtn.textContent = '...';
  shortenBtn.disabled    = true;

  try {
    const response = await fetch('/shorten', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ originalUrl: raw }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Server error');
    }

    // window.location.host gives us the current domain automatically
    // localhost:3000 in dev, your-app.railway.app in production
    const fullShort = `${window.location.host}${data.shortUrl}`;
    shortUrlEl.textContent = fullShort;
    shortUrlEl.onclick     = () => window.open(data.shortUrl, '_blank');
    shortUrlEl.style.cursor = 'pointer';

    resultBox.removeAttribute('hidden');

    const history = loadHistory();
    history.unshift({ code: data.code, shortUrl: data.shortUrl, original: raw });
    saveHistory(history);
    renderHistory();

    urlInput.value = '';

  } catch (err) {
    console.error('Failed to shorten URL:', err);
    urlInput.placeholder = 'Something went wrong, try again...';
    setTimeout(() => { urlInput.placeholder = 'Paste a long URL here...'; }, 2000);

  } finally {
    shortenBtn.textContent = 'Shorten';
    shortenBtn.disabled    = false;
  }
}

// ── Copy to Clipboard ─────────────────────────────────────────
function copyToClipboard(text, buttonEl) {
  navigator.clipboard.writeText(text).then(() => {
    buttonEl.textContent = 'Copied!';
    buttonEl.classList.add('copied');
    setTimeout(() => {
      buttonEl.textContent = 'Copy';
      buttonEl.classList.remove('copied');
    }, 2000);
  });
}

// ── Event Listeners ───────────────────────────────────────────
shortenBtn.addEventListener('click', shortenUrl);

urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') shortenUrl();
});

copyBtn.addEventListener('click', () => {
  copyToClipboard(shortUrlEl.textContent, copyBtn);
});

historyList.addEventListener('click', (e) => {
  if (e.target.classList.contains('history-copy')) {
    copyToClipboard(e.target.dataset.url, e.target);
  }
});

// ── Init ──────────────────────────────────────────────────────
renderHistory();