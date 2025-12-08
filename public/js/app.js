const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadAllData();
  // ၁၀ စက္ကန့်တစ်ခါ ဈေးနှုန်း Update လုပ်မယ်
  setInterval(loadAllData, 10000);
});

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

async function loadAllData() {
  try {
    const res = await fetch(`${API_BASE}/api/prices/list`);
    if (!res.ok) throw new Error('API Error');
    const prices = await res.json();
    
    if (prices && prices.length > 0) {
      renderTopPrices(prices.slice(0, 3)); // အပေါ်ဆုံး ၃ ကဒ်
      renderFeaturedCrypto(prices[0]);     // အပြာရောင် BTC ကဒ်
      renderCryptoList(prices);            // အောက်ဆုံး List
    }
  } catch (error) {
    console.error(error);
  }
}

// ဈေးနှုန်း ဖြတ်တောက်ခြင်း (ဥပမာ 90,123)
function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', {maximumFractionDigits: 0});
  if (price >= 1) return price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return price.toLocaleString('en-US', {minimumFractionDigits: 4, maximumFractionDigits: 6});
}

// အပေါ်ဆုံး ကဒ် ၃ ခု
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

// အပြာရောင် အကြီးကဒ် (BTC)
function renderFeaturedCrypto(coin) {
  const container = document.getElementById('featuredCrypto');
  if(!container || !coin) return;
  
  // BTC ကိုပဲ ပြမယ် (ပုံပါအတိုင်း)
  container.innerHTML = `
    <div class="featured-left">
      <div class="featured-icon" style="background:#f7931a; color:white;">₿</div>
      <div>
        <span class="featured-symbol">${coin.symbol}/USDT</span>
        <span class="featured-price" style="margin-left:10px">${formatPrice(coin.price)}</span>
      </div>
    </div>
    <div class="featured-change ${coin.change24h >= 0 ? 'up' : 'down'}">
      ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%
    </div>
  `;
}

// အောက်ဆုံး Coin List (Logo အစစ်၊ ခလုတ်အစစ်)
function renderCryptoList(prices) {
  const container = document.getElementById('cryptoListContainer');
  if(!container) return;

  container.innerHTML = prices.map(coin => `
    <div class="crypto-item">
      <div class="crypto-left">
        <div class="crypto-icon">
          ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.icon}
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
