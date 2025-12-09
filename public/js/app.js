const API_BASE = window.location.origin;

// === 1. BACKUP DATA (API ပျက်ရင် ဒါကိုပြမယ် - Error လုံးဝမတက်စေရ) ===
const FALLBACK_DATA = [
  { symbol: 'BTC', price: 90866.00, change24h: -0.04, image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
  { symbol: 'ETH', price: 3132.00, change24h: 0.35, image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
  { symbol: 'XRP', price: 2.08, change24h: 0.39, image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
  { symbol: 'SOL', price: 133.70, change24h: -1.11, image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
  { symbol: 'TRX', price: 0.283098, change24h: -1.48, image: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
  { symbol: 'DOGE', price: 0.143163, change24h: 1.07, image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
  { symbol: 'ADA', price: 0.434484, change24h: 1.32, image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
  { symbol: 'BCH', price: 580.89, change24h: -2.41, image: 'https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png' },
  { symbol: 'LINK', price: 13.80, change24h: -1.56, image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png' },
  { symbol: 'XLM', price: 0.242256, change24h: 0.61, image: 'https://assets.coingecko.com/coins/images/100/large/stellar_lumens.png' },
  { symbol: 'LTC', price: 84.00, change24h: 1.27, image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' },
  { symbol: 'AVAX', price: 13.63, change24h: -0.77, image: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
  { symbol: 'UNI', price: 5.63, change24h: 0.16, image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png' },
  { symbol: 'DOT', price: 2.14, change24h: 0.30, image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' },
  { symbol: 'MATIC', price: 0.00, change24h: 0.00, image: 'https://assets.coingecko.com/coins/images/4713/large/matic-token-icon.png' }
];

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  initHeroCarousel(); // Slide ပြန်ထည့်ထားပါတယ်
  loadAllData();      
  
  // ၁၀ စက္ကန့်တစ်ခါ Update လုပ်မယ်
  setInterval(loadAllData, 10000);
});

// === 2. HERO SLIDER LOGIC (အစက် ၃ စက် အလုပ်လုပ်မယ့်ကုဒ်) ===
function initHeroCarousel() {
  const titles = ["Crypto Trading", "Secure Platform", "Fast Transaction"];
  const subtitles = ["Trade with confidence", "Safe & Reliable", "Instant Deposit"];
  const dots = document.querySelectorAll('.dot');
  const titleEl = document.querySelector('.hero-title');
  const subEl = document.querySelector('.hero-subtitle');
  
  // Dots မရှိရင် ဘာမှမလုပ်ဘူး (Error မတက်အောင်)
  if (!dots.length) return;

  let currentIndex = 0;

  setInterval(() => {
    // အစက်အဟောင်းကို မှိန်မယ်
    dots.forEach(d => d.classList.remove('active'));
    
    // နောက်တစ်မျက်နှာ ကူးမယ်
    currentIndex = (currentIndex + 1) % titles.length;
    
    // စာသားပြောင်းမယ်
    if(titleEl) {
      titleEl.style.opacity = 0;
      setTimeout(() => { titleEl.textContent = titles[currentIndex]; titleEl.style.opacity = 1; }, 200);
    }
    if(subEl) {
      subEl.style.opacity = 0;
      setTimeout(() => { subEl.textContent = subtitles[currentIndex]; subEl.style.opacity = 1; }, 200);
    }

    // အစက်အသစ်ကို လင်းမယ်
    if(dots[currentIndex]) dots[currentIndex].classList.add('active');
  }, 3000);
}

// === 3. DATA LOADING (Error တက်ရင် Backup သုံးမယ့် Logic) ===
async function loadAllData() {
  try {
    // API ကို လှမ်းခေါ်မယ် (၃ စက္ကန့်ပဲ စောင့်မယ်)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${API_BASE}/api/prices/list`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('API Error');
    
    const prices = await res.json();
    
    if (prices && prices.length > 0) {
      updateUI(prices);
    } else {
      throw new Error('Empty Data');
    }

  } catch (error) {
    console.log("Using Backup Data due to:", error);
    // Error တက်တာနဲ့ ချက်ချင်း Backup Data ကို ထုတ်သုံးမယ် (Loading ပြဿနာ ရှင်းပြီး)
    updateUI(FALLBACK_DATA);
  }
}

// UI တစ်ခုလုံးကို Data နဲ့ ချိတ်ဆက်ခြင်း
function updateUI(prices) {
  // Loading စာလုံး ဖျောက်မယ်
  document.querySelectorAll('.loading').forEach(el => el.style.display = 'none');

  renderTopPrices(prices.slice(0, 3));
  renderFeaturedCrypto(prices[0]); // BTC
  renderCryptoList(prices);
}

// ဈေးနှုန်း ဖြတ်တောက်ပုံ (ဥပမာ 90,000)
function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', {maximumFractionDigits: 0});
  if (price >= 1) return price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return price.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 6});
}

// --- RENDER FUNCTIONS (HTML ထုတ်ပေးမယ့် အပိုင်း) ---

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
      <div class="featured-icon" style="background:#f7931a; color:white; width:36px; height:36px; display:flex; align-items:center; justify-content:center; border-radius:50%;">₿</div>
      <div>
        <span class="featured-symbol" style="color:white; font-weight:600; margin-left:8px;">${coin.symbol}/USDT</span>
        <span class="featured-price" style="margin-left:10px; color:white; font-weight:bold;">${formatPrice(coin.price)}</span>
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
        <div class="crypto-icon" style="width:28px; height:28px; border-radius:50%; overflow:hidden;">
          <img src="${coin.image}" alt="${coin.symbol}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/30'">
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

// Navigation Logic
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

// TradingView Chart
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
