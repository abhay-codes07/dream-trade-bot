/**
 * DreamTrade Pro - Content Engine
 * Senior Engineer Version
 */

console.log("🚀 DreamTrade Pro: Initializing Terminal...");

const injectProfessionalPanel = () => {
    // Prevent duplicate panels
    if (document.getElementById('dt-pro-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dt-pro-panel';
    panel.style = `
        position: fixed;
        top: 80px;
        right: 20px;
        width: 220px;
        background: #131722;
        border: 1px solid #363c4e;
        border-radius: 10px;
        z-index: 999999999;
        padding: 15px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        font-family: -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif;
        color: #d1d4dc;
        user-select: none;
    `;

    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #363c4e; padding-bottom: 10px;">
            <span style="font-weight: bold; color: #2962ff; font-size: 14px;">DREAMTRADE PRO</span>
            <span id="dt-status-dot" style="color: #00ff00; font-size: 10px;">● LIVE</span>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="font-size: 10px; color: #787b86; margin-bottom: 4px;">ACTIVE SYMBOL</div>
            <div id="dt-symbol" style="font-weight: bold; font-size: 18px; color: white;">---</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #1e222d; padding: 10px; border-radius: 6px;">
            <div>
                <div style="font-size: 9px; color: #787b86;">UNREALIZED P&L</div>
                <div id="dt-live-pnl" style="font-weight: bold; color: #22ab94; font-size: 14px;">$0.00</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 9px; color: #787b86;">RSI (MOCK)</div>
                <div id="dt-rsi" style="font-weight: bold; color: #ff9800; font-size: 14px;">28.4</div>
            </div>
        </div>

        <button id="dt-buy-btn" style="width: 100%; background: #22ab94; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-bottom: 10px; transition: 0.2s;">
            🚀 AUTO-BUY SIGNAL
        </button>

        <button id="dt-liquidate-btn" style="width: 100%; background: #f23645; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s;">
            ⚠️ LIQUIDATE ALL
        </button>

        <div style="font-size: 9px; color: #5d606b; text-align: center; margin-top: 15px;">
            Connected to Engine: localhost:3000
        </div>
    `;

    document.body.appendChild(panel);

    // --- LOGIC ---

    const updateSymbol = () => {
        const title = document.title;
        const symbol = title.split(' ')[0];
        document.getElementById('dt-symbol').innerText = symbol;
    };

    // BUY ACTION
    document.getElementById('dt-buy-btn').onclick = () => {
        const symbol = document.getElementById('dt-symbol').innerText;
        const btn = document.getElementById('dt-buy-btn');
        
        btn.innerText = "SENDING...";
        btn.style.opacity = "0.5";

        chrome.runtime.sendMessage({ 
            action: "start_trade", 
            symbol: symbol,
            price: 65000, // This would be scraped in a real production environment
            rsi: 28 
        }, (response) => {
            setTimeout(() => {
                btn.innerText = "🚀 AUTO-BUY SIGNAL";
                btn.style.opacity = "1";
                alert(`Order Sent for ${symbol}! Check your DreamTrade Dashboard.`);
            }, 500);
        });
    };

    // LIQUIDATE ACTION
    document.getElementById('dt-liquidate-btn').onclick = () => {
        if(confirm("Are you sure you want to exit ALL positions?")) {
            chrome.runtime.sendMessage({ action: "liquidate" });
            document.getElementById('dt-live-pnl').innerText = "$0.00";
            document.getElementById('dt-live-pnl').style.color = "#22ab94";
        }
    };

    // Update symbol every second
    setInterval(updateSymbol, 1000);
};

// Run injection after TradingView loads
setTimeout(injectProfessionalPanel, 3000);