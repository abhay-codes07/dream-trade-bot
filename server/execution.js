const fs = require('fs');
const path = require('path');

// Local database for your virtual money
const DB_PATH = path.join(__dirname, 'portfolio.json');

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ balance: 10000, positions: [], history: [] }));
}

function getAccount() {
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveAccount(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function placeOrder(symbol, side, price) {
    let account = getAccount();
    price = parseFloat(price);

    if (side === 'buy') {
        if (account.balance < price) return console.log("Insufficient Virtual Funds!");
        
        const newPosition = { symbol, entryPrice: price, qty: 1, time: new Date().toLocaleTimeString() };
        account.balance -= price;
        account.positions.push(newPosition);
        account.history.push({ type: 'BUY', ...newPosition });
        
        console.log(`✅ VIRTUAL BUY: 1 share of ${symbol} at $${price}`);
    } else {
        const posIndex = account.positions.findIndex(p => p.symbol === symbol);
        if (posIndex > -1) {
            const pos = account.positions[posIndex];
            const profit = price - pos.entryPrice;
            account.balance += price;
            account.positions.splice(posIndex, 1);
            account.history.push({ type: 'SELL', symbol, price, profit, time: new Date().toLocaleTimeString() });
            
            console.log(`🚀 VIRTUAL SELL: ${symbol} at $${price} | Profit: $${profit.toFixed(2)}`);
        }
    }
    saveAccount(account);
}

// "Smart Exit" logic: Sells if profit > 2% OR loss > 1%
function monitorExit(symbol, entryPrice, currentPrice) {
    const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    if (profitPercent >= 2.0) return "SELL_PROFIT";
    if (profitPercent <= -1.0) return "SELL_LOSS";
    return "HOLD";
}

module.exports = { placeOrder, monitorExit, getAccount };

async function getPortfolioValue(currentMarketPrice) {
    const account = getAccount();
    let totalPositionValue = 0;
    
    account.positions.forEach(pos => {
        totalPositionValue += currentMarketPrice; // Value if sold now
    });

    const unrealizedPnL = account.positions.reduce((acc, pos) => {
        return acc + (currentMarketPrice - pos.entryPrice);
    }, 0);

    return {
        balance: account.balance,
        equity: account.balance + totalPositionValue,
        pnl: unrealizedPnL,
        positionCount: account.positions.length
    };
}

// Emergency function
async function liquidateAll(currentPrice) {
    const account = getAccount();
    console.log("!!! EMERGENCY LIQUIDATION TRIGGERED !!!");
    while(account.positions.length > 0) {
        await placeOrder(account.positions[0].symbol, 'sell', currentPrice);
        account = getAccount(); // Refresh
    }
}

module.exports = { placeOrder, monitorExit, getAccount, getPortfolioValue, liquidateAll };