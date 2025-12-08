const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let priceCache = null;
let lastFetch = 0;
const CACHE_DURATION = 30000;

const COIN_IDS = [
  'bitcoin', 'ethereum', 'litecoin', 'solana', 'dogecoin',
  'bitcoin-cash', 'ripple', 'avalanche-2', 'polkadot', 'cardano',
  'matic-network', 'chainlink', 'uniswap', 'stellar', 'tron'
];

const COIN_ICONS = {
  'BTC': '₿', 'ETH': 'Ξ', 'LTC': 'Ł', 'SOL': '◎', 'DOGE': 'Ð',
  'BCH': '₿', 'XRP': '✕', 'AVAX': 'A', 'DOT': '●', 'ADA': '₳',
  'MATIC': 'M', 'LINK': '⬡', 'UNI': '🦄', 'XLM': '*', 'TRX': 'T'
};

async function fetchPricesFromAPI() {
  const now = Date.now();
  if (priceCache && (now - lastFetch) < CACHE_DURATION) return priceCache;
  
  try {
    const ids = COIN_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    priceCache = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      price: coin.current_price,
      change24h: coin.price_change_percentage_24h || 0,
      icon: COIN_ICONS[coin.symbol.toUpperCase()] || coin.symbol.charAt(0).toUpperCase(),
      image: coin.image
    }));
    
    lastFetch = now;
    return priceCache;
  } catch (error) {
    console.log('API Error, using default data');
    if (priceCache) return priceCache;
    return getDefaultPrices();
  }
}

function getDefaultPrices() {
  return [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 91128, change24h: 0.32, icon: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3114, change24h: 0.39, icon: 'Ξ' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 105, change24h: 1.02, icon: '◎' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 2.37, change24h: 0.15, icon: '✕' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 0.85, icon: '₳' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.12, change24h: 5.4, icon: 'Ð' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 93.96, change24h: 1.33, icon: 'Ł' }
  ];
}

async function getTopPrices() {
  const prices = await fetchPricesFromAPI();
  return prices.slice(0, 3);
}

async function getAllPrices() {
  return await fetchPricesFromAPI();
}

module.exports = { getTopPrices, getAllPrices };
