const axios = require('axios');
require('dotenv').config();

const api = axios.create({
    baseURL: process.env.ALPACA_URL,
    headers: {
        'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY
    }
});

async function placeOrder(symbol, side) {
    try {
        const response = await api.post('/v2/orders', {
            symbol: symbol,
            qty: 1, // Start with 1 share for testing
            side: side,
            type: 'market',
            time_in_force: 'day'
        });
        console.log(`Order placed: ${side} ${symbol}`);
        return response.data;
    } catch (error) {
        console.error("Order Error:", error.response ? error.response.data : error.message);
    }
}

// The "Smart Exit" Loop
// It checks the price every 5 seconds. If price drops 2% from the peak, it sells.
async function monitorExit(symbol) {
    console.log(`Monitoring exit for ${symbol}...`);
    let peakPrice = 0;

    const interval = setInterval(async () => {
        try {
            // 1. Get current price
            const resp = await api.get(`/v2/last/stocks/${symbol}`);
            const currentPrice = resp.data.last.price;

            if (currentPrice > peakPrice) peakPrice = currentPrice;

            // 2. Logic: If price drops 2% from the highest point it reached
            const dropThreshold = peakPrice * 0.98; 

            console.log(`${symbol} | Current: ${currentPrice} | Peak: ${peakPrice} | Sell at: ${dropThreshold}`);

            if (currentPrice <= dropThreshold) {
                console.log("STOP LOSS/TRAILING HIT! Selling...");
                await placeOrder(symbol, 'sell');
                clearInterval(interval);
            }
        } catch (e) {
            console.log("Monitoring error", e.message);
        }
    }, 5000); 
}

module.exports = { placeOrder, monitorExit };