const defaultPrices = [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 91128, change24h: 1.54, icon: '₿', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3114, change24h: 1.96, icon: 'Ξ', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    { id: 'ripple', symbol: 'XRP', name: 'XRP', price: 2.08, change24h: 0.26, icon: '✕', image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', price: 105.2, change24h: -0.5, icon: '◎', image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 0.55, change24h: 1.2, icon: '₳', image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.12, change24h: 5.4, icon: 'Ð', image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 93.96, change24h: 1.33, icon: 'Ł', image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png' }
];

async function getTopPrices() { return defaultPrices.slice(0, 3); }
async function getAllPrices() { return defaultPrices; }

module.exports = { getTopPrices, getAllPrices };
