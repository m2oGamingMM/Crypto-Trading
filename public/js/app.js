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

async function fetchAllPrices() {
  try {
    // Backend ကို မဖြတ်တော့ဘဲ CoinGecko API ကို တိုက်ရိုက်ယူပါမယ်
    const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,ripple,solana,dogecoin,tether,binancecoin,cardano,tron,chainlink,litecoin,polkadot,matic-network,shiba-inu,avalanche-2,uniswap,stellar,bitcoin-cash,near,verus-coin&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h');
    
    if (!response.ok) throw new Error('CoinGecko API Error');
    const rawData = await response.json();

    // App က လက်ခံမယ့်ပုံစံပြောင်းပေးခြင်း (Mapping)
    return rawData.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      // CoinGecko က current_price လို့ပေးပေမယ့် App က price လို့သုံးထားလို့ ပြောင်းပေးရပါတယ်
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h,
      image: coin.image
    }));

  } catch (error) {
    console.error('Connection Error:', error);
    // Data ဆွဲမရရင် ဘာမှ မပြတော့ဘဲ Error ပဲပြပါမယ် (Offline data မသုံးတော့ပါ)
    return null;
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
    onclick="showCoinDetail('${coin.symbol}')">
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
    <div class="quote-item" onclick="showCoinDetail('${coin.symbol}')">
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
    <div class="coin-card" onclick="showCoinDetail('${coin.symbol}')">
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
      <div class="quote-item" onclick="showCoinDetail('${coin.symbol}')">
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
      <div class="coin-card" onclick="showCoinDetail('${coin.symbol}')">
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
      <div class="quote-item" onclick="showCoinDetail('${coin.symbol}')">
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
  // ရှိပြီးသား loadAllData() အောက်မှာ ဒါလေးထည့်ပါ
  startCarousel();
});
