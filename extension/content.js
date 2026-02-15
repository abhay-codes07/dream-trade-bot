console.log("🚀 DreamTrade Master Engine Loading...");

const injectPanel = () => {
    if (document.getElementById('dt-pro-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dt-pro-panel';
    panel.style = `position:fixed; top:80px; right:20px; width:220px; background:#131722; border:1px solid #363c4e; border-radius:10px; z-index:9999999; padding:15px; color:white; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.5);`;

    panel.innerHTML = `
        <div style="font-weight:bold; color:#2962ff; border-bottom:1px solid #363c4e; padding-bottom:10px; margin-bottom:15px; display:flex; justify-content:space-between;">
            <span>DREAMTRADE MASTER</span>
            <span id="dt-status" style="color:#00ff00; font-size:10px;">● LIVE</span>
        </div>
        
        <div style="margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#787b86; margin-bottom:5px;">
                <span>STRATEGY CONFIDENCE</span>
                <span id="dt-conf-val">82%</span>
            </div>
            <div style="width:100%; height:6px; background:#363c4e; border-radius:3px; overflow:hidden;">
                <div id="dt-conf-bar" style="width:82%; height:100%; background:linear-gradient(90deg, #f23645, #22ab94); transition:0.5s;"></div>
            </div>
        </div>

        <button id="dt-buy-btn" style="width:100%; background:#2962ff; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer; margin-bottom:10px;">🚀 EXECUTE BUY</button>
        
        <button id="dt-liquidate-btn" style="width:100%; background:transparent; color:#f23645; border:1px solid #f23645; padding:8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">⚠️ LIQUIDATE ALL</button>
    `;
    document.body.appendChild(panel);

    // Confidence Animation
    setInterval(() => {
        const val = Math.floor(Math.random() * (95 - 65) + 65);
        document.getElementById('dt-conf-val').innerText = val + "%";
        document.getElementById('dt-conf-bar').style.width = val + "%";
    }, 4000);

    // BUY Button
    document.getElementById('dt-buy-btn').onclick = () => {
        const symbol = document.title.split(' ')[0];
        chrome.runtime.sendMessage({ action: "start_trade", symbol, price: 65000 });
        alert("Buy Order Sent!");
    };

    // LIQUIDATE Button
    document.getElementById('dt-liquidate-btn').onclick = () => {
        if(confirm("Emergency Liquidate?")) {
            chrome.runtime.sendMessage({ action: "liquidate" });
        }
    };
};

setTimeout(injectPanel, 3000);