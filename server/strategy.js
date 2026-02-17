// This is an ATR-based Trailing Stop logic
const calculateBestExit = (currentPrice, highPrice, atrValue) => {
    const multiplier = 2.0; // How much "room" you give the stock to breathe
    const stopLevel = highPrice - (atrValue * multiplier);
    
    if (currentPrice <= stopLevel) {
        return "SELL_NOW";
    }
    return "HOLD";
};

// Wilder RSI using closing prices. Returns null if there is not enough data.
const calculateRSI = (closes, period = 14) => {
    if (!Array.isArray(closes) || closes.length <= period) return null;

    const prices = closes.map(Number).filter(Number.isFinite);
    if (prices.length !== closes.length) return null;

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i += 1) {
        const change = prices[i] - prices[i - 1];
        if (change >= 0) {
            gainSum += change;
        } else {
            lossSum += Math.abs(change);
        }
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    for (let i = period + 1; i < prices.length; i += 1) {
        const change = prices[i] - prices[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return Number((100 - (100 / (1 + rs))).toFixed(2));
};

module.exports = { calculateBestExit, calculateRSI };
