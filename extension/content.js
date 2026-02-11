// This script injects a custom "Auto-Trade" button onto the Chart Toolbar
const injectButton = () => {
    const toolbar = document.querySelector('.left-W_dPIicE'); // TV toolbar class (subject to change)
    if (toolbar && !document.getElementById('dream-trade-btn')) {
        const btn = document.createElement('button');
        btn.id = 'dream-trade-btn';
        btn.innerText = '🚀 START AUTO-TRADE';
        btn.style = 'background: #2962ff; color: white; border: none; padding: 5px; margin: 5px; cursor: pointer; border-radius: 4px;';
        
        btn.onclick = () => {
            const symbol = document.title.split(' ')[0]; // Scrape symbol from tab title
            alert(`Automation Started for ${symbol}`);
            // Send signal to background.js -> Server
            chrome.runtime.sendMessage({ action: "start_trade", symbol: symbol });
        };
        toolbar.appendChild(btn);
    }
};

// Check every 2 seconds if the chart is loaded
setInterval(injectButton, 2000);