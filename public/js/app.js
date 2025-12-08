const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  initHeroCarousel(); // Slide စာသား ပြောင်းမယ့် function
  loadAllData();      // Data ဆွဲမယ့် function
  
  // ၁၀ စက္ကန့်တစ်ခါ ဈေးနှုန်း Update လုပ်မယ်
  setInterval(loadAllData, 10000);
});

// --- 1. HERO SLIDER LOGIC (Slide ပြန်ထည့်ပေးခြင်း) ---
function initHeroCarousel() {
  const titles = ["Crypto Trading", "Secure Platform", "Fast Transaction"];
  const subtitles = ["Trade with confidence", "Safe & Reliable", "Instant Deposit"];
  const dots = document.querySelectorAll('.dot');
  const titleEl = document.querySelector('.hero-title');
  const subEl = document.querySelector('.hero-subtitle');
  
  let currentIndex = 0;

  setInterval(() => {
    // Remove active class from current
    dots[currentIndex].classList.remove('active');
    
    // Move to next
    currentIndex = (currentIndex + 1) % titles.length;
    
    // Update content with fade effect
    if(titleEl) titleEl.style.opacity = 0;
    if(subEl) subEl.style.opacity = 0;

    setTimeout(() => {
      if(titleEl) {
        titleEl.textContent = titles[currentIndex];
        titleEl.style.opacity = 1;
      }
      if(subEl) {
        subEl.textContent = subtitles[currentIndex];
        subEl.style.opacity = 1;
      }
    }, 200);

    // Add active class to new dot
    dots[currentIndex].classList.add('active');
  }, 3000); // 3 စက္ကန့်တစ်ခါ ပြောင်းမယ်
}

// --- 2. NAVIGATION LOGIC ---
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.page-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetId = item.getAttribute('data-target');
      if (!targetId) return;

      navItems.forEach(nav => nav.classList.remove('active'));
      views.forEach(view => view.classList.remove('active'));

      item.classList.add('active');
      const targetView = document.getElementById(targetId);
      if(targetView) targetView.classList.add('active');

      if (targetId === 'view-trading') initTradingView();
    });
  });
}

// --- 3. DATA LOADING LOGIC ---
async function loadAllData() {
  try {
    const res = await fetch(`${API_BASE}/api/prices/list`);
    if (!res.ok) throw new Error('API Error');
    const prices = await res.json();
    
    if (prices && prices.length > 0) {
      // Loading စာသားတွေကို ဖယ်ရှားမယ် (Hidden)
      document.querySelectorAll('.loading').forEach(el => el.style.display = 'none');
      
      renderTopPrices(prices.slice(0, 3));
      renderFeaturedCrypto(prices[0]);
      renderCryptoList(prices);
    }
  } catch (error) {
    console.error("Data Load Error:", error);
    // Error တက်ရင် Loading နေရာမှာ Error ပြမယ်
    const loader = document.getElementById('cryptoListContainer');
    if(loader && loader.innerHTML.includes('Loading')) {
      loader.innerHTML = '<div style="text-align:center; padding:20px; color:#ff7675;">Failed to load data. Retrying...</div>';
    }
  }
}

// ဈေးနှုန်း ပုံစံချခြင်း
function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', {maximumFractionDigits: 0});
  if (price >= 1) return price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return price.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 6});
}

// --- 4. RENDER UI FUNCTIONS ---

function renderTopPrices(prices) {
  const container = document.getElementById('topPricesContainer');
  if(!container) return;
  
  container.innerHTML = prices.map(coin => `
    <div class="price-card">
      <div class="price-pair">${coin.symbol}/USDT</div>
      <div class="price-value ${coin.change24h >= 0 ? 'up' : 'down'}">${formatPrice(coin.price)}</div>
      <div class="price-change ${coin.change24h >= 0 ? 'up' : 'down'}">
        ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%
      </div>
    </div>
  `).join('');
}

function renderFeaturedCrypto(coin) {
  const container = document.getElementById('featuredCrypto');
  if(!container || !coin) return;
  
  container.innerHTML = `
    <div class="featured-left">
      <div class="featured-icon" style="background:#f7931a; color:white; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;">
         ${coin.image ? `<img src="${coin.image}" style="width:100%; height:100%; border-radius:50%;">` : '₿'}
      </div>
      <div>
        <span class="featured-symbol" style="color:white; font-weight:600; font-size:15px; margin-left:8px;">${coin.symbol}/USDT</span>
        <span class="featured-price" style="margin-left:10px; color:white; font-size:16px; font-weight:bold;">${formatPrice(coin.price)}</span>
      </div>
    </div>
    <div class="featured-change ${coin.change24h >= 0 ? 'down' : 'up'}" style="background:${coin.change24h >= 0 ? '#ff7675' : '#00b894'}; padding:6px 12px; border-radius:6px; color:white; font-weight:bold;">
      ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%
    </div>
  `;
}

function renderCryptoList(prices) {
  const container = document.getElementById('cryptoListContainer');
  if(!container) return;

  container.innerHTML = prices.map(coin => `
    <div class="crypto-item">
      <div class="crypto-left">
        <div class="crypto-icon">
          ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : `<div style="width:100%; height:100%; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center;">${coin.symbol[0]}</div>`}
        </div>
        <span class="crypto-name">${coin.symbol}/USDT</span>
      </div>
      <span class="crypto-price">${formatPrice(coin.price)}</span>
      <div class="crypto-change ${coin.change24h >= 0 ? 'up' : 'down'}">
        ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%
      </div>
    </div>
  `).join('');
}

// --- 5. CHART ---
let chartInit = false;
function initTradingView() {
  if (chartInit) return;
  if (typeof TradingView !== 'undefined') {
    new TradingView.widget({
      "width": "100%", "height": 400,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "D", "timezone": "Asia/Yangon",
      "theme": "dark", "style": "1",
      "locale": "en", "toolbar_bg": "#f1f3f6",
      "enable_publishing": false,
      "hide_side_toolbar": false,
      "container_id": "tradingview_chart"
    });
    chartInit = true;
  }
}
