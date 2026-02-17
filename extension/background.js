chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_trade") {
        fetch('http://localhost:3000/trade-signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symbol: request.symbol,
                price: request.price,
                rsi: request.rsi,
                closes: request.closes
            })
        })
        .then(response => response.json())
        .then(data => console.log("Server responded:", data))
        .catch(err => console.error("Server connection failed. Is your Node server running?", err));
    }
});
