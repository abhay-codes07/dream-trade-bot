// This is an ATR-based Trailing Stop logic
const calculateBestExit = (currentPrice, highPrice, atrValue) => {
    const multiplier = 2.0; // How much "room" you give the stock to breathe
    const stopLevel = highPrice - (atrValue * multiplier);
    
    if (currentPrice <= stopLevel) {
        return "SELL_NOW";
    }
    return "HOLD";
};
module.exports = { calculateBestExit };