const API_BASE = window.location.origin;

let allPrices = [];
let refreshInterval = null;
let currentPage = 'home';
let currentTradeType = 'buy';
function showPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.textContent.toLowerCase().includes(pageName)) {
    item.classList.add('active');
    }
  });
  
  currentPage = pageName;
  
  if (pageName === 'quotes') {
    renderQuotesList();
  } else if (pageName === 'coins') {
    renderCoinsGrid();
  } else if (pageName === 'trading') {
    updateTradingDisplay();
  }
  
  window.scrollTo(0, 0);

}

// --- 1. WebSocket for Trading Page (Real-time) ---
let socket = null;
let isSocketRunning = false;

function startLivePrices() {
  if (isSocketRunning) return; 

  const statusEl = document.getElementById('connectionStatus');
  const tradeBtn = document.getElementById('tradeSubmitBtn');
  
  // Binance Stream (BTC, ETH, XRP, SOL, DOGE)
  socket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade/ethusdt@trade/xrpusdt@trade/solusdt@trade/dogeusdt@trade');

  socket.onopen = () => {
    isSocketRunning = true;
    if (statusEl) {
      statusEl.innerHTML = '🟢 Live Market';
      statusEl.style.color = '#00b894';
    }
    if (tradeBtn) tradeBtn.disabled = false;
    console.log('Trading System: Online');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const symbol = data.s.replace('USDT', ''); 
    const price = parseFloat(data.p);
    updateTradingUI(symbol, price);
  };

  socket.onclose = () => {
    isSocketRunning = false;
    if (statusEl) {
      statusEl.innerHTML = '🔴 Connecting...';
      statusEl.style.color = '#ff6b6b';
    }
    setTimeout(startLivePrices, 3000);
  };
  
  socket.onerror = (err) => {
    console.log("WS Error", err);
    socket.close();
  };
}

function updateTradingUI(symbol, price) {
  const select = document.getElementById('tradingPair');
  if (!select) return; 

  if (select.value === symbol) {
    const display = document.querySelector('#tradingPriceDisplay .current-price');
    if (display) {
      const oldPrice = parseFloat(display.textContent.replace('$', '').replace(',', ''));
      const color = price > oldPrice ? '#00b894' : (price < oldPrice ? '#ff6b6b' : 'white');
      display.style.color = color;
      display.textContent = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
  }
}

// --- 2. Robust API Fetcher (Never Returns Null) ---
async function fetchAllPrices() {
  
  // WebSocket ကို စဖွင့်မယ် (Trading Page အတွက်)
  startLivePrices();

  // Status ပြမယ့်နေရာ
  const sourceIndicator = document.getElementById('dataSourceIndicator');

  // Backup Data (အရန် Data - အများကြီးထည့်ထားလိုက်မယ်)
  const backupData = [
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 107605.50, change24h: 0.32, image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
      { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3927.05, change24h: 0.39, image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
      { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 650.20, change24h: 1.2, image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png' },
      { id: 'solana', symbol: 'SOL', name: 'Solana', price: 188.94, change24h: 1.02, image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
      { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 2.37, change24h: -0.15, image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
      { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.19, change24h: 1.65, image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
      { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 0.85, image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
      { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 35.4, change24h: 2.1, image: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png' },
      { id: 'tron', symbol: 'TRX', name: 'TRON', price: 0.085, change24h: 0.65, image: 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png' },
      { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 7.20, change24h: -1.5, image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png' }
  ];

  try {
    // API URL ပြောင်းလိုက်ပါပြီ (per_page=50 ဆိုပြီး Coin ၅၀ တောင်းလိုက်တာပါ)
    // ids=... ဆိုပြီး တစ်ခုချင်း ရွေးမနေတော့ပါဘူး
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
    
    if (!response.ok) throw new Error('API Error');
    const rawData = await response.json();

    if(sourceIndicator) {
        sourceIndicator.innerHTML = "🟢 Online API (50 Coins)";
        sourceIndicator.style.color = "#00b894";
    }

    // App ထဲက variable တွေထဲ ထည့်မယ်
    return rawData.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      image: coin.image,
      // Data အသစ်များ (Detail အတွက်)
      high24h: coin.high_24h,
      low24h: coin.low_24h,
      volume: coin.total_volume,
      mcap: coin.market_cap
    }));

  } catch (error) {
    console.log('API Failed, using Backup Data...');
    if(sourceIndicator) {
        sourceIndicator.innerHTML = "⚠️ Backup Data";
        sourceIndicator.style.color = "#fdcb6e";
    }
    return backupData; 
  }
}

function formatPrice(price) {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
}

function formatChange(change) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

function getIconClass(symbol) {
  const symbolLower = symbol.toLowerCase();
  const classes = ['btc', 'eth', 'ltc', 'sol', 'doge', 'xrp', 'avax', 'dot'];
  return classes.includes(symbolLower) ? symbolLower : 'default';
}

function renderTopPrices(prices) {
  const container = document.getElementById('topPricesContainer');
  if (!container) return;
  if (!prices || prices.length === 0) {
    container.innerHTML = '<div class="loading">Loading prices...</div>';
    return;
  }

  container.innerHTML = prices.map(coin => `
    <div class="price-card">
      <div class="price-pair">${coin.symbol}/USDT</div>
      <div class="price-value ${coin.change24h >= 0 ? 'up' : 'down'}">${formatPrice(coin.price)}</div>
      <div class="price-change ${coin.change24h >= 0 ? 'up' : 'down'}">${formatChange(coin.change24h)}</div>
    </div>
  `).join('');
}

function renderFeaturedCrypto(coin) {
  const container = document.getElementById('featuredCrypto');
  if (!container || !coin) return;

  container.innerHTML = `
    <div class="featured-left">
      <div class="featured-icon" style="background: ${coin.change24h >= 0 ? '#00b894' : '#ff6b6b'}">
        ${coin.icon || coin.symbol.charAt(0)}
      </div>
      <span class="featured-symbol">${coin.symbol}/USDT</span>
      <span class="featured-price">${formatPrice(coin.price)}</span>
    </div>
    <div class="featured-change ${coin.change24h >= 0 ? 'up' : 'down'}">
      ${formatChange(coin.change24h)}
    </div>
  `;
}

function renderCryptoList(prices) {
  const container = document.getElementById('cryptoListContainer');
  if (!container) return;
  if (!prices || prices.length === 0) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading prices...</div>';
    return;
  }

  container.innerHTML = prices.map(coin => `
    <div class="crypto-item"
    onclick="openCoinInfo('${coin.symbol}')">
      <div class="crypto-left">
        <div class="crypto-icon ${getIconClass(coin.symbol)}">
          ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}" style="width: 100%; height: 100%; border-radius: 50%;">` : coin.icon || coin.symbol.charAt(0)}
        </div>
        <span class="crypto-name">${coin.symbol}/USDT</span>
      </div>
      <span class="crypto-price">${formatPrice(coin.price)}</span>
      <div class="crypto-change ${coin.change24h >= 0 ? 'up' : 'down'}">
        ${formatChange(coin.change24h)}
      </div>
    </div>
  `).join('');
}

function renderQuotesList() {
  const container = document.getElementById('quotesListContainer');
  if (!container) return;
  if (!allPrices || allPrices.length === 0) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading quotes...</div>';
    return;
  }
  container.innerHTML = allPrices.map(coin => `
    <div class="quote-item" onclick="openCoinInfo('${coin.symbol}')">
      <div class="quote-pair">
        <div class="quote-icon">
          ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.symbol.charAt(0)}
        </div>
        <span class="quote-name">${coin.symbol}/USDT</span>
      </div>
      <span class="quote-price">${formatPrice(coin.price)}</span>
      <span class="quote-change ${coin.change24h >= 0 ? 'up' : 'down'}">${formatChange(coin.change24h)}</span>
      <div class="mini-chart">
        ${generateMiniChart(coin.change24h >= 0)}
      </div>
    </div>
  `).join('');
}
function generateMiniChart(isUp) {
  const heights = [15, 20, 12, 25, 18, 22, 30];
  const color = isUp ? '#00b894' : '#ff6b6b';
  return heights.map(h => `<div class="bar" style="height: ${h}px; background: ${color};"></div>`).join('');
}
function renderCoinsGrid() {
  const container = document.getElementById('coinsGridContainer');
  if (!container) return;
  if (!allPrices || allPrices.length === 0) {
    container.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading coins...</div>';
    return;
  }
  container.innerHTML = allPrices.map(coin => `
    <div class="coin-card" onclick="openCoinInfo('${coin.symbol}')">
      <div class="coin-card-icon">
        ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.symbol.charAt(0)}
      </div>
      <div class="coin-card-name">${coin.symbol}</div>
      <div class="coin-card-price">$${formatPrice(coin.price)}</div>
      <div class="coin-card-change ${coin.change24h >= 0 ? 'up' : 'down'}">
        ${formatChange(coin.change24h)}
      </div>
    </div>
  `).join('');
}
function showCoinDetail(symbol)
{
  showPage('trading');
  const select = document.getElementById('tradingPair');
  if (select) {
    const options = select.options;
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === symbol) {
        select.selectedIndex = i;
        break;
      }
    }
  }
  updateTradingDisplay();
}
function updateTradingDisplay() {
  const select = document.getElementById('tradingPair');
  if (!select) return;
  const symbol = select.value;
  
  const coin = allPrices.find(c => c.symbol === symbol);
  const display = document.getElementById('tradingPriceDisplay');
  if (coin && display) {
    display.innerHTML = `
      <div class="current-price">$${formatPrice(coin.price)}</div>
      <div class="price-change ${coin.change24h >= 0 ? 'up' : 'down'}">${formatChange(coin.change24h)}</div>
    `;
  }
  
  const submitBtn = document.getElementById('tradeSubmitBtn');
  if (submitBtn) {
    submitBtn.textContent = `${currentTradeType === 'buy' ? 'Buy' : 'Sell'} ${symbol}`;
    submitBtn.className = `trade-submit-btn ${currentTradeType}`;
  }
}
function updateTradingPair() {
  updateTradingDisplay();
}
function switchTradeType(type) {
  currentTradeType = type;
  document.querySelectorAll('.trade-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.textContent.toLowerCase() === type) {
      tab.classList.add('active');
      if (type === 'sell') {
        tab.classList.add('sell');
      }
    }
  });
  
  updateTradingDisplay();
}
function setAmountPercent(percent) {
  const amountInput = document.getElementById('tradeAmount');
  if (amountInput) {
    amountInput.value = (1000 * percent / 100).toFixed(4);
    calculateTotal();
  }
}
function calculateTotal() {
const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
  const select = document.getElementById('tradingPair');
  const symbol = select?.value || 'BTC';
  const coin = allPrices.find(c => c.symbol === symbol);
  const price = coin?.price || 0;
  
  const total = amount * price;
  const totalInput = document.getElementById('tradeTotal');
  if (totalInput) {
    totalInput.value = total.toFixed(2);
  }
}
function submitTrade() {
  const amount = document.getElementById('tradeAmount')?.value;
  const symbol = document.getElementById('tradingPair')?.value;
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  alert(`${currentTradeType === 'buy' ? 'Buy' : 'Sell'} order for ${amount} ${symbol} submitted successfully!`);
  document.getElementById('tradeAmount').value = '';
  document.getElementById('tradeTotal').value = '';
}
function filterQuotes() {
  const search = document.getElementById('searchQuotes')?.value.toLowerCase() || '';
  const filtered = allPrices.filter(coin => 
    coin.symbol.toLowerCase().includes(search) || 
    coin.name.toLowerCase().includes(search)
  );
  
  const container = document.getElementById('quotesListContainer');
  if (container && filtered.length > 0) {
    container.innerHTML = filtered.map(coin => `
      <div class="quote-item" onclick="openCoinInfo('${coin.symbol}')">
        <div class="quote-pair">
          <div class="quote-icon">
            ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.symbol.charAt(0)}
          </div>
          <span class="quote-name">${coin.symbol}/USDT</span>
        </div>
        <span class="quote-price">${formatPrice(coin.price)}</span>
        <span class="quote-change ${coin.change24h >= 0 ? 'up' : 'down'}">${formatChange(coin.change24h)}</span>
        <div class="mini-chart">
          ${generateMiniChart(coin.change24h >= 0)}
        </div>
      </div>
    `).join('');
  } else if (container) {
  container.innerHTML = '<div class="no-results">No coins found</div>';
  }
}
function filterCoins() {
  const search = document.getElementById('searchCoins')?.value.toLowerCase() || '';
  const filtered = allPrices.filter(coin => 
    coin.symbol.toLowerCase().includes(search) || 
    coin.name.toLowerCase().includes(search)
  );
  
  const container = document.getElementById('coinsGridContainer');
  if (container && filtered.length > 0) {
    container.innerHTML = filtered.map(coin => `
      <div class="coin-card" onclick="openCoinInfo('${coin.symbol}')">
        <div class="coin-card-icon">
        ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.symbol.charAt(0)}
        </div>
        <div class="coin-card-name">${coin.symbol}</div>
        <div class="coin-card-price">$${formatPrice(coin.price)}</div>
        <div class="coin-card-change ${coin.change24h >= 0 ? 'up' : 'down'}">
          ${formatChange(coin.change24h)}
        </div>
      </div>
    `).join('');
  } else if (container) {
    container.innerHTML = '<div class="no-results">No coins found</div>';
  }
}
function filterByCategory(category) {
  document.querySelectorAll('.market-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.textContent.toLowerCase() === category) {
      tab.classList.add('active');
    }
  });
  
  let filtered = [...allPrices];
  
  if (category === 'gainers') {
    filtered = allPrices.filter(c => c.change24h > 0).sort((a, b) => b.change24h - a.change24h);
  } else if (category === 'losers') {
    filtered = allPrices.filter(c => c.change24h < 0).sort((a, b) => a.change24h - b.change24h);
  }
  
  const container = document.getElementById('quotesListContainer');
  if (container && filtered.length > 0) {
    container.innerHTML = filtered.map(coin => `
      <div class="quote-item" onclick="openCoinInfo('${coin.symbol}')">
      <div class="quote-pair">
          <div class="quote-icon">
            ${coin.image ? `<img src="${coin.image}" alt="${coin.symbol}">` : coin.symbol.charAt(0)}
          </div>
          <span class="quote-name">${coin.symbol}/USDT</span>
        </div>
        <span class="quote-price">${formatPrice(coin.price)}</span>
        <span class="quote-change ${coin.change24h >= 0 ? 'up' : 'down'}">${formatChange(coin.change24h)}</span>
        <div class="mini-chart">
          ${generateMiniChart(coin.change24h >= 0)}
        </div>
      </div>
    `).join('');
  }
}
function showDepositModal() {
  alert('Deposit feature - Coming soon!');
}

function showWithdrawModal() {
  alert('Withdraw feature - Coming soon!');
}
function showTransferModal() {
  alert('Transfer feature - Coming soon!');
}
  

async function loadAllData() {
  try {
    const prices = await fetchAllPrices();
    
    if (prices && prices.length > 0) {
      allPrices = prices;
      
      renderTopPrices(prices.slice(0, 3));
      renderFeaturedCrypto(prices[0]);
      renderCryptoList(prices); 
      if (currentPage === 'quotes') {
        renderQuotesList();
      } else if (currentPage === 'coins') {
        renderCoinsGrid();
      } else if (currentPage === 'trading') {
        updateTradingDisplay();
      }
    } else {
      showError('Unable to load prices. Please refresh the page.');
    }
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Network error. Please check your connection.');
  }
 }
function showError(message) {
  const container = document.getElementById('cryptoListContainer');
  container.innerHTML = `<div class="error-message">${message}<br><button onclick="loadAllData()" style="margin-top:10px;padding:8px 16px;background:#00b894;color:white;border:none;border-radius:5px;cursor:pointer;">Retry</button></div>`;
} 


function startAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  refreshInterval = setInterval(loadAllData, 30000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopAutoRefresh();
  } else {
    loadAllData();
    startAutoRefresh();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadAllData();
  startAutoRefresh();
  setupNavigation();
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

window.addEventListener('beforeunload', function() {
  stopAutoRefresh();
});

// --- Hero Carousel Logic ---

const carouselData = [
  { 
    title: "Crypto Trading", 
    sub: "Trade with confidence & Maximize profits" 
  },
  { 
    title: "Secure Platform", 
    sub: "Bank-grade Security & 24/7 Protection" 
  },
  { 
    title: "Instant Transactions", 
    sub: "Lightning fast Deposits & Withdrawals" 
  }
];

let carouselIndex = 0;
let carouselInterval;

function startCarousel() {
  // ၃ စက္ကန့်တစ်ခါ run ပါမယ်
  carouselInterval = setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselData.length;
    updateHeroDisplay();
  }, 3000);
}

function updateHeroDisplay() {
  const content = document.getElementById('heroContent');
  const title = document.getElementById('heroTitle');
  const sub = document.getElementById('heroSubtitle');
  const dots = document.querySelectorAll('.dot');

  // 1. Fade Out (စာသားဖျောက်မယ်)
  content.classList.add('fade-out');

  // 2. 0.5 စက္ကန့်စောင့်ပြီးမှ စာသားပြောင်းမယ် (CSS transition နဲ့ကိုက်အောင်)
  setTimeout(() => {
    title.textContent = carouselData[carouselIndex].title;
    sub.textContent = carouselData[carouselIndex].sub;
    
    // Dots အရောင်ပြောင်းမယ်
    dots.forEach((dot, index) => {
      if (index === carouselIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // 3. Fade In (စာသားပြန်ပေါ်မယ်)
    content.classList.remove('fade-out');
  }, 500);
}

// Dot ကို နှိပ်လိုက်ရင် အဲ့စာသားကို ချက်ချင်းပြောင်းပေးမယ့် Function
function setCarousel(index) {
  clearInterval(carouselInterval); // Auto run တာ ခဏရပ်
  carouselIndex = index;
  updateHeroDisplay();
  startCarousel(); // ပြန် run
}

// App စဖွင့်တာနဲ့ Carousel စမယ်
document.addEventListener('DOMContentLoaded', function() {
  // 1. Data တွေ စဆွဲမယ်
  startLivePrices(); // WebSocket
  if (typeof fetchAllPrices === 'function') fetchAllPrices(); // API List
  
  // 2. UI တွေ ပြင်ဆင်မယ်
  setupNavigation();
  if (typeof startCarousel === 'function') startCarousel(); // Hero Banner
  
  // 3. User Wallet (ပိုက်ဆံအိတ်) ကို Update လုပ်မယ် (အသစ်ထပ်ဖြည့်ထားတာပါ)
  updateAssetsUI();
});

// --- UNIVERSAL MODAL LOGIC ---

function openModal(type) {
  const modal = document.getElementById('universalModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  
  // Modal ဖွင့်မယ်
  modal.classList.add('show');
  
  // Type အလိုက် စာသားတွေ ပြောင်းမယ်
  switch(type) {
    case 'ieo':
      title.textContent = 'IEO Subscription';
      body.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:40px; margin-bottom:10px;">🚀</div>
          <p style="color:#b2bec3; margin-bottom:15px;">Upcoming Launch: <strong>SPACE-X Token</strong></p>
          <div style="background:#12121a; padding:10px; border-radius:8px; margin-bottom:15px; color:#00b894;">
            Starts in: 02d : 14h : 30m
          </div>
          <button class="modal-action-btn">Subscribe Reminder</button>
        </div>
      `;
      break;

    case 'service':
      title.textContent = 'Customer Service';
      body.innerHTML = `
        <div style="height:200px; background:#12121a; border-radius:10px; padding:10px; overflow-y:auto; margin-bottom:10px;">
          <div style="background:#2d3436; padding:8px; border-radius:8px; display:inline-block; font-size:12px; margin-bottom:5px;">Hello! How can we help you?</div>
        </div>
        <div style="display:flex; gap:10px;">
          <input type="text" class="modal-input" style="margin:0;" placeholder="Type message...">
          <button style="background:#00b894; border:none; width:40px; border-radius:8px; cursor:pointer;">➤</button>
        </div>
      `;
      break;

    case 'verify':
      title.textContent = 'Identity Verification';
      body.innerHTML = `
        <p style="color:#b2bec3; font-size:13px; margin-bottom:10px;">Please upload your ID/Passport.</p>
        <div style="border:2px dashed #2d3436; padding:30px; text-align:center; border-radius:10px; margin-bottom:15px; cursor:pointer;">
          <span style="font-size:24px; color:#636e72;">📷</span>
          <div style="font-size:12px; color:#636e72;">Tap to upload photo</div>
        </div>
        <button class="modal-action-btn">Submit for Review</button>
      `;
      break;

    case 'ai':
      title.textContent = 'AI Quant Bot';
      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
          <span>Bot Status:</span>
          <span style="color:#ff6b6b;">● Stopped</span>
        </div>
        <div style="background:#12121a; padding:15px; border-radius:10px; margin-bottom:15px;">
          <div style="font-size:12px; color:#b2bec3;">Est. Daily Yield</div>
          <div style="font-size:20px; color:#00b894; font-weight:bold;">1.5% - 3.0%</div>
        </div>
        <input type="number" class="modal-input" placeholder="Investment Amount (USDT)">
        <button class="modal-action-btn">Start AI Bot</button>
      `;
      break;

    case 'fiat':
      title.textContent = 'Fiat Deposit';
      body.innerHTML = `
        <select class="modal-input">
          <option>KBZ Pay</option>
          <option>Wave Pay</option>
          <option>Bank Transfer</option>
        </select>
        <input type="number" class="modal-input" placeholder="Amount (MMK)">
        <div style="font-size:12px; color:#b2bec3; margin-bottom:15px;">Rate: 1 USD = 4,500 MMK</div>
        <button class="modal-action-btn">Request Deposit</button>
      `;
      break;
      
    default:
       title.textContent = 'Notice';
       body.innerHTML = '<p>Feature coming soon.</p>';
  }
}

function closeModal() {
  document.getElementById('universalModal').classList.remove('show');
}

// --- STEP 1: TRADINGVIEW CHART ---
let tvWidget = null;

function loadTradingViewChart(symbol) {
  // သင်္ကေတ ပြောင်းပေးခြင်း (ဥပမာ - BTC -> BINANCE:BTCUSDT)
  const tvSymbol = `BINANCE:${symbol}USDT`;

  if (tvWidget) {
    // Chart ရှိပြီးသားဆိုရင် အသစ်မဆောက်ဘဲ ကုမ္ပဏီပဲ ပြောင်းမယ် (Reload မဖြစ်အောင်)
    // Note: Free version widget doesn't support dynamic symbol change easily without reload, 
    // so we will re-render for stability.
  }

  new TradingView.widget({
    "width": "100%",
    "height": 350,
    "symbol": tvSymbol,
    "interval": "D",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1", // 1 = Candlestick
    "locale": "en",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "hide_top_toolbar": true,   // ရှင်းအောင် Toolbar ဖျောက်ထားမယ်
    "hide_side_toolbar": true,
    "allow_symbol_change": false,
    "container_id": "tv_chart_container",
    "backgroundColor": "#12121a" // App အရောင်နဲ့ တစ်သားတည်းဖြစ်အောင်
  });
}

// showCoinDetail function ကို ပြင်မယ် (Chart ပါ ပေါ်အောင်လို့)
// အရင် showCoinDetail အဟောင်းကို ရှာပြီး ဒီအသစ်နဲ့ အစားထိုးပါ
function showCoinDetail(symbol) {
  showPage('trading');
  const select = document.getElementById('tradingPair');
  if (select) {
    select.value = symbol;
    // Select box မှာ မရှိတဲ့ Coin ဆိုရင် ထည့်ပေးမယ်
    if (select.value !== symbol) {
       let opt = document.createElement('option');
       opt.value = symbol;
       opt.innerHTML = `${symbol}/USDT`;
       select.appendChild(opt);
       select.value = symbol;
    }
  }
  updateTradingDisplay();
  
  // Chart ကို လှမ်းခေါ်မယ်
  loadTradingViewChart(symbol);
}

// Trading Pair ပြောင်းရင် Chart ပါ လိုက်ပြောင်းမယ်
// updateTradingPair function အဟောင်းကို ရှာပြီး အစားထိုးပါ
function updateTradingPair() {
  updateTradingDisplay();
  const symbol = document.getElementById('tradingPair').value;
  loadTradingViewChart(symbol);
}

// --- STEP 2: PAPER TRADING SYSTEM ---

// User ရဲ့ ပိုက်ဆံအိတ် (Local Storage မှာ သိမ်းမယ်)
let userWallet = JSON.parse(localStorage.getItem('cryptoUserWallet')) || {
  usdt: 10000.00, // လက်ဆောင် $10,000 နဲ့ စမယ်
  holdings: {}    // ဝယ်ထားတဲ့ Coin များ
};

// ပိုက်ဆံသိမ်းတဲ့ Function
function saveWallet() {
  localStorage.setItem('cryptoUserWallet', JSON.stringify(userWallet));
  updateAssetsUI(); // Assets စာမျက်နှာကိုပါ Update လုပ်မယ်
}

// Trading Form မှာ "Available Balance" ပြမယ်
function updateWalletDisplay() {
  const balanceLabel = document.querySelector('label[for="tradeAmount"]'); 
  // Label မရှိရင် ရှာပြီး ပြင်မယ် (သို့) အသစ်ထည့်မယ်
  // (ဒီအပိုင်းကို Trading Form HTML မှာ ပြင်ရင် ပိုကောင်းပါတယ် - အောက်မှာကြည့်ပါ)
}

// အရင် submitTrade အဟောင်းကို ရှာပြီး ဒီအသစ်နဲ့ အစားထိုးပါ (အရေးကြီး!)
function submitTrade() {
  const type = currentTradeType; // 'buy' or 'sell'
  const symbol = document.getElementById('tradingPair').value;
  const amount = parseFloat(document.getElementById('tradeAmount').value);
  const priceText = document.querySelector('#tradingPriceDisplay .current-price').textContent;
  const currentPrice = parseFloat(priceText.replace('$','').replace(',',''));
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const totalCost = amount * currentPrice;

  // Buying Logic
  if (type === 'buy') {
    if (userWallet.usdt >= totalCost) {
      // ပိုက်ဆံဖြတ်မယ်
      userWallet.usdt -= totalCost;
      // Coin တိုးမယ်
      if (!userWallet.holdings[symbol]) userWallet.holdings[symbol] = 0;
      userWallet.holdings[symbol] += amount;
      
      saveWallet();
      alert(`✅ SUCCESS!\nBought ${amount} ${symbol} for $${totalCost.toFixed(2)}`);
      document.getElementById('tradeAmount').value = '';
    } else {
      alert('❌ Insufficient USDT Balance!');
    }
  } 
  // Selling Logic
  else {
    if (userWallet.holdings[symbol] >= amount) {
      // Coin ဖြတ်မယ်
      userWallet.holdings[symbol] -= amount;
      // ပိုက်ဆံတိုးမယ်
      userWallet.usdt += totalCost;
      
      saveWallet();
      alert(`✅ SUCCESS!\nSold ${amount} ${symbol} for $${totalCost.toFixed(2)}`);
      document.getElementById('tradeAmount').value = '';
    } else {
      alert(`❌ Insufficient ${symbol} Balance!`);
    }
  }
}

// Assets Tab မှာ ပိုက်ဆံအစစ်တွေ ပြပေးမယ်
// Assets Tab ကိုနှိပ်ရင် ဒီ function အလုပ်လုပ်အောင် showPage မှာ ချိတ်မယ်
function updateAssetsUI() {
  // 1. Assets Page ခေါင်းစဉ်ကြီးက Total Balance ကို ပြင်မယ်
  const balanceEl = document.querySelector('.asset-box h1');
  const approxEl = document.querySelector('.asset-box p:nth-of-type(2)'); // "≈ $..." စာကြောင်း

  if (balanceEl) {
    // လက်ရှိ USDT ပမာဏကို ပြမယ်
    balanceEl.textContent = userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }
  
  if (approxEl) {
    // USDT ဖြစ်လို့ Dollar နဲ့ တန်ဖိုးတူတူပါပဲ
    approxEl.textContent = `≈ $${userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }

  // 2. Assets List ထဲက "USDT" စာရင်းကို ပြင်မယ်
  const usdtBalanceEl = document.getElementById('assetUsdtBalance');
  if (usdtBalanceEl) {
    usdtBalanceEl.textContent = userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });
  }

  // 3. Trading Form ထဲက Available Balance ကိုလည်း ပြင်ပေးမယ်
  const tradeAmountInput = document.getElementById('tradeAmount');
  if (tradeAmountInput) {
    // Input ရဲ့ အပေါ်က Label (သို့) အနီးနားမှာ Available ပြချင်ရင် ဒီမှာ ရေးလို့ရပါတယ်
    // လောလောဆယ် Console မှာ Log ထုတ်ပြထားပါမယ်
    console.log("Current Wallet Balance:", userWallet.usdt);
  }
}

// --- STEP 3: COIN DETAIL MODAL ---

function openCoinInfo(symbol) {
  const coin = allPrices.find(c => c.symbol === symbol);
  if (!coin) return;

  const modal = document.getElementById('universalModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  // Modal ဖွင့်မယ်
  modal.classList.add('show');
  title.textContent = `${coin.name} (${coin.symbol})`;

  // အသေးစိတ် အချက်အလက်တွေ ပြမယ်
  body.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <img src="${coin.image}" style="width:60px; height:60px; border-radius:50%; margin-bottom:10px;">
      <div style="font-size:32px; font-weight:bold;">$${coin.price.toLocaleString()}</div>
      <div style="color:${coin.change24h >= 0 ? '#00b894' : '#ff6b6b'}; font-weight:bold;">
        ${coin.change24h >= 0 ? '▲' : '▼'} ${coin.change24h.toFixed(2)}%
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
      <div style="background:#12121a; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#b2bec3;">24h High</div>
        <div style="font-weight:600;">$${coin.high24h ? coin.high24h.toLocaleString() : '-'}</div>
      </div>
      <div style="background:#12121a; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#b2bec3;">24h Low</div>
        <div style="font-weight:600;">$${coin.low24h ? coin.low24h.toLocaleString() : '-'}</div>
      </div>
      <div style="background:#12121a; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#b2bec3;">Volume</div>
        <div style="font-weight:600;">$${coin.volume ? (coin.volume/1000000).toFixed(2) + 'M' : '-'}</div>
      </div>
      <div style="background:#12121a; padding:12px; border-radius:10px;">
        <div style="font-size:12px; color:#b2bec3;">Market Cap</div>
        <div style="font-weight:600;">$${coin.mcap ? (coin.mcap/1000000000).toFixed(2) + 'B' : '-'}</div>
      </div>
    </div>

    <button onclick="showCoinDetail('${coin.symbol}'); closeModal();" class="modal-action-btn">
      Go to Trade
    </button>
  `;
}

// --- STEP 4: LOGIN SYSTEM ---

// App စဖွင့်ရင် Login ဝင်ထားလား စစ်မယ်
document.addEventListener('DOMContentLoaded', function() {
  const user = localStorage.getItem('cryptoUser');
  if (!user) {
    // Login မဝင်ရသေးရင် Login Page ကို အရင်ပြမယ်
    // (မှတ်ချက်: ဒီလိုင်းကို ဖွင့်လိုက်ရင် App စဖွင့်တာနဲ့ Login Page တက်လာပါမယ်)
    // showPage('login'); 
  } else {
    updateProfileUI(user);
  }
});

function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;

  if (email && pass) {
    // Fake Login Success
    const username = email.split('@')[0];
    localStorage.setItem('cryptoUser', username);
    
    alert(`Welcome back, ${username}!`);
    updateProfileUI(username);
    showPage('home'); // Home ကို ပို့မယ်
  } else {
    alert('Please enter email and password');
  }
}

function updateProfileUI(username) {
  // Mine Page က နာမည်ကို ပြင်မယ်
  const nameEl = document.querySelector('.profile-name');
  const emailEl = document.querySelector('.profile-email');
  
  if (nameEl) nameEl.textContent = username;
  if (emailEl) emailEl.textContent = `${username}@gmail.com`;
  
  // Home Page က "Personal Center" ခလုတ်မှာ နာမည်ပြမယ်
  const pcBtn = document.querySelector('.personal-center-btn');
  if (pcBtn) pcBtn.textContent = username;
}

// Logout လုပ်ရင်
function handleLogout() {
  localStorage.removeItem('cryptoUser');
  alert('Logged out successfully');
  showPage('login');
}
