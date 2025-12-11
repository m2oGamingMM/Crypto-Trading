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

// --- 1. ROBUST LIVE DATA ENGINE (Binance Ticker) ---
let socket = null;
let activeSymbol = 'BTC'; // Default symbol

function startLivePrices() {
  if (socket) socket.close();
  
  // Connect to Binance All Mini Tickers Stream (For High/Low/Vol Data)
  socket = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');

  socket.onopen = () => {
    console.log('🔥 Live Market Data Connected');
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
      statusEl.innerHTML = '🟢 Live';
      statusEl.style.color = '#00b894';
    }
  };

  socket.onmessage = (event) => {
    const tickers = JSON.parse(event.data);
    
    // 1. Update Main Trading UI if current symbol is in the payload
    const currentTicker = tickers.find(t => t.s === `${activeSymbol}USDT`);
    if (currentTicker) {
      updateMainTradingUI(currentTicker);
    }

    // 2. Update Side Menu (Hamburger)
    updateSideMenuLive(tickers);
  };
  
  socket.onclose = () => setTimeout(startLivePrices, 3000); // Auto Reconnect
}

// Update the big price, high, low, vol on Trading Page
function updateMainTradingUI(ticker) {
  const price = parseFloat(ticker.c); // Current Price
  const high = parseFloat(ticker.h);  // High Price
  const low = parseFloat(ticker.l);   // Low Price
  const vol = parseFloat(ticker.q);   // Quote Volume (USDT traded)
  const open = parseFloat(ticker.o);  // Open Price
  
  // Calculate Change % manually to be precise
  const changePercent = ((price - open) / open) * 100;

  // Update Elements
  const priceEl = document.getElementById('mainPrice');
  const highEl = document.getElementById('highPrice');
  const lowEl = document.getElementById('lowPrice');
  const volEl = document.getElementById('vol24h');
  const changeEl = document.getElementById('currentSymbolChange');
  
  if (priceEl) {
    const oldPrice = parseFloat(priceEl.textContent.replace(/,/g, '')) || 0;
    priceEl.textContent = price.toLocaleString('en-US', { minimumFractionDigits: 2 });
    // Flash Color Effect
    if(price !== oldPrice) {
        priceEl.style.color = price >= oldPrice ? '#00b894' : '#ff6b6b';
    }
  }

  if (highEl) highEl.textContent = high.toLocaleString();
  if (lowEl) lowEl.textContent = low.toLocaleString();
  if (volEl) volEl.textContent = (vol / 1000000).toFixed(2) + 'M';
  
  if (changeEl) {
    const sign = changePercent >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${changePercent.toFixed(2)}%`;
    changeEl.style.color = changePercent >= 0 ? '#00b894' : '#ff6b6b';
  }
}

// Side Menu အတွက် Live Update Function
function updateSideMenuLive(tickers) {
  const drawer = document.getElementById('sideMenuDrawer');
  // Performance ကောင်းအောင် Side menu ဖွင့်ထားမှ အလုပ်လုပ်မယ်
  if (!drawer || !drawer.classList.contains('open')) return;

  tickers.forEach(t => {
    if (!t.s.endsWith('USDT')) return; // USDT pair ပဲယူမယ်
    
    const symbol = t.s.replace('USDT', '');
    const priceEl = document.getElementById(`side-price-${symbol}`);
    const changeEl = document.getElementById(`side-change-${symbol}`);
    
    if (priceEl && changeEl) {
      const price = parseFloat(t.c);
      const open = parseFloat(t.o);
      const change = ((price - open) / open) * 100;
      
      priceEl.textContent = price.toLocaleString();
      changeEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
      changeEl.style.color = change >= 0 ? '#00b894' : '#ff6b6b';
    }
  });
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
// Chart Always Load Function
function initChart() {
    loadTradingViewChart(activeSymbol);
}

function showCoinDetail(symbol) {
  activeSymbol = symbol;
  showPage('trading');
  
  // Update Header Name
  const nameEl = document.getElementById('currentSymbolName');
  if(nameEl) nameEl.textContent = `${symbol}/USDT`;

  // Reload Chart
  loadTradingViewChart(symbol);
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

// --- DELIVERY & PERPETUAL LOGIC (FINAL CLEAN VERSION) ---
let isSideMenuOpen = false;
let currentDuration = 30;
let currentProfitRate = 15;
let currentContractMode = 'delivery'; 
let currentCurrency = 'USDT';
let closedPositions = [];

// 1. Transaction Mode (USDT / USDC)
function selectTransMode(currency) {
  currentCurrency = currency;
  const usdtBtn = document.getElementById('mode-usdt');
  const usdcBtn = document.getElementById('mode-usdc');
  if(usdtBtn) usdtBtn.className = currency === 'USDT' ? 'mode-btn active' : 'mode-btn';
  if(usdcBtn) usdcBtn.className = currency === 'USDC' ? 'mode-btn active' : 'mode-btn';
  
  const balanceEl = document.getElementById('contractBalance');
  if(balanceEl && typeof userWallet !== 'undefined') {
      const bal = currency === 'USDT' ? userWallet.usdt : (userWallet.usdt * 0.99); 
      balanceEl.textContent = `${bal.toFixed(4)} ${currency}`;
  }
}

// 2. Tab Switching
function switchContractTab(mode) {
  currentContractMode = mode;
  const delTab = document.getElementById('tab-delivery');
  const perpTab = document.getElementById('tab-perpetual');
  const delView = document.getElementById('view-delivery');
  const perpView = document.getElementById('view-perpetual');

  if(delTab) delTab.className = mode === 'delivery' ? 'c-tab active' : 'c-tab';
  if(perpTab) perpTab.className = mode === 'perpetual' ? 'c-tab active' : 'c-tab';
  if(delView) delView.style.display = mode === 'delivery' ? 'block' : 'none';
  if(perpView) perpView.style.display = mode === 'perpetual' ? 'block' : 'none';
}

// 3. Time Selection (8 Buttons Support)
function selectTime(seconds, rate, element) {
  currentDuration = seconds;
  currentProfitRate = rate;
  document.querySelectorAll('.time-box').forEach(box => box.classList.remove('active'));
  if(element) element.classList.add('active');
}

// 4. Side Menu Logic
function toggleSideMenu() {
  const backdrop = document.getElementById('sideMenuBackdrop');
  const drawer = document.getElementById('sideMenuDrawer');
  isSideMenuOpen = !isSideMenuOpen;
  
  if (isSideMenuOpen) {
    if(backdrop) backdrop.style.display = 'block';
    if(drawer) setTimeout(() => { drawer.classList.add('open'); }, 10);
    renderSideMenuCoins(); 
  } else {
    if(drawer) drawer.classList.remove('open');
    if(backdrop) setTimeout(() => { backdrop.style.display = 'none'; }, 300);
  }
}

function renderSideMenuCoins() {
  const container = document.getElementById('sideMenuCoinList');
  // Popular coins list for menu (You can add more)
  const coins = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'LTC', 'ADA', 'TRX', 'MATIC']; 
  
  container.innerHTML = coins.map(sym => `
    <div class="side-coin-item" onclick="selectSideMenuCoin('${sym}')" 
         style="display:flex; justify-content:space-between; padding:15px 16px; border-bottom:1px solid #1e1e2d; cursor:pointer;">
      <div style="color:white; font-weight:bold; font-size:15px;">${sym}<span style="font-size:12px; color:#636e72; margin-left:4px;">/USDT</span></div>
      <div style="text-align:right;">
        <div id="side-price-${sym}" style="color:white; font-weight:bold;">Loading...</div>
        <div id="side-change-${sym}" style="font-size:11px; color:#636e72;">0.00%</div>
      </div>
    </div>
  `).join('');
}

function selectSideMenuCoin(symbol) {
  showCoinDetail(symbol);
  toggleSideMenu();
}

// 5. History Tabs & Rendering
// History Tab Switch with Loading Effect
function switchHistoryTab(tab) {
  // Update Tab Styling
  document.querySelectorAll('.h-tab-link').forEach(btn => {
    btn.classList.remove('active');
    if(btn.textContent.toLowerCase().includes(tab.replace('transaction','in transaction').replace('closed', 'position closed'))) {
        btn.classList.add('active');
    }
  });

  const transContent = document.getElementById('hist-content-transaction');
  const closedContent = document.getElementById('hist-content-closed');

  if (tab === 'transaction') {
    transContent.style.display = 'block';
    closedContent.style.display = 'none';
  } else {
    transContent.style.display = 'none';
    closedContent.style.display = 'block';
    
    // FAKE LOADING (အရေးကြီးသော အပိုင်း)
    closedContent.innerHTML = '<div class="history-loading"><div class="loading-spinner"></div><br>Loading history records...</div>';
    
    setTimeout(() => {
        renderFakeHistoryData(closedContent);
    }, 1500); // 1.5 Seconds Loading
  }
}

// Generate Fake Data like Screenshot
function renderFakeHistoryData(container) {
  let html = '';
  const now = new Date();
  
  // Random Data Generation
  for(let i=0; i<10; i++) {
     const isWin = Math.random() > 0.5;
     const profit = (Math.random() * 200).toFixed(4);
     const amount = [100, 500, 1000, 5000][Math.floor(Math.random()*4)];
     const time = new Date(now - i * 60000 * 5); // 5 mins gap
     
     // Screenshot Style CSS
     html += `
        <div style="padding:12px 16px; border-bottom:1px solid #2d3436; background:#12121a;">
           <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:8px;">
              <span style="color:#b2bec3;">Position closed</span>
              <span style="color:white; font-weight:bold;">${activeSymbol}/USDT 60 second</span>
           </div>
           
           <div style="display:grid; grid-template-columns: 1fr 1.5fr 1.5fr 1fr; gap:5px; margin-bottom:8px;">
              <div>
                  <div style="font-size:10px; color:#636e72;">quantity</div>
                  <div style="color:white; font-size:13px;">${amount}</div>
              </div>
              <div>
                  <div style="font-size:10px; color:#636e72;">Purchase price</div>
                  <div style="color:white; font-size:13px;">${(Math.random()*4000+2000).toFixed(6)}</div>
              </div>
              <div>
                  <div style="font-size:10px; color:#636e72;">Transaction price</div>
                  <div style="color:white; font-size:13px;">${(Math.random()*4000+2000).toFixed(6)}</div>
              </div>
              <div style="text-align:right;">
                  <div style="font-size:10px; color:#636e72;">Profit and loss</div>
                  <div style="color:${isWin ? '#00b894' : '#ff6b6b'}; font-size:13px;">${isWin?'+':''}${profit}</div>
              </div>
           </div>

           <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px dashed #2d3436;">
              <div>
                  <div style="font-size:10px; color:#636e72;">position opening time</div>
                  <div style="font-size:11px; color:#b2bec3;">${time.toLocaleString()}</div>
              </div>
           </div>
        </div>
     `;
  }
  container.innerHTML = html;
}

// 6. Order Submission
function submitDeliveryOrder(type) {
  const amountInput = document.getElementById('deliveryAmount');
  const amount = parseFloat(amountInput ? amountInput.value : 0);
  
  if(!amount || amount <= 0) { alert('Please enter amount'); return; }
  
  if(typeof userWallet !== 'undefined' && amount > userWallet.usdt) { 
      alert('Insufficient balance'); return; 
  }
  
  // Deduct Balance
  if(typeof userWallet !== 'undefined') {
      userWallet.usdt -= amount;
      if(typeof saveWallet === 'function') saveWallet();
  }
  
  selectTransMode(currentCurrency); // Refresh UI

  alert(`Order Submitted!\nType: ${type.toUpperCase()}\nTime: ${currentDuration}s\nAmount: ${amount}`);
  switchHistoryTab('transaction');
  
  // Simulate Result
  setTimeout(() => {
     const isWin = Math.random() > 0.4; // 60% win chance
     const profit = amount * (currentProfitRate / 100);
     const pnl = isWin ? profit : -amount;
     
     if(isWin && typeof userWallet !== 'undefined') {
         userWallet.usdt += (amount + profit);
         if(typeof saveWallet === 'function') saveWallet();
         selectTransMode(currentCurrency);
     }

     const now = new Date();
     const close = new Date(now.getTime() + currentDuration*1000);
     const priceEl = document.getElementById('mainPrice');
     const currentPrice = priceEl ? parseFloat(priceEl.textContent.replace(/,/g,'')) : 92000;
     const symbolEl = document.getElementById('currentSymbolName');
     const symbol = symbolEl ? symbolEl.textContent.split('/')[0] + '/USDT' : 'BTC/USDT';
     
     const newPos = {
        symbol: symbol,
        time: currentDuration,
        qty: amount,
        buyPrice: currentPrice,
        closePrice: currentPrice + (isWin ? (Math.random()*10) : -(Math.random()*10)),
        pnl: pnl,
        openTime: now.toLocaleString(),
        closeTime: close.toLocaleString(),
        isWin: isWin
     };
     
     closedPositions.unshift(newPos); 
     
     const closedTabBtn = document.querySelectorAll('.h-tab-btn')[1];
     if(closedTabBtn && closedTabBtn.classList.contains('active')) {
        renderClosedPositions();
     } else {
        switchHistoryTab('closed');
     }
     
     alert(`Order Result: ${isWin ? 'WIN 🟢' : 'LOSS 🔴'}\nPnL: ${pnl.toFixed(2)}`);
  }, 2000); 
}

function submitPerpetualOrder(type) {
  const amount = document.getElementById('perpAmount').value;
  if(!amount) { alert('Enter amount'); return; }
  alert(`PERPETUAL ${type.toUpperCase()} Order Placed!\nAmount: ${amount}`);
}

function setLeverage(btn, value) {
  document.querySelectorAll('.mode-btn').forEach(b => {
      if(b.textContent.includes('x')) b.classList.remove('active');
  });
  if(btn) btn.classList.add('active');
}

// 7. Initialization & Hook
function initDummyHistory() {
  closedPositions = [
    {
       symbol: 'XAU/USDT', time: '30', qty: 100, buyPrice: 4196.84, closePrice: 4197.25, pnl: 15.00, 
       openTime: '2025-12-10 06:22:44', closeTime: '2025-12-10 06:23:14', isWin: true
    },
    {
       symbol: 'BTC/USDT', time: '60', qty: 50, buyPrice: 92100.00, closePrice: 92050.00, pnl: -50.00, 
       openTime: '2025-12-10 07:00:00', closeTime: '2025-12-10 07:01:00', isWin: false
    }
  ];
}

// Hook into existing updateTradingUI
const oldUpdateTradingUI = typeof updateTradingUI === 'function' ? updateTradingUI : null;
updateTradingUI = function(symbol, price) {
  if(oldUpdateTradingUI) oldUpdateTradingUI(symbol, price);
  
  // New Delivery UI Updates
  const nameEl = document.getElementById('currentSymbolName');
  const priceEl = document.getElementById('mainPrice');
  
  if(nameEl && (nameEl.textContent.includes(symbol) || nameEl.textContent === 'BTC/USDT')) {
      if(priceEl) {
         const oldP = parseFloat(priceEl.textContent.replace(/,/g,''));
         priceEl.textContent = price.toLocaleString('en-US', {minimumFractionDigits: 2});
         priceEl.className = price >= oldP ? 'big-price up' : 'big-price down';
      }
      if(nameEl) nameEl.textContent = `${symbol}/USDT`;
  }
};

document.addEventListener('DOMContentLoaded', () => {
    initDummyHistory();
    selectTransMode('USDT');
    // New Initializations
    startLivePrices();
    renderSideMenuCoins();
    initChart(); // Chart will load immediately
});

// --- ASSETS TAB SWITCHING ---
let currentAssetTab = 'spot';

function switchAssetTab(tab) {
  currentAssetTab = tab;
  
  document.querySelectorAll('.assets-tabs .asset-tab').forEach(btn => {
    btn.classList.remove('active');
    btn.style.color = '#636e72';
    btn.style.borderBottom = 'none';
    
    if (btn.textContent.toLowerCase() === tab) {
      btn.classList.add('active');
      btn.style.color = '#00b894';
      btn.style.borderBottom = '2px solid #00b894';
    }
  });
  
  renderAssetsByTab(tab);
}

function renderAssetsByTab(tab) {
  const container = document.getElementById('assetsListContainer');
  if (!container) return;
  
  const stableIcons = {
    'BTC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/128px-Bitcoin.svg.png',
    'ETH': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/128px-Ethereum_logo_2014.svg.png',
    'USDT': 'https://seeklogo.com/images/T/tether-usdt-logo-FA55C7F397-seeklogo.com.png',
    'BNB': 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Binance-coin-bnb-logo.png',
    'SOL': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png',
    'XRP': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ripple_logo.svg/128px-Ripple_logo.svg.png',
    'DOGE': 'https://upload.wikimedia.org/wikipedia/en/d/d0/Dogecoin_Logo.png'
  };
  
  if (tab === 'spot') {
    let listHTML = `
      <div class="asset-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #1e1e2d;">
        <div class="asset-left" style="display:flex; align-items:center; gap:12px;">
          <img src="${stableIcons['USDT']}" style="width:36px; height:36px; border-radius:50%;">
          <div>
            <div style="font-weight:bold; color:white;">USDT</div>
            <div style="font-size:12px; color:#636e72;">Tether</div>
          </div>
        </div>
        <div class="asset-right" style="text-align:right;">
          <div style="font-weight:bold; color:white;">${userWallet.usdt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <div style="font-size:12px; color:#b2bec3;">$1.00</div>
        </div>
      </div>
    `;
    
    for (const [symbol, amount] of Object.entries(userWallet.holdings)) {
      if (amount > 0) {
        const coinInfo = allPrices.find(c => c.symbol === symbol) || { name: symbol, price: 0, image: '' };
        const valueUSD = amount * coinInfo.price;
        const iconUrl = stableIcons[symbol] || coinInfo.image || 'https://via.placeholder.com/36';
        
        listHTML += `
          <div class="asset-item" onclick="showCoinDetail('${symbol}')" style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #1e1e2d; cursor:pointer;">
            <div class="asset-left" style="display:flex; align-items:center; gap:12px;">
              <img src="${iconUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:contain; background:white; padding:2px;">
              <div>
                <div style="font-weight:bold; color:white;">${symbol}</div>
                <div style="font-size:12px; color:#636e72;">${coinInfo.name}</div>
              </div>
            </div>
            <div class="asset-right" style="text-align:right;">
              <div style="font-weight:bold; color:white;">${amount.toFixed(4)}</div>
              <div style="font-size:12px; color:#b2bec3;">$${valueUSD.toLocaleString('en-US', {maximumFractionDigits: 2})}</div>
            </div>
          </div>
        `;
      }
    }
    
    container.innerHTML = listHTML;
  } else if (tab === 'futures' || tab === 'earn') {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:#636e72;">
        <div style="font-size:48px; margin-bottom:16px;">📭</div>
        <div style="font-size:16px; font-weight:bold; margin-bottom:8px;">No ${tab === 'futures' ? 'Futures' : 'Earn'} Assets</div>
        <div style="font-size:13px;">Start trading ${tab === 'futures' ? 'derivatives' : 'and earning'} to see assets here</div>
      </div>
    `;
  }
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

// Function ခေါင်းစဉ် ပြောင်းပါ
function openModal(type, subType = null) {
  const modal = document.getElementById('universalModal');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');
  
  body.innerHTML = '';
  
  // Modal ဖွင့်မယ်
  modal.classList.add('show');
  
  // Type အလိုက် စာသားတွေ ပြောင်းမယ်
  switch(type) {
    case 'ieo':
      title.textContent = 'IEO Subscription';
      body.innerHTML = `
        <div style="margin-bottom:20px;">
          <div style="background:linear-gradient(135deg, #1e3a5f, #2d5a87); padding:16px; border-radius:12px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:40px; height:40px; background:#f7931a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">🚀</div>
                <div>
                  <div style="font-weight:bold;">SPACE-X Token</div>
                  <div style="font-size:11px; color:#b2bec3;">Aerospace & Technology</div>
                </div>
              </div>
              <div style="background:#00b894; padding:4px 10px; border-radius:12px; font-size:11px;">Live</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#b2bec3; margin-bottom:8px;">
              <span>Price: $0.05</span>
              <span>Total: 10M Tokens</span>
            </div>
            <div style="background:#12121a; padding:8px; border-radius:8px; text-align:center; color:#00b894; font-weight:bold;" id="ieoCountdown1">
              02d : 14h : 30m : 45s
            </div>
          </div>
          
          <div style="background:#1e1e2d; padding:16px; border-radius:12px; margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:40px; height:40px; background:#627eea; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">🎮</div>
                <div>
                  <div style="font-weight:bold;">GAME-FI Token</div>
                  <div style="font-size:11px; color:#b2bec3;">Gaming & Metaverse</div>
                </div>
              </div>
              <div style="background:#fdcb6e; color:#000; padding:4px 10px; border-radius:12px; font-size:11px;">Upcoming</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#b2bec3; margin-bottom:8px;">
              <span>Price: $0.02</span>
              <span>Total: 50M Tokens</span>
            </div>
            <div style="background:#12121a; padding:8px; border-radius:8px; text-align:center; color:#fdcb6e; font-weight:bold;">
              Starts: Dec 20, 2024
            </div>
          </div>
          
          <div style="background:#1e1e2d; padding:16px; border-radius:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:40px; height:40px; background:#00b894; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">🌿</div>
                <div>
                  <div style="font-weight:bold;">ECO-CHAIN</div>
                  <div style="font-size:11px; color:#b2bec3;">Green Energy</div>
                </div>
              </div>
              <div style="background:#636e72; padding:4px 10px; border-radius:12px; font-size:11px;">Coming Soon</div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12px; color:#b2bec3;">
              <span>Price: TBA</span>
              <span>Total: 100M Tokens</span>
            </div>
          </div>
        </div>
        <button class="modal-action-btn" onclick="alert('You will be notified when IEO starts!')">🔔 Set Reminder</button>
      `;
      break;

    case 'service':
      title.textContent = 'Customer Support';
      body.innerHTML = `
        <div style="height:280px; background:#12121a; border-radius:12px; padding:12px; overflow-y:auto; margin-bottom:12px;" id="chatContainer">
          <div style="text-align:center; margin-bottom:16px;">
            <div style="font-size:11px; color:#636e72; background:#1e1e2d; display:inline-block; padding:4px 12px; border-radius:12px;">Today</div>
          </div>
          
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <div style="width:32px; height:32px; background:#00b894; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">🤖</div>
            <div>
              <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Support Bot • 10:30 AM</div>
              <div style="background:#2d3436; padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:220px;">
                Hello! 👋 Welcome to Crypto Trading Support. How can I help you today?
              </div>
            </div>
          </div>
          
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <div style="width:32px; height:32px; background:#00b894; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">🤖</div>
            <div>
              <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Support Bot • 10:30 AM</div>
              <div style="background:#2d3436; padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:220px;">
                Quick options:<br>
                1️⃣ Account Issues<br>
                2️⃣ Deposit/Withdraw<br>
                3️⃣ Trading Help<br>
                4️⃣ Speak to Agent
              </div>
            </div>
          </div>
        </div>
        
        <div style="display:flex; gap:8px;">
          <input type="text" id="chatInput" class="modal-input" style="margin:0; flex:1;" placeholder="Type your message..." onkeypress="if(event.key==='Enter')sendChatMessage()">
          <button onclick="sendChatMessage()" style="background:#00b894; border:none; width:48px; border-radius:10px; cursor:pointer; font-size:18px;">➤</button>
        </div>
      `;
      break;

    case 'verify':
      title.textContent = 'Identity Verification';
      body.innerHTML = `
        <div style="background:#1e1e2d; padding:16px; border-radius:12px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <div style="width:48px; height:48px; background:linear-gradient(135deg, #00b894, #00cec9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px;">🛡️</div>
            <div>
              <div style="font-weight:bold; font-size:16px;">KYC Verification</div>
              <div style="font-size:12px; color:#636e72;">Complete to unlock full features</div>
            </div>
          </div>
          
          <div style="display:flex; gap:8px; margin-bottom:12px;">
            <div style="flex:1; text-align:center; padding:8px; background:#12121a; border-radius:8px;">
              <div style="font-size:20px; margin-bottom:4px;">📝</div>
              <div style="font-size:10px; color:#00b894;">Step 1</div>
            </div>
            <div style="flex:1; text-align:center; padding:8px; background:#12121a; border-radius:8px; opacity:0.5;">
              <div style="font-size:20px; margin-bottom:4px;">📷</div>
              <div style="font-size:10px; color:#636e72;">Step 2</div>
            </div>
            <div style="flex:1; text-align:center; padding:8px; background:#12121a; border-radius:8px; opacity:0.5;">
              <div style="font-size:20px; margin-bottom:4px;">✅</div>
              <div style="font-size:10px; color:#636e72;">Done</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Full Legal Name</label>
          <input type="text" class="modal-input" style="margin:0;" placeholder="As shown on your ID">
        </div>
        
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">ID Number</label>
          <input type="text" class="modal-input" style="margin:0;" placeholder="Passport / National ID">
        </div>
        
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Date of Birth</label>
          <input type="date" class="modal-input" style="margin:0;">
        </div>
        
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Upload ID Document</label>
          <div style="border:2px dashed #2d3436; padding:24px; text-align:center; border-radius:12px; cursor:pointer; background:#12121a;" onclick="document.getElementById('idFileInput').click()">
            <input type="file" id="idFileInput" style="display:none;" accept="image/*" onchange="handleFileSelect(this)">
            <span style="font-size:32px; display:block; margin-bottom:8px;">📄</span>
            <div style="font-size:13px; color:#636e72;" id="fileLabel">Click to upload (JPG, PNG, PDF)</div>
          </div>
        </div>
        
        <button class="modal-action-btn" onclick="submitVerification()">Submit for Review</button>
      `;
      break;

    case 'ai':
      title.textContent = 'AI Quant Bot';
      body.innerHTML = `
        <div style="background:linear-gradient(135deg, #1e3a5f, #2d5a87); padding:20px; border-radius:16px; text-align:center; margin-bottom:16px;">
          <div style="font-size:48px; margin-bottom:8px;">🤖</div>
          <div style="font-size:18px; font-weight:bold; margin-bottom:4px;">Smart Trading Bot</div>
          <div style="font-size:12px; color:#b2bec3;">AI-powered automated trading</div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#1e1e2d; border-radius:10px; margin-bottom:12px;">
          <span style="font-size:14px;">Bot Status</span>
          <div id="botStatusIndicator" style="display:flex; align-items:center; gap:6px;">
            <span style="width:10px; height:10px; background:#ff6b6b; border-radius:50%; animation: pulse 1.5s infinite;"></span>
            <span style="color:#ff6b6b; font-weight:bold;">Stopped</span>
          </div>
        </div>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
          <div style="background:#12121a; padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Daily Yield</div>
            <div style="font-size:18px; color:#00b894; font-weight:bold;">1.5% - 3.0%</div>
          </div>
          <div style="background:#12121a; padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Win Rate</div>
            <div style="font-size:18px; color:#00b894; font-weight:bold;">87.5%</div>
          </div>
          <div style="background:#12121a; padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Total Trades</div>
            <div style="font-size:18px; color:#ffffff; font-weight:bold;">1,247</div>
          </div>
          <div style="background:#12121a; padding:14px; border-radius:10px; text-align:center;">
            <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Active Users</div>
            <div style="font-size:18px; color:#ffffff; font-weight:bold;">5,892</div>
          </div>
        </div>
        
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Investment Amount (USDT)</label>
          <input type="number" id="botInvestment" class="modal-input" style="margin:0;" placeholder="Min: 100 USDT" value="500">
        </div>
        
        <button class="modal-action-btn" id="startBotBtn" onclick="toggleAIBot()">🚀 Start AI Bot</button>
        <p style="font-size:11px; color:#636e72; text-align:center; margin-top:10px;">⚠️ Trading involves risk. Past performance is not indicative of future results.</p>
      `;
      break;

    // CASE: Fiat / Crypto Transfer System
    case 'fiat':
      const mode = subType || 'deposit';
      
      // Header မှာ ID="fiatTabHeader" ထည့်လိုက်ပါတယ် (ဖျောက်ဖို့/ပြန်ဖော်ဖို့)
      const headerHTML = `
        <div id="fiatTabHeader" style="display:flex; gap:8px; margin-bottom:16px;">
          <button id="btn-fiat-deposit" class="fiat-tab ${mode === 'deposit' ? 'active' : ''}" 
            onclick="renderDepositMenu()" 
            style="flex:1; padding:10px; background:${mode === 'deposit' ? '#00b894' : '#1e1e2d'}; border:${mode === 'deposit' ? 'none' : '1px solid #2d3436'}; border-radius:8px; color:${mode === 'deposit' ? 'white' : '#b2bec3'}; font-weight:bold; cursor:pointer;">
            Deposit
          </button>
          <button id="btn-fiat-withdraw" class="fiat-tab ${mode === 'withdraw' ? 'active' : ''}" 
            onclick="renderWithdrawMenu()" 
            style="flex:1; padding:10px; background:${mode === 'withdraw' ? '#00b894' : '#1e1e2d'}; border:${mode === 'withdraw' ? 'none' : '1px solid #2d3436'}; border-radius:8px; color:${mode === 'withdraw' ? 'white' : '#b2bec3'}; font-weight:bold; cursor:pointer;">
            Withdraw
          </button>
        </div>
        <div id="fiatContentArea"></div>
      `;
      
      title.textContent = mode === 'deposit' ? 'Deposit Coins' : 'Withdraw Funds';
      body.innerHTML = headerHTML;
      
      if (mode === 'deposit') {
        setTimeout(renderDepositMenu, 0);
      } else {
        setTimeout(renderWithdrawMenu, 0);
      }
      break;
            
      case 'security':
      title.textContent = 'Security Settings';
      const twoFAEnabled = localStorage.getItem('twoFAEnabled') === 'true';
      const biometricEnabled = localStorage.getItem('biometricEnabled') !== 'false';
      body.innerHTML = `
        <div class="menu-item" onclick="openModal('change_password')" style="border-bottom:1px solid #2d3436; cursor:pointer;">
          <span>🔑 Change Password</span>
          <span style="font-size:12px; color:#00b894;">›</span>
        </div>
        <div class="menu-item" style="border-bottom:1px solid #2d3436;">
          <span>📱 2FA Authentication</span>
          <label class="toggle-switch">
            <input type="checkbox" id="twoFAToggle" ${twoFAEnabled ? 'checked' : ''} onchange="toggleSecuritySetting('twoFA', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="menu-item">
          <span>🖐 Biometric Login</span>
          <label class="toggle-switch">
            <input type="checkbox" id="biometricToggle" ${biometricEnabled ? 'checked' : ''} onchange="toggleSecuritySetting('biometric', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
      break;
      
    case 'change_password':
      title.textContent = 'Change Password';
      body.innerHTML = `
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Current Password</label>
          <input type="password" id="currentPass" class="modal-input" style="margin:0;" placeholder="Enter current password">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">New Password</label>
          <input type="password" id="newPass" class="modal-input" style="margin:0;" placeholder="Enter new password">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Confirm New Password</label>
          <input type="password" id="confirmPass" class="modal-input" style="margin:0;" placeholder="Confirm new password">
        </div>
        <button class="modal-action-btn" onclick="changePassword()">Update Password</button>
      `;
      break;

    case 'payment':
      title.textContent = 'Payment Methods';
      const savedPayments = JSON.parse(localStorage.getItem('paymentMethods')) || [
        {type: 'visa', last4: '4242'},
        {type: 'kbz', last4: '8899'}
      ];
      let paymentHTML = savedPayments.map((p, i) => `
        <div style="padding:12px; background:#12121a; border-radius:10px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
          <span>${p.type === 'visa' ? '💳 Visa' : p.type === 'mastercard' ? '💳 Mastercard' : '📱 ' + p.type.toUpperCase()} **** ${p.last4}</span>
          <span style="color:#ff6b6b; cursor:pointer;" onclick="removePaymentMethod(${i})">Remove</span>
        </div>
      `).join('');
      body.innerHTML = `
        ${paymentHTML}
        <div style="border:2px dashed #2d3436; padding:16px; text-align:center; border-radius:10px; cursor:pointer;" onclick="openModal('add_payment')">
          <span style="font-size:24px;">+</span>
          <div style="font-size:13px; color:#636e72; margin-top:4px;">Add Payment Method</div>
        </div>
      `;
      break;
      
    case 'add_payment':
      title.textContent = 'Add Payment Method';
      body.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
          <div onclick="selectPaymentType('visa')" id="payType-visa" class="pay-type-option" style="background:#1e1e2d; padding:16px; border-radius:10px; text-align:center; cursor:pointer; border:2px solid transparent;">
            <div style="font-size:24px;">💳</div>
            <div style="font-size:12px; margin-top:4px;">Visa/Mastercard</div>
          </div>
          <div onclick="selectPaymentType('kbz')" id="payType-kbz" class="pay-type-option" style="background:#1e1e2d; padding:16px; border-radius:10px; text-align:center; cursor:pointer; border:2px solid transparent;">
            <div style="font-size:24px;">📱</div>
            <div style="font-size:12px; margin-top:4px;">KBZ Pay</div>
          </div>
          <div onclick="selectPaymentType('wave')" id="payType-wave" class="pay-type-option" style="background:#1e1e2d; padding:16px; border-radius:10px; text-align:center; cursor:pointer; border:2px solid transparent;">
            <div style="font-size:24px;">📱</div>
            <div style="font-size:12px; margin-top:4px;">Wave Pay</div>
          </div>
          <div onclick="selectPaymentType('cb')" id="payType-cb" class="pay-type-option" style="background:#1e1e2d; padding:16px; border-radius:10px; text-align:center; cursor:pointer; border:2px solid transparent;">
            <div style="font-size:24px;">🏦</div>
            <div style="font-size:12px; margin-top:4px;">CB Bank</div>
          </div>
        </div>
        <div id="cardDetails" style="display:none;">
          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Card Number / Phone Number</label>
            <input type="text" id="paymentNumber" class="modal-input" style="margin:0;" placeholder="Enter number">
          </div>
        </div>
        <button class="modal-action-btn" onclick="addPaymentMethod()">Add Payment Method</button>
      `;
      break;

    case 'notifications':
      title.textContent = 'Notifications';
      const notifSettings = JSON.parse(localStorage.getItem('notificationSettings')) || {
        priceAlerts: true, news: false, orderStatus: true, promotions: false
      };
      body.innerHTML = `
        <div class="menu-item" style="border-bottom:1px solid #2d3436;">
          <span>💰 Price Alerts</span>
          <label class="toggle-switch">
            <input type="checkbox" ${notifSettings.priceAlerts ? 'checked' : ''} onchange="saveNotificationSetting('priceAlerts', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="menu-item" style="border-bottom:1px solid #2d3436;">
          <span>📰 News & Updates</span>
          <label class="toggle-switch">
            <input type="checkbox" ${notifSettings.news ? 'checked' : ''} onchange="saveNotificationSetting('news', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="menu-item" style="border-bottom:1px solid #2d3436;">
          <span>📦 Order Status</span>
          <label class="toggle-switch">
            <input type="checkbox" ${notifSettings.orderStatus ? 'checked' : ''} onchange="saveNotificationSetting('orderStatus', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="menu-item">
          <span>🎁 Promotions</span>
          <label class="toggle-switch">
            <input type="checkbox" ${notifSettings.promotions ? 'checked' : ''} onchange="saveNotificationSetting('promotions', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `;
      break;

    case 'language':
      title.textContent = 'Select Language';
      const currentLang = localStorage.getItem('selectedLanguage') || 'English';
      body.innerHTML = `
        <div class="menu-item" onclick="setLanguage('English')" style="cursor:pointer;">
          <span>🇺🇸 English</span>
          <span style="color:#00b894;">${currentLang === 'English' ? '✓' : ''}</span>
        </div>
        <div class="menu-item" onclick="setLanguage('Myanmar')" style="cursor:pointer;">
          <span>🇲🇲 Myanmar</span>
          <span style="color:#00b894;">${currentLang === 'Myanmar' ? '✓' : ''}</span>
        </div>
        <div class="menu-item" onclick="setLanguage('Chinese')" style="cursor:pointer;">
          <span>🇨🇳 Chinese</span>
          <span style="color:#00b894;">${currentLang === 'Chinese' ? '✓' : ''}</span>
        </div>
      `;
      break;
      
    case 'profile_edit':
      title.textContent = 'Edit Profile';
      const savedUser = localStorage.getItem('cryptoUser') || 'User';
      body.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="width:80px; height:80px; background:#2d3436; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:40px; margin:0 auto 12px;">👤</div>
          <button onclick="document.getElementById('avatarInput').click()" style="background:#1e1e2d; border:1px solid #00b894; color:#00b894; padding:8px 16px; border-radius:8px; cursor:pointer;">Change Photo</button>
          <input type="file" id="avatarInput" style="display:none;" accept="image/*">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Username</label>
          <input type="text" id="editUsername" class="modal-input" style="margin:0;" value="${savedUser}">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Email</label>
          <input type="email" id="editEmail" class="modal-input" style="margin:0;" value="${savedUser}@gmail.com">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Phone Number</label>
          <input type="tel" id="editPhone" class="modal-input" style="margin:0;" placeholder="+95 9xxxxxxxx">
        </div>
        <button class="modal-action-btn" onclick="saveProfile()">Save Changes</button>
      `;
      break;
      
    case 'verify_email':
      title.textContent = 'Email Verification';
      const emailVerified = localStorage.getItem('emailVerified') === 'true';
      body.innerHTML = emailVerified ? `
        <div style="text-align:center; padding:30px;">
          <div style="font-size:64px; margin-bottom:16px;">✅</div>
          <div style="font-size:18px; font-weight:bold; color:#00b894; margin-bottom:8px;">Email Verified</div>
          <div style="color:#b2bec3;">Your email has been successfully verified.</div>
        </div>
      ` : `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:48px; margin-bottom:12px;">📧</div>
          <div style="color:#b2bec3;">Verify your email to secure your account</div>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Email Address</label>
          <input type="email" id="verifyEmail" class="modal-input" style="margin:0;" placeholder="Enter your email">
        </div>
        <button class="modal-action-btn" onclick="sendVerificationCode('email')">Send Verification Code</button>
        <div id="emailCodeSection" style="display:none; margin-top:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Enter Code</label>
          <input type="text" id="emailCode" class="modal-input" style="margin:0;" placeholder="6-digit code">
          <button class="modal-action-btn" style="margin-top:12px;" onclick="verifyCode('email')">Verify</button>
        </div>
      `;
      break;
      
    case 'verify_phone':
      title.textContent = 'Phone Verification';
      const phoneVerified = localStorage.getItem('phoneVerified') === 'true';
      body.innerHTML = phoneVerified ? `
        <div style="text-align:center; padding:30px;">
          <div style="font-size:64px; margin-bottom:16px;">✅</div>
          <div style="font-size:18px; font-weight:bold; color:#00b894; margin-bottom:8px;">Phone Verified</div>
          <div style="color:#b2bec3;">Your phone number has been verified.</div>
        </div>
      ` : `
        <div style="text-align:center; margin-bottom:20px;">
          <div style="font-size:48px; margin-bottom:12px;">📱</div>
          <div style="color:#b2bec3;">Verify your phone for added security</div>
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Phone Number</label>
          <input type="tel" id="verifyPhone" class="modal-input" style="margin:0;" placeholder="+95 9xxxxxxxx">
        </div>
        <button class="modal-action-btn" onclick="sendVerificationCode('phone')">Send SMS Code</button>
        <div id="phoneCodeSection" style="display:none; margin-top:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Enter Code</label>
          <input type="text" id="phoneCode" class="modal-input" style="margin:0;" placeholder="6-digit code">
          <button class="modal-action-btn" style="margin-top:12px;" onclick="verifyCode('phone')">Verify</button>
        </div>
      `;
      break;
      
    case 'verify_id':
      title.textContent = 'ID Verification';
      const idVerified = localStorage.getItem('idVerified') === 'true';
      body.innerHTML = idVerified ? `
        <div style="text-align:center; padding:30px;">
          <div style="font-size:64px; margin-bottom:16px;">✅</div>
          <div style="font-size:18px; font-weight:bold; color:#00b894; margin-bottom:8px;">ID Verified</div>
          <div style="color:#b2bec3;">Your identity has been verified.</div>
        </div>
      ` : `
        <div style="background:#1e1e2d; padding:16px; border-radius:12px; margin-bottom:16px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
            <div style="width:48px; height:48px; background:linear-gradient(135deg, #00b894, #00cec9); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px;">🛡️</div>
            <div>
              <div style="font-weight:bold;">KYC Verification</div>
              <div style="font-size:12px; color:#636e72;">Upload ID to verify identity</div>
            </div>
          </div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Full Legal Name</label>
          <input type="text" id="idName" class="modal-input" style="margin:0;" placeholder="As shown on your ID">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">ID Number</label>
          <input type="text" id="idNumber" class="modal-input" style="margin:0;" placeholder="Passport / National ID">
        </div>
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Upload ID Document</label>
          <div style="border:2px dashed #2d3436; padding:24px; text-align:center; border-radius:12px; cursor:pointer; background:#12121a;" onclick="document.getElementById('idDocInput').click()">
            <input type="file" id="idDocInput" style="display:none;" accept="image/*" onchange="handleIdFileSelect(this)">
            <span style="font-size:32px; display:block; margin-bottom:8px;">📄</span>
            <div style="font-size:13px; color:#636e72;" id="idFileLabel">Click to upload</div>
          </div>
        </div>
        <button class="modal-action-btn" onclick="submitIdVerification()">Submit for Review</button>
      `;
      break;
      
    case 'terms':
      title.textContent = 'Terms & Conditions';
      body.innerHTML = `<div style="height:200px; overflow-y:scroll; font-size:13px; color:#b2bec3;">
        <p>1. User Agreement...</p>
        <p>By using this platform, you agree to the following terms...</p>
        <p>2. Risk Warning...</p>
        <p>Crypto trading involves significant risk...</p>
      </div>`;
      break;
      
    case 'about':
      title.textContent = 'About Us';
      body.innerHTML = `
        <div style="text-align:center;">
          <h2 style="color:#00b894;">Sai Trading</h2>
          <p>Version 2.0.1</p>
          <p style="font-size:12px; color:#636e72; margin-top:10px;">The most secure crypto trading platform.</p>
        </div>
      `;
      break;
      
      // --- DERIVATIVES HELP MODAL ---
    case 'derivHelp':
      if(document.querySelector('.modal-header')) document.querySelector('.modal-header').style.display = 'flex';
      title.textContent = 'Trading Guide';
      body.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          
          <div style="background:#1e1e2d; padding:12px; border-radius:12px; border-left:4px solid #00b894;">
            <h3 style="color:#00b894; margin:0 0 6px 0; font-size:16px;">🚀 Perpetual Futures</h3>
            <p style="font-size:13px; color:#b2bec3; line-height:1.4;">
              <b>No Expiration:</b> You can hold positions as long as you want.<br>
              <b>Funding Fee:</b> Exchanged every 8 hours between Long/Short positions to keep price close to Spot price.<br>
              <b>Use Case:</b> Best for daily trading and long-term holding.
            </p>
          </div>

          <div style="background:#1e1e2d; padding:12px; border-radius:12px; border-left:4px solid #f39c12;">
            <h3 style="color:#f39c12; margin:0 0 6px 0; font-size:16px;">📅 Quarterly Futures</h3>
            <p style="font-size:13px; color:#b2bec3; line-height:1.4;">
              <b>Expiration Date:</b> Contracts settle on a specific date (e.g., Dec 29).<br>
              <b>No Funding Fee:</b> You don't pay swap/funding fees.<br>
              <b>Use Case:</b> Good for hedging or betting on price at a specific date.
            </p>
          </div>

          <div style="background:#1e1e2d; padding:12px; border-radius:12px; border-left:4px solid #6c5ce7;">
            <h3 style="color:#6c5ce7; margin:0 0 6px 0; font-size:16px;">🛡️ Options</h3>
            <p style="font-size:13px; color:#b2bec3; line-height:1.4;">
              <b>Call (Buy):</b> Profit if price goes UP.<br>
              <b>Put (Sell):</b> Profit if price goes DOWN.<br>
              <b>Risk:</b> Limited risk (only the premium paid), unlimited profit potential.
            </p>
          </div>

          <button class="modal-action-btn" onclick="closeModal()">Got it</button>
        </div>
      `;
      break;
      
      // --- TRANSACTION HISTORY (NEW DESIGN) ---
    case 'history':
      // Header ကို ဖျောက်မယ် (Custom Header သုံးမှာမို့လို့)
      if(document.querySelector('.modal-header')) {
         document.querySelector('.modal-header').style.display = 'none';
      }

      // 1. တွက်ချက်မှုများ
      const allCount = typeof userTransactions !== 'undefined' ? userTransactions.length : 0;
      const depCount = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.type === 'Deposit').length : 0;
      const witCount = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.type === 'Withdraw').length : 0;
      const penCount = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.status === 'Pending').length : 0;

      const totalDep = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.type === 'Deposit').reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;
      const totalWit = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.type === 'Withdraw').reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;
      const totalPen = typeof userTransactions !== 'undefined' ? userTransactions.filter(t => t.status === 'Pending').reduce((sum, t) => sum + parseFloat(t.amount), 0) : 0;

      // 2. UI ပိုင်း (Screenshot အတိုင်း)
      body.innerHTML = `
        <div class="history-nav">
          <div style="display:flex; align-items:center; gap:10px;">
            <button onclick="closeModal(); document.querySelector('.modal-header').style.display='flex';" style="background:none; border:none; color:white; font-size:20px;">←</button>
            <span class="history-title">Transaction History</span>
          </div>
          <div class="history-actions">
            <button onclick="openModal('filter')" style="font-size:20px;">🌪️</button>
            <button id="historyRefreshBtn" onclick="animateRefresh()" style="font-size:20px; background:none; border:none; color:white; cursor:pointer;">↻</button>
          </div>
        </div>

        <div class="history-tabs">
          <div class="h-tab active" onclick="filterHistory('All', this)">All <span style="font-size:10px; opacity:0.7;">(${allCount})</span></div>
          <div class="h-tab" onclick="filterHistory('Deposit', this)">Deposit <span style="font-size:10px; opacity:0.7;">(${depCount})</span></div>
          <div class="h-tab" onclick="filterHistory('Withdraw', this)">Withdraw <span style="font-size:10px; opacity:0.7;">(${witCount})</span></div>
          <div class="h-tab" onclick="filterHistory('Pending', this)">Pending <span style="font-size:10px; opacity:0.7;">(${penCount})</span></div>
        </div>

        <div class="wallet-card">
          <div class="wallet-label">
            <span style="background:rgba(255,255,255,0.2); padding:4px; border-radius:50%;">💰</span>
            Wallet Balance
          </div>
          <div class="wallet-amount">$${userWallet.usdt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
          <div style="font-size:10px; opacity:0.7; margin-top:4px; text-align:right;">● updated just now</div>
        </div>

        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-icon icon-blue">📥</div>
            <div class="stat-info">
              <span class="stat-title">Total Deposits</span>
              <span class="stat-val">$${totalDep.toLocaleString()}</span>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-icon icon-indigo">📤</div>
            <div class="stat-info">
              <span class="stat-title">Total Withdrawals</span>
              <span class="stat-val">$${totalWit.toLocaleString()}</span>
            </div>
          </div>
          <div class="stat-box">
            <div class="stat-icon icon-orange">🕒</div>
            <div class="stat-info">
              <span class="stat-title">Pending</span>
              <span class="stat-val">$${totalPen.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:10px; font-weight:600; font-size:16px; display:flex; justify-content:space-between;">
          <span>Recent Transactions</span>
          <span style="font-size:12px; color:#636e72;">${allCount} records</span>
        </div>
        
        <div class="history-list" id="historyListContainer">
          ${renderHistoryList('All')} 
        </div>
      `;
      break;

    // --- FILTER MODAL ---
    case 'filter':
      if(document.querySelector('.modal-header')) document.querySelector('.modal-header').style.display = 'flex';
      title.textContent = 'Filter Transactions';
      body.innerHTML = `
        <div class="filter-group">
          <label class="filter-label">Date Range</label>
          <div style="display:flex; gap:10px;">
            <input type="date" class="modal-input" style="flex:1;">
            <span style="align-self:center;">to</span>
            <input type="date" class="modal-input" style="flex:1;">
          </div>
        </div>
        <div class="filter-group">
          <label class="filter-label">Status</label>
          <div class="filter-tags">
            <div class="filter-tag active" onclick="this.classList.toggle('active')">Completed</div>
            <div class="filter-tag" onclick="this.classList.toggle('active')">Pending</div>
            <div class="filter-tag" onclick="this.classList.toggle('active')">Failed</div>
          </div>
        </div>
        <button class="modal-action-btn" onclick="openModal('history')">Apply Filters</button>
      `;
      break;

    // --- TRANSFER ASSETS (Fixed Modal) ---
    case 'transfer':
      if(document.querySelector('.modal-header')) {
         document.querySelector('.modal-header').style.display = 'flex';
      }
      title.textContent = 'Transfer Assets';
      
      body.innerHTML = `
        <div style="background:#1e1e2d; border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#636e72; font-size:12px;">From</span>
              <div style="background:#12121a; padding:8px 12px; border-radius:8px; font-weight:bold;">Spot Wallet</div>
            </div>
            <div style="align-self:center; color:#00b894; font-size:20px;">↓</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#636e72; font-size:12px;">To</span>
              <div style="background:#12121a; padding:8px 12px; border-radius:8px; font-weight:bold;">Futures Wallet</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom:16px;">
          <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Amount (USDT)</label>
          <div style="position:relative;">
             <input type="number" id="transferAmount" class="modal-input" placeholder="Min 10" style="margin:0;">
             <span onclick="document.getElementById('transferAmount').value = ${userWallet.usdt}" style="position:absolute; right:12px; top:12px; color:#00b894; font-size:12px; cursor:pointer;">MAX</span>
          </div>
          <div style="font-size:11px; color:#636e72; margin-top:4px;">Spot Available: ${userWallet.usdt.toFixed(2)} USDT</div>
        </div>
        
        <button class="modal-action-btn" onclick="performTransfer()">Confirm Transfer</button>
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
// User Data & Transactions Initialization
let userWallet = JSON.parse(localStorage.getItem('cryptoUserWallet')) || {
  usdt: 10000.00,        // Spot Balance
  futuresUsdt: 0.00,     // Futures Balance (အသစ်တိုးတာ)
  holdings: {}
};

let userTransactions = JSON.parse(localStorage.getItem('userTransactions')) || [];

function saveWallet() {
  localStorage.setItem('cryptoUserWallet', JSON.stringify(userWallet));
  localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
  updateAssetsUI();
}

// Transaction အသစ်ထည့်တဲ့ Helper Function
function addTransaction(type, amount, coin, status = 'Completed') {
  const newTx = {
    id: 'TX' + Date.now().toString().slice(-6),
    type: type, // 'Deposit', 'Withdraw', 'Transfer', 'Buy', 'Sell'
    amount: amount,
    coin: coin,
    status: status,
    date: new Date().toLocaleString()
  };
  userTransactions.unshift(newTx); // အသစ်ဆုံးကို ထိပ်ဆုံးပို့
  saveWallet();
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
  // 1. Balance Update (USDT)
  const balanceEl = document.querySelector('.asset-box h1');
  const approxEl = document.querySelector('.asset-box p:nth-of-type(2)');
  const usdtBalanceEl = document.getElementById('assetUsdtBalance');

  if (balanceEl) balanceEl.textContent = userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });
  if (approxEl) approxEl.textContent = `≈ $${userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  if (usdtBalanceEl) usdtBalanceEl.textContent = userWallet.usdt.toLocaleString('en-US', { minimumFractionDigits: 2 });

  // 2. Asset List Rendering (ဒီနေရာက Assets Tab အတွက် သီးသန့်ပါ)
  const container = document.getElementById('assetsListContainer');
  
  // Assets Tab အတွက်ပဲ သုံးမယ့် ပုံသေ Logo များ
  const stableIcons = {
    'BTC': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/128px-Bitcoin.svg.png',
    'ETH': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Ethereum_logo_2014.svg/128px-Ethereum_logo_2014.svg.png',
    'USDT': 'https://seeklogo.com/images/T/tether-usdt-logo-FA55C7F397-seeklogo.com.png',
    'BNB': 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Binance-coin-bnb-logo.png',
    'SOL': 'https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png',
    'XRP': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ripple_logo.svg/128px-Ripple_logo.svg.png',
    'DOGE': 'https://upload.wikimedia.org/wikipedia/en/d/d0/Dogecoin_Logo.png'
  };

  // USDT (Main Item)
  let listHTML = `
    <div class="asset-item" style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #1e1e2d;">
      <div class="asset-left" style="display:flex; align-items:center; gap:12px;">
        <img src="${stableIcons['USDT']}" style="width:36px; height:36px; border-radius:50%;">
        <div>
          <div style="font-weight:bold; color:white;">USDT</div>
          <div style="font-size:12px; color:#636e72;">Tether</div>
        </div>
      </div>
      <div class="asset-right" style="text-align:right;">
        <div style="font-weight:bold; color:white;">${userWallet.usdt.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
        <div style="font-size:12px; color:#b2bec3;">$1.00</div>
      </div>
    </div>
  `;

  // ဝယ်ထားတဲ့ Coin တွေကို List ထုတ်မယ်
  for (const [symbol, amount] of Object.entries(userWallet.holdings)) {
    if (amount > 0) {
       const coinInfo = allPrices.find(c => c.symbol === symbol) || { name: symbol, price: 0, image: '' };
       const valueUSD = amount * coinInfo.price;
       
       // Assets Tab အတွက်ပဲ Stable Link သုံးမယ်
       const iconUrl = stableIcons[symbol] || coinInfo.image || 'https://via.placeholder.com/36';

       listHTML += `
        <div class="asset-item" onclick="showCoinDetail('${symbol}')" style="display:flex; justify-content:space-between; align-items:center; padding:15px 0; border-bottom:1px solid #1e1e2d;">
          <div class="asset-left" style="display:flex; align-items:center; gap:12px;">
            <img src="${iconUrl}" style="width:36px; height:36px; border-radius:50%; object-fit:contain; background:white; padding:2px;">
            <div>
              <div style="font-weight:bold; color:white;">${symbol}</div>
              <div style="font-size:12px; color:#636e72;">${coinInfo.name}</div>
            </div>
          </div>
          <div class="asset-right" style="text-align:right;">
            <div style="font-weight:bold; color:white;">${amount.toFixed(4)}</div>
            <div style="font-size:12px; color:#b2bec3;">$${valueUSD.toLocaleString('en-US', {maximumFractionDigits: 2})}</div>
          </div>
        </div>
       `;
    }
  }

  if (container) container.innerHTML = listHTML;
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

// --- THEME & LANGUAGE LOGIC ---

function toggleTheme() {
  const body = document.body;
  const label = document.getElementById('theme-label');
  
  body.classList.toggle('light-mode');
  
  if (body.classList.contains('light-mode')) {
    label.textContent = 'Light';
    localStorage.setItem('theme', 'light');
  } else {
    label.textContent = 'Dark';
    localStorage.setItem('theme', 'dark');
  }
}

// Language Translation Data
const translations = {
  'English': {
    home: 'Home', quotes: 'Quotes', coins: 'Coins', trading: 'Trading',
    derivatives: 'Derivatives', assets: 'Assets', mine: 'Mine',
    darkLight: 'Dark / Light Theme', security: 'Security Settings',
    payment: 'Payment Methods', notifications: 'Notifications',
    language: 'Language', support: 'Customer Support', terms: 'Terms & Conditions',
    about: 'About Us', logout: 'Log Out', totalBalance: 'Total Balance (BTC)',
    deposit: 'Deposit', withdraw: 'Withdraw', transfer: 'Transfer',
    emailVerify: 'Email Verification', phoneVerify: 'Phone Verification',
    idVerify: 'ID Verification', verified: 'Verified', notVerified: 'Not Verified'
  },
  'Myanmar': {
    home: 'ပင်မ', quotes: 'စျေးနှုန်း', coins: 'ဒင်္ဂါးများ', trading: 'အရောင်းအဝယ်',
    derivatives: 'ဒီရီဗေးတစ်', assets: 'ပိုင်ဆိုင်မှု', mine: 'ကျွန်ုပ်',
    darkLight: 'အမှောင် / အလင်း', security: 'လုံခြုံရေး ဆက်တင်',
    payment: 'ငွေပေးချေမှု', notifications: 'အကြောင်းကြားချက်',
    language: 'ဘာသာစကား', support: 'ဖောက်သည် ဝန်ဆောင်မှု', terms: 'စည်းကမ်းချက်များ',
    about: 'ကျွန်ုပ်တို့ အကြောင်း', logout: 'ထွက်မည်', totalBalance: 'စုစုပေါင်း လက်ကျန် (BTC)',
    deposit: 'ငွေသွင်း', withdraw: 'ငွေထုတ်', transfer: 'လွှဲပြောင်း',
    emailVerify: 'အီးမေးလ် အတည်ပြုခြင်း', phoneVerify: 'ဖုန်း အတည်ပြုခြင်း',
    idVerify: 'ID အတည်ပြုခြင်း', verified: 'အတည်ပြုပြီး', notVerified: 'မအတည်ပြုရသေး'
  },
  'Chinese': {
    home: '首页', quotes: '行情', coins: '币种', trading: '交易',
    derivatives: '衍生品', assets: '资产', mine: '我的',
    darkLight: '深色 / 浅色主题', security: '安全设置',
    payment: '支付方式', notifications: '通知',
    language: '语言', support: '客户服务', terms: '条款与条件',
    about: '关于我们', logout: '退出', totalBalance: '总余额 (BTC)',
    deposit: '充值', withdraw: '提现', transfer: '转账',
    emailVerify: '邮箱验证', phoneVerify: '手机验证',
    idVerify: '身份验证', verified: '已验证', notVerified: '未验证'
  }
};

function setLanguage(lang) {
  const langLabel = document.getElementById('current-lang');
  if (langLabel) {
    langLabel.textContent = lang + ' ›';
  }
  localStorage.setItem('selectedLanguage', lang);
  
  // Apply translations
  applyTranslations(lang);
  closeModal();
}

function applyTranslations(lang) {
  const t = translations[lang] || translations['English'];
  
  // Nav items
  const navItems = document.querySelectorAll('.nav-item span:last-child');
  const navKeys = ['home', 'quotes', 'coins', 'trading', 'derivatives', 'assets', 'mine'];
  navItems.forEach((item, i) => {
    if (navKeys[i] && t[navKeys[i]]) item.textContent = t[navKeys[i]];
  });
  
  // Mine page menu items
  const menuItems = document.querySelectorAll('.menu-item span:nth-child(2)');
  const menuKeys = ['darkLight', 'security', 'payment', 'notifications', 'language', 'support', 'terms', 'about'];
  menuItems.forEach((item, i) => {
    if (menuKeys[i] && t[menuKeys[i]]) item.textContent = t[menuKeys[i]];
  });
  
  // Logout button
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) logoutBtn.textContent = t.logout;
  
  // Assets page buttons
  const depositBtn = document.querySelector('.asset-action-btn:nth-child(1) span');
  const withdrawBtn = document.querySelector('.asset-action-btn:nth-child(2) span');
  const transferBtn = document.querySelector('.asset-action-btn:nth-child(3) span');
  
  // Verification items
  const verifyItems = document.querySelectorAll('.verify-item span:first-child');
  const verifyKeys = ['emailVerify', 'phoneVerify', 'idVerify'];
  verifyItems.forEach((item, i) => {
    if (verifyKeys[i] && t[verifyKeys[i]]) item.textContent = t[verifyKeys[i]];
  });
}

// --- CHAT MESSAGE FUNCTION ---
function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const container = document.getElementById('chatContainer');
  if (!input || !container || !input.value.trim()) return;
  
  const message = input.value.trim();
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  container.innerHTML += `
    <div style="display:flex; gap:8px; margin-bottom:12px; justify-content:flex-end;">
      <div style="text-align:right;">
        <div style="font-size:11px; color:#636e72; margin-bottom:4px;">You • ${time}</div>
        <div style="background:#00b894; padding:10px 14px; border-radius:12px 0 12px 12px; font-size:13px; max-width:220px; display:inline-block;">
          ${message}
        </div>
      </div>
    </div>
  `;
  
  input.value = '';
  container.scrollTop = container.scrollHeight;
  
  setTimeout(() => {
    container.innerHTML += `
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <div style="width:32px; height:32px; background:#00b894; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0;">🤖</div>
        <div>
          <div style="font-size:11px; color:#636e72; margin-bottom:4px;">Support Bot • ${time}</div>
          <div style="background:#2d3436; padding:10px 14px; border-radius:0 12px 12px 12px; font-size:13px; max-width:220px;">
            Thank you for your message! A support agent will respond shortly. Average wait time: 2-3 minutes.
          </div>
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;
  }, 1000);
}

// --- FILE SELECT FOR KYC ---
function handleFileSelect(input) {
  const label = document.getElementById('fileLabel');
  if (input.files && input.files[0] && label) {
    label.textContent = '✅ ' + input.files[0].name;
    label.style.color = '#00b894';
  }
}

function submitVerification() {
  alert('✅ Your documents have been submitted for review. You will be notified within 24-48 hours.');
  closeModal();
}

// --- AI BOT TOGGLE ---
let isBotRunning = false;

function toggleAIBot() {
  const indicator = document.getElementById('botStatusIndicator');
  const btn = document.getElementById('startBotBtn');
  const investment = document.getElementById('botInvestment')?.value || 500;
  
  if (!indicator || !btn) return;
  
  isBotRunning = !isBotRunning;
  
  if (isBotRunning) {
    indicator.innerHTML = `
      <span style="width:10px; height:10px; background:#00b894; border-radius:50%; animation: pulse 1s infinite;"></span>
      <span style="color:#00b894; font-weight:bold;">Running</span>
    `;
    btn.textContent = '⏹️ Stop AI Bot';
    btn.style.background = '#ff6b6b';
    alert(`✅ AI Bot started with $${investment} USDT investment!`);
  } else {
    indicator.innerHTML = `
      <span style="width:10px; height:10px; background:#ff6b6b; border-radius:50%;"></span>
      <span style="color:#ff6b6b; font-weight:bold;">Stopped</span>
    `;
    btn.textContent = '🚀 Start AI Bot';
    btn.style.background = '#00b894';
  }
}

// --- FIAT DEPOSIT FUNCTIONS ---
const fiatRates = {
  'MMK': 4500,
  'USD': 1,
  'THB': 35,
  'CNY': 7.2
};

function switchFiatTab(tab, btn) {
  document.querySelectorAll('.fiat-tab').forEach(b => {
    b.style.background = '#1e1e2d';
    b.style.color = '#b2bec3';
    b.style.border = '1px solid #2d3436';
  });
  btn.style.background = '#00b894';
  btn.style.color = 'white';
  btn.style.border = 'none';
  
  const title = document.getElementById('modalTitle');
  if (title) {
    title.textContent = tab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds';
  }
}

function updateFiatRate() {
  const currency = document.getElementById('fiatCurrency')?.value || 'MMK';
  const rateEl = document.getElementById('fiatRate');
  const labelEl = document.getElementById('fiatCurrencyLabel');
  
  if (rateEl) {
    rateEl.textContent = `1 USDT = ${fiatRates[currency].toLocaleString()} ${currency}`;
  }
  if (labelEl) {
    labelEl.textContent = currency;
  }
  calculateFiatToUsdt();
}

function calculateFiatToUsdt() {
  const currency = document.getElementById('fiatCurrency')?.value || 'MMK';
  const amount = parseFloat(document.getElementById('fiatAmount')?.value) || 0;
  const receiveEl = document.getElementById('fiatReceive');
  
  const usdt = amount / fiatRates[currency];
  
  if (receiveEl) {
    receiveEl.textContent = usdt.toFixed(2) + ' USDT';
  }
}

function processFiatDeposit() {
  const currency = document.getElementById('fiatCurrency')?.value || 'MMK';
  const amount = parseFloat(document.getElementById('fiatAmount')?.value) || 0;
  const usdt = amount / fiatRates[currency];
  
  if (amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  alert(`✅ Deposit request submitted!\n\nAmount: ${amount.toLocaleString()} ${currency}\nYou will receive: ${usdt.toFixed(2)} USDT\n\nPlease complete payment within 30 minutes.`);
  closeModal();
}

// App စဖွင့်ရင် Theme နဲ့ Language အဟောင်းကို ပြန်ယူမယ်
document.addEventListener('DOMContentLoaded', function() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    const label = document.getElementById('theme-label');
    if(label) label.textContent = 'Light';
  }
  
  const savedLang = localStorage.getItem('selectedLanguage');
  if (savedLang) {
    const langLabel = document.getElementById('current-lang');
    if (langLabel) langLabel.textContent = savedLang + ' ›';
    applyTranslations(savedLang);
  }
  
  updateVerificationStatus();
});

// --- MINE TAB FUNCTIONS ---

function saveProfile() {
  const username = document.getElementById('editUsername')?.value || 'User';
  const email = document.getElementById('editEmail')?.value || '';
  const phone = document.getElementById('editPhone')?.value || '';
  
  localStorage.setItem('cryptoUser', username);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userPhone', phone);
  
  updateProfileUI(username);
  alert('✅ Profile updated successfully!');
  closeModal();
}

function sendVerificationCode(type) {
  const section = document.getElementById(`${type}CodeSection`);
  if (section) {
    section.style.display = 'block';
  }
  alert(`✅ Verification code sent to your ${type}!`);
}

function verifyCode(type) {
  const code = document.getElementById(`${type}Code`)?.value || '';
  if (code.length === 6) {
    localStorage.setItem(`${type}Verified`, 'true');
    alert(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} verified successfully!`);
    updateVerificationStatus();
    closeModal();
  } else {
    alert('❌ Invalid code. Please enter 6 digits.');
  }
}

function handleIdFileSelect(input) {
  const label = document.getElementById('idFileLabel');
  if (input.files && input.files[0] && label) {
    label.textContent = '✅ ' + input.files[0].name;
    label.style.color = '#00b894';
  }
}

function submitIdVerification() {
  const name = document.getElementById('idName')?.value || '';
  const idNum = document.getElementById('idNumber')?.value || '';
  
  if (!name || !idNum) {
    alert('❌ Please fill in all fields');
    return;
  }
  
  localStorage.setItem('idVerified', 'true');
  alert('✅ ID verification submitted! You will be notified within 24-48 hours.');
  updateVerificationStatus();
  closeModal();
}

function updateVerificationStatus() {
  const emailStatus = document.getElementById('status-email');
  const phoneStatus = document.getElementById('status-phone');
  const idStatus = document.getElementById('status-id');
  
  if (emailStatus) {
    const verified = localStorage.getItem('emailVerified') === 'true';
    emailStatus.textContent = verified ? '✓ Verified' : 'Not Verified';
    emailStatus.className = verified ? 'verified' : 'not-verified';
  }
  if (phoneStatus) {
    const verified = localStorage.getItem('phoneVerified') === 'true';
    phoneStatus.textContent = verified ? '✓ Verified' : 'Not Verified';
    phoneStatus.className = verified ? 'verified' : 'not-verified';
  }
  if (idStatus) {
    const verified = localStorage.getItem('idVerified') === 'true';
    idStatus.textContent = verified ? '✓ Verified' : 'Not Verified';
    idStatus.className = verified ? 'verified' : 'not-verified';
  }
}

function toggleSecuritySetting(setting, enabled) {
  localStorage.setItem(`${setting}Enabled`, enabled.toString());
  const msg = enabled ? 'enabled' : 'disabled';
  const settingName = setting === 'twoFA' ? '2FA Authentication' : 'Biometric Login';
  alert(`✅ ${settingName} ${msg}`);
}

function changePassword() {
  const current = document.getElementById('currentPass')?.value || '';
  const newPass = document.getElementById('newPass')?.value || '';
  const confirm = document.getElementById('confirmPass')?.value || '';
  
  if (!current || !newPass || !confirm) {
    alert('❌ Please fill in all fields');
    return;
  }
  if (newPass !== confirm) {
    alert('❌ New passwords do not match');
    return;
  }
  if (newPass.length < 6) {
    alert('❌ Password must be at least 6 characters');
    return;
  }
  
  alert('✅ Password changed successfully!');
  closeModal();
}

let selectedPaymentType = '';

function selectPaymentType(type) {
  selectedPaymentType = type;
  document.querySelectorAll('.pay-type-option').forEach(el => {
    el.style.border = '2px solid transparent';
  });
  const selected = document.getElementById(`payType-${type}`);
  if (selected) {
    selected.style.border = '2px solid #00b894';
  }
  document.getElementById('cardDetails').style.display = 'block';
}

function addPaymentMethod() {
  if (!selectedPaymentType) {
    alert('❌ Please select a payment type');
    return;
  }
  const number = document.getElementById('paymentNumber')?.value || '';
  if (!number || number.length < 4) {
    alert('❌ Please enter a valid number');
    return;
  }
  
  const payments = JSON.parse(localStorage.getItem('paymentMethods')) || [];
  payments.push({
    type: selectedPaymentType,
    last4: number.slice(-4)
  });
  localStorage.setItem('paymentMethods', JSON.stringify(payments));
  
  alert('✅ Payment method added!');
  openModal('payment');
}

function removePaymentMethod(index) {
  const payments = JSON.parse(localStorage.getItem('paymentMethods')) || [];
  payments.splice(index, 1);
  localStorage.setItem('paymentMethods', JSON.stringify(payments));
  openModal('payment');
}

function saveNotificationSetting(setting, enabled) {
  const settings = JSON.parse(localStorage.getItem('notificationSettings')) || {
    priceAlerts: true, news: false, orderStatus: true, promotions: false
  };
  settings[setting] = enabled;
  localStorage.setItem('notificationSettings', JSON.stringify(settings));
}

// --- FIAT / ASSET MODAL HELPER FUNCTIONS (UPDATED) ---

// 1. Data Structure (Coin အချက်အလက်များ)
const coinData = {
  'USDT-TRC20': { network: 'TRC20', min: '10 USDT', fee: '1 USDT', address: 'TQvsNj8U9U67HHX5ayoSQkLw3jb4J3' },
  'USDT-ERC20': { network: 'ERC20', min: '10 USDT', fee: '5 USDT', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
  'BTC-Bitcoin': { network: 'Bitcoin', min: '0.001 BTC', fee: '0.0005 BTC', address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
  'ETH-ERC20':   { network: 'ERC20', min: '0.01 ETH', fee: '0.002 ETH', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
  'USDC-BEP20':  { network: 'BEP20', min: '10 USDC', fee: '0.5 USDC', address: '0x55d398326f99059fF775485246999027B3197955' }
};

// 2. Tab Style Update (Tab အရောင်ပြောင်းပေးမည့် Function)
function updateFiatTabs(activeMode) {
  const depBtn = document.getElementById('btn-fiat-deposit');
  const witBtn = document.getElementById('btn-fiat-withdraw');
  
  if(activeMode === 'deposit') {
    if(depBtn) { depBtn.style.background = '#00b894'; depBtn.style.color = 'white'; depBtn.style.border = 'none'; }
    if(witBtn) { witBtn.style.background = '#1e1e2d'; witBtn.style.color = '#b2bec3'; witBtn.style.border = '1px solid #2d3436'; }
  } else {
    if(depBtn) { depBtn.style.background = '#1e1e2d'; depBtn.style.color = '#b2bec3'; depBtn.style.border = '1px solid #2d3436'; }
    if(witBtn) { witBtn.style.background = '#00b894'; witBtn.style.color = 'white'; witBtn.style.border = 'none'; }
  }
}

// 3. Render Deposit Menu (Coin ၅ မျိုးလုံးပါသည်)
function renderDepositMenu() {
  const container = document.getElementById('fiatContentArea');
  const title = document.getElementById('modalTitle');
  const header = document.getElementById('fiatTabHeader');
  
  if(title) title.textContent = 'Deposit Coins';
  // Header ကို ပြန်ဖော်မယ်
  if(header) header.style.display = 'flex';
  
  updateFiatTabs('deposit');

  if (!container) return;

  container.innerHTML = `
    <div style="margin-bottom:12px; color:#636e72; font-size:12px;">Please select recharge channel:</div>
    
    <div class="fiat-menu-item" onclick="showDepositDetail('USDT-TRC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-TRC20</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showDepositDetail('USDT-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-ERC20</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showDepositDetail('BTC-Bitcoin')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#f7931a;">₿</div>
        <span style="font-weight:600;">BTC-Bitcoin</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showDepositDetail('ETH-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#627eea;">Ξ</div>
        <span style="font-weight:600;">ETH-ERC20</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showDepositDetail('USDC-BEP20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#2980b9;">$</div>
        <span style="font-weight:600;">USDC-BEP20</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="switchToService()">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#0984e3;">💳</div>
        <span style="font-weight:600;">Bank card recharge</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>
  `;
}

// 4. Show Deposit Detail View (Important စာသား အမှန်ပြင်ထားသည်)
function showDepositDetail(coinType) {
  const container = document.getElementById('fiatContentArea');
  const header = document.getElementById('fiatTabHeader');
  
  // Header ကို ဖျောက်မယ် (အရေးကြီးဆုံးအချက်)
  if(header) header.style.display = 'none';

  const data = coinData[coinType] || coinData['USDT-TRC20'];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.address}`;

  container.innerHTML = `
    <div class="modal-sub-header">
      <button class="back-btn" onclick="renderDepositMenu()">←</button>
      <span style="font-weight:bold; font-size:16px;">Deposit ${coinType}</span>
    </div>

    <div style="margin-bottom:6px; font-size:13px; color:#b2bec3;">Wallet Address:</div>
    <div class="address-container">
      <div class="address-text">${data.address}</div>
      <button class="copy-btn" onclick="navigator.clipboard.writeText('${data.address}'); alert('Copied!');">❐</button>
    </div>

    <div class="qr-wrapper">
      <img src="${qrUrl}" alt="QR Code">
    </div>

    <div style="margin-bottom:12px;">
      <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Number of deposits:</label>
      <input type="number" class="modal-input" placeholder="Please enter deposit amount">
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Trading account email:</label>
      <input type="email" class="modal-input" placeholder="Please enter your email">
    </div>

    <div style="margin-bottom:6px; font-size:13px; color:#b2bec3;">Upload a picture:</div>
    <div class="upload-box" onclick="document.getElementById('depFile').click()">
      <input type="file" id="depFile" hidden onchange="alert('Image selected: ' + this.files[0].name)">
      <div style="font-size:24px; color:#b2bec3;">+</div>
      <div style="font-size:12px; color:#636e72;">click to upload pictures</div>
    </div>

    <button class="modal-action-btn" style="background:#0984e3;" onclick="alert('Screenshot uploaded! Waiting for approval.')">
      Upload Transfer Screenshot
    </button>

    <div class="warning-box">
      <div style="color:#f39c12; font-weight:bold; font-size:13px; margin-bottom:8px;">Important:</div>
      <ul class="warning-list">
        <li>Only send <span style="color:white; font-weight:bold;">${coinType.split('-')[0]}</span> to this address.</li>
        <li>Minimum deposit: <span style="color:white; font-weight:bold;">${data.min}</span>.</li>
        <li>Network fees may apply.</li>
        <li>Deposits are usually confirmed within 10-30 minutes.</li>
      </ul>
    </div>
  `;
}

function renderWithdrawMenu() {
  const container = document.getElementById('fiatContentArea');
  const title = document.getElementById('modalTitle');
  const header = document.getElementById('fiatTabHeader');
  
  if(title) title.textContent = 'Withdraw Funds';
  if(header) header.style.display = 'flex';
  
  updateFiatTabs('withdraw');

  if (!container) return;

  container.innerHTML = `
    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDT-TRC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-TRC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDT-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#26a17b;">T</div>
        <span style="font-weight:600;">USDT-ERC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('BTC-Bitcoin')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#f7931a;">₿</div>
        <span style="font-weight:600;">BTC-Bitcoin Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('ETH-ERC20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#627eea;">Ξ</div>
        <span style="font-weight:600;">ETH-ERC20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>
    
    <div class="fiat-menu-item" onclick="showWithdrawDetail('USDC-BEP20')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#2980b9;">$</div>
        <span style="font-weight:600;">USDC-BEP20 Withdrawal</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>

    <div class="fiat-menu-item" onclick="showWithdrawDetail('Other')">
      <div style="display:flex; align-items:center;">
        <div class="fiat-icon-circle" style="background:#6c5ce7;">+</div>
        <span style="font-weight:600;">Other</span>
      </div>
      <span style="color:#636e72;">›</span>
    </div>
  `;
}

// 6. Other Withdraw Detail View
function showWithdrawDetail(coinType = 'Other') {
  const container = document.getElementById('fiatContentArea');
  const header = document.getElementById('fiatTabHeader');
  
  // Header ကို ဖျောက်မယ်
  if(header) header.style.display = 'none';
  
  container.innerHTML = `
    <div class="modal-sub-header">
      <button class="back-btn" onclick="renderWithdrawMenu()">←</button>
      <span style="font-weight:bold; font-size:16px;">Other Withdrawal</span>
    </div>

    <div style="background:#1e1e2d; padding:16px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:12px; color:#b2bec3;">Available Balance:</div>
        <div style="font-size:18px; color:#ff6b6b; font-weight:bold;">${userWallet.usdt.toFixed(4)} USDT</div>
      </div>
      <button style="background:#2d3436; border:none; color:white; padding:8px; border-radius:6px;">↻</button>
    </div>

    <div style="margin-bottom:12px;">
      <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Withdrawal Type</label>
      <input type="text" class="modal-input" placeholder="Enter withdrawal type (e.g., LTC, XRP)">
    </div>

    <div style="margin-bottom:6px; font-size:13px; color:#b2bec3;">Withdrawal Details (QR/Screenshot)</div>
    <div class="upload-box" style="padding:20px;" onclick="document.getElementById('wdFile').click()">
      <input type="file" id="wdFile" hidden onchange="alert('Image selected')">
      <div style="font-size:24px; color:#b2bec3;">☁️</div>
      <div style="font-size:12px; color:#636e72;">Click to upload withdrawal details</div>
    </div>

    <div style="margin-bottom:12px;">
      <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Withdrawal Address</label>
      <input type="text" class="modal-input" placeholder="Enter withdrawal address">
    </div>

    <div style="margin-bottom:16px;">
      <label style="display:block; font-size:13px; color:#b2bec3; margin-bottom:6px;">Amount</label>
      <div style="display:flex; gap:8px;">
        <input type="number" class="modal-input" placeholder="Enter withdrawal amount" style="margin:0;">
        <button onclick="alert('All selected')" style="background:#00b894; border:none; color:white; padding:0 16px; border-radius:10px; font-weight:bold;">All</button>
      </div>
      <div style="font-size:10px; color:#f39c12; margin-top:4px;">Minimum withdrawal: 10.00 USDT</div>
    </div>

    <div style="background:#1e1e2d; padding:12px; border-radius:8px; display:flex; justify-content:space-between; margin-bottom:16px;">
      <span style="color:#b2bec3; font-size:13px;">Arrival Quantity:</span>
      <div style="text-align:right;">
        <div style="color:#00b894; font-weight:bold;">0.0 USDT</div>
        <div style="font-size:10px; color:#636e72;">Fee: 2% USDT</div>
      </div>
    </div>

    <button class="modal-action-btn" onclick="alert('Withdrawal request submitted!')">Confirm Withdrawal</button>
  `;
}

// 7. Switch to Service Modal
function switchToService() {
  closeModal();
  setTimeout(() => {
    openModal('service');
  }, 200);
}

// --- FINAL HELPER FUNCTIONS FOR HISTORY & TRANSFER ---

// 1. Tab Switching Logic
function filterHistory(filterType, btnElement) {
  if (btnElement) {
    document.querySelectorAll('.h-tab').forEach(t => t.classList.remove('active'));
    btnElement.classList.add('active');
  }
  const container = document.getElementById('historyListContainer');
  if (container) {
    container.innerHTML = renderHistoryList(filterType);
  }
}

// 2. Render List with Filter Support
function renderHistoryList(filterType = 'All') {
  if (typeof userTransactions === 'undefined' || userTransactions.length === 0) {
    return `<div style="text-align:center; padding:40px; color:#636e72;">
      <div style="font-size:30px; margin-bottom:10px;">📝</div>
      No transactions yet
    </div>`;
  }

  const filtered = userTransactions.filter(tx => {
    if (filterType === 'All') return true;
    if (filterType === 'Deposit') return tx.type === 'Deposit';
    if (filterType === 'Withdraw') return tx.type === 'Withdraw';
    if (filterType === 'Pending') return tx.status === 'Pending';
    return true;
  });

  if (filtered.length === 0) {
    return `<div style="text-align:center; padding:40px; color:#636e72;">No ${filterType} records found</div>`;
  }

  return filtered.map(tx => {
    let icon = '🔄';
    let color = '#ffffff';
    let sign = '';
    
    if (tx.type === 'Deposit') { icon = '📥'; color = '#00b894'; sign = '+'; }
    if (tx.type === 'Withdraw') { icon = '📤'; color = '#ff6b6b'; sign = '-'; }
    if (tx.type === 'Transfer') { icon = '↔️'; }

    return `
      <div class="history-item">
        <div class="h-left">
          <div class="h-icon" style="background:rgba(255,255,255,0.1);">${icon}</div>
          <div>
            <div class="h-type">${tx.type}</div>
            <div class="h-date">${tx.date}</div>
          </div>
        </div>
        <div>
          <div class="h-amount" style="color:${color};">${sign}${parseFloat(tx.amount).toLocaleString()} ${tx.coin}</div>
          <div class="h-status status-${tx.status.toLowerCase()}">${tx.status}</div>
        </div>
      </div>
    `;
  }).join('');
}

// 3. Perform Transfer
function performTransfer() {
  const amount = parseFloat(document.getElementById('transferAmount').value);
  if (!amount || amount <= 0) { alert('❌ Invalid amount'); return; }
  if (amount > userWallet.usdt) { alert('❌ Insufficient Spot Balance'); return; }

  userWallet.usdt -= amount;
  if(!userWallet.futuresUsdt) userWallet.futuresUsdt = 0;
  userWallet.futuresUsdt += amount;
  
  addTransaction('Transfer', amount, 'USDT', 'Completed');
  alert(`✅ Successfully transferred ${amount} USDT to Futures Wallet!`);
  closeModal();
}

// 4. Add Transaction Helper
function addTransaction(type, amount, coin, status = 'Completed') {
  if (typeof userTransactions === 'undefined') { window.userTransactions = []; }
  
  const newTx = {
    id: 'TX' + Date.now().toString().slice(-6),
    type: type,
    amount: amount,
    coin: coin,
    status: status,
    date: new Date().toLocaleDateString()
  };
  
  userTransactions.unshift(newTx);
  localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
  localStorage.setItem('cryptoUserWallet', JSON.stringify(userWallet));
  updateAssetsUI();
}

function animateRefresh() {
  const btn = document.getElementById('historyRefreshBtn');
  if(btn) {
    btn.style.transition = 'transform 0.5s ease-in-out';
    btn.style.transform = 'rotate(360deg)';
  }
  
  // 0.5 စက္ကန့်နေရင် Refresh လုပ်မယ်၊ ပြီးရင် Notification ပြမယ်
  setTimeout(() => {
    openModal('history'); 
    
    // Toast Notification (အပေါ်ကနေ စာတန်းလေး ကျလာမယ်)
    showToast('Transactions refreshed successfully');
    
    // ခလုတ်ကို ပြန်လှည့်ထားမယ် (နောက်တစ်ခါနှိပ်ရင် လှည့်လို့ရအောင်)
    if(btn) {
        btn.style.transition = 'none';
        btn.style.transform = 'rotate(0deg)';
    }
  }, 500);
}

// Toast Notification Helper (ဒါလေးပါ ထည့်ထားပါ)
function showToast(message) {
  // အရင်ရှိရင် ဖျက်မယ်
  const existing = document.getElementById('toast-notification');
  if(existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.innerText = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #00b894;
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    z-index: 3000;
    opacity: 0;
    transition: opacity 0.3s, top 0.3s;
  `;
  
  document.body.appendChild(toast);
  
  // Animation In
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.top = '30px';
  }, 10);

  // Animation Out (2 စက္ကန့်နေရင် ပျောက်မယ်)
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.top = '20px';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// --- DERIVATIVES TRADING LOGIC ---
function tradeDerivative(symbol, type) {
  // 1. Trading Page ကို အရင်သွားမယ်
  showCoinDetail(symbol);
  
  // 2. Buy/Sell Tab ကို ချက်ချင်း ပြောင်းပေးမယ်
  // (0.1 စက္ကန့် စောင့်ပြီးမှ ပြောင်းတာက Page Load ပြီးမှ လုပ်စေချင်လို့ပါ)
  setTimeout(() => {
    switchTradeType(type); // type = 'buy' or 'sell'
  }, 100);
}
