const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

let priceCache = null;
let lastFetch = 0;
const CACHE_DURATION = 30000;

const COIN_IDS = [
  'bitcoin', 'ethereum', 'litecoin', 'solana', 'dogecoin',
  'bitcoin-cash', 'ripple', 'avalanche-2', 'polkadot', 'cardano',
  'matic-network', 'chainlink', 'uniswap', 'stellar', 'tron'
];

const COIN_SYMBOLS = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'litecoin': 'LTC',
  'solana': 'SOL',
  'dogecoin': 'DOGE',
  'bitcoin-cash': 'BCH',
  'ripple': 'XRP',
  'avalanche-2': 'AVAX',
  'polkadot': 'DOT',
  'cardano': 'ADA',
  'matic-network': 'MATIC',
  'chainlink': 'LINK',
  'uniswap': 'UNI',
  'stellar': 'XLM',
  'tron': 'TRX'
};

const COIN_ICONS = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'LTC': 'Ł',
  'SOL': '◎',
  'DOGE': 'Ð',
  'BCH': '₿',
  'XRP': '✕',
  'AVAX': 'A',
  'DOT': '●',
  'ADA': '₳',
  'MATIC': 'M',
  'LINK': '⬡',
  'UNI': '🦄',
  'XLM': '*',
  'TRX': 'T'
};

async function fetchPricesFromAPI() {
  const now = Date.now();
  
  if (priceCache && (now - lastFetch) < CACHE_DURATION) {
    return priceCache;
  }
  
  try {
    const ids = COIN_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
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
    console.error('Error fetching from CoinGecko:', error.message);
    
    if (priceCache) {
      return priceCache;
    }
    
    return getDefaultPrices();
  }
}

function getDefaultPrices() {
  return [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 107605, change24h: 0.32, icon: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3927.05, change24h: 0.39, icon: 'Ξ' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 93.96, change24h: 1.33, icon: 'Ł' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 188.9479, change24h: 1.02, icon: '◎' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.193729, change24h: 1.65, icon: 'Ð' },
    { id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', price: 471.02, change24h: 1.18, icon: '₿' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 2.37232, change24h: 0.15, icon: '✕' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 20.4628, change24h: 0.95, icon: 'A' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 2.9762, change24h: 1.34, icon: '●' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.45, change24h: 0.85, icon: '₳' },
    { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', price: 0.89, change24h: 1.20, icon: 'M' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 14.50, change24h: 2.10, icon: '⬡' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 7.25, change24h: 1.50, icon: '🦄' },
    { id: 'stellar', symbol: 'XLM', name: 'Stellar', price: 0.12, change24h: 0.90, icon: '*' },
    { id: 'tron', symbol: 'TRX', name: 'TRON', price: 0.085, change24h: 0.65, icon: 'T' }
  ];
}

async function getTopPrices() {
  const prices = await fetchPricesFromAPI();
  return prices.slice(0, 3);
}

async function getAllPrices() {
  return await fetchPricesFromAPI();
}

module.exports = {
  getTopPrices,
  getAllPrices
};

