const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  loadPrices();
});

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.page-view');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      views.forEach(v => v.classList.remove('active'));
      
      item.classList.add('active');
      const target = document.getElementById(item.getAttribute('data-target'));
      target.classList.add('active');

      if (item.getAttribute('data-target') === 'view-trading') initTradingView();
    });
  });
}

async function loadPrices() {
  const res = await fetch(API_BASE + '/api/prices/list');
  const prices = await res.json();
  
  document.getElementById('topPricesContainer').innerHTML = prices.slice(0, 3).map(c => 
    `<div class="price-card" style="background:#1e1e2d; padding:10px; border-radius:10px; flex:1; margin:5px; text-align:center;">
       <div style="color:#aaa; font-size:12px">${c.symbol}/USDT</div>
       <div style="color:#00b894; font-weight:bold">${c.price}</div>
     </div>`
  ).join('');

  document.getElementById('cryptoListContainer').innerHTML = prices.map(c => 
    `<div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #333;">
       <div style="display:flex; align-items:center; gap:10px;">
         <div style="width:30px; height:30px; background:#333; border-radius:50%; display:flex; align-items:center; justify-content:center;">${c.icon}</div>
         <span>${c.name}</span>
       </div>
       <div>${c.price}</div>
     </div>`
  ).join('');
}

let chartInit = false;
function initTradingView() {
  if(chartInit) return;
  new TradingView.widget({
    "container_id": "tradingview_chart",
    "width": "100%", "height": 400,
    "symbol": "BINANCE:BTCUSDT",
    "interval": "D", "theme": "dark"
  });
  chartInit = true;
}
