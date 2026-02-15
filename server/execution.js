const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'portfolio.json');

// Risk Management State
let dailyStats = { date: new Date().toLocaleDateString(), pnl: 0 };

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ balance: 10000, positions: [], history: [] }));
}

function getAccount() {
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveAccount(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Merged Order Logic with Risk Guard
async function placeOrder(symbol, side, price) {
    let account = getAccount();
    price = parseFloat(price);

    // RISK GUARD
    if (dailyStats.pnl <= -200) {
        console.log("🛑 RISK GUARD: Daily loss limit reached.");
        return { error: "Daily Limit Hit" };
    }

    if (side === 'buy') {
        if (account.balance < price) return { error: "Insufficient Funds" };
        const newPosition = { symbol, entryPrice: price, qty: 1, time: new Date().toLocaleTimeString() };
        account.balance -= price;
        account.positions.push(newPosition);
        account.history.push({ type: 'BUY', ...newPosition, price });
        console.log(`✅ BUY: ${symbol} at $${price}`);
    } else {
        const posIndex = account.positions.findIndex(p => p.symbol === symbol);
        if (posIndex > -1) {
            const pos = account.positions[posIndex];
            const profit = price - pos.entryPrice;
            dailyStats.pnl += profit; // Update Risk Guard
            account.balance += price;
            account.positions.splice(posIndex, 1);
            account.history.push({ type: 'SELL', symbol, price, profit, time: new Date().toLocaleTimeString() });
            console.log(`🚀 SELL: ${symbol} | Profit: $${profit.toFixed(2)}`);
        }
    }
    saveAccount(account);
    return { success: true };
}

// Smart Exit Logic
function monitorExit(symbol, entryPrice, currentPrice) {
    const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    if (profitPercent >= 2.0) return "SELL_PROFIT";
    if (profitPercent <= -1.0) return "SELL_LOSS";
    return "HOLD";
}

// Unrealized P&L Logic
async function getPortfolioValue(currentMarketPrice) {
    const account = getAccount();
    const unrealizedPnL = account.positions.reduce((acc, pos) => {
        return acc + (currentMarketPrice - pos.entryPrice);
    }, 0);
    return { balance: account.balance, pnl: unrealizedPnL, positions: account.positions.length };
}

// Emergency Liquidation
async function liquidateAll(currentPrice) {
    const account = getAccount();
    console.log("!!! EMERGENCY LIQUIDATION !!!");
    const symbolsToSell = account.positions.map(p => p.symbol);
    for (const sym of symbolsToSell) {
        await placeOrder(sym, 'sell', currentPrice);
    }
}

module.exports = { placeOrder, monitorExit, getAccount, getPortfolioValue, liquidateAll };