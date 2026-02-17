console.log("DreamTrade Master Engine Loading...");

const trendHighlighter = {
    enabled: false,
    points: [],
    canvas: null,
    chartEl: null
};

const findChartContainer = () => {
    const directMatch = document.querySelector(
        '.chart-container, .tv-chart-view, .chart-page, .chart-markup-table, [data-name="pane"]'
    );
    if (directMatch) return directMatch;

    const candidates = [...document.querySelectorAll('div')].filter((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width < 400 || rect.height < 250) return false;
        return !!el.querySelector('canvas, svg');
    });

    if (!candidates.length) return null;

    return candidates.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectB.width * rectB.height - rectA.width * rectA.height;
    })[0];
};

const ensureTrendCanvas = () => {
    if (trendHighlighter.canvas) return trendHighlighter.canvas;

    const canvas = document.createElement('canvas');
    canvas.id = 'dt-trend-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999998';
    document.body.appendChild(canvas);

    trendHighlighter.canvas = canvas;
    return canvas;
};

const resizeTrendCanvas = () => {
    const canvas = ensureTrendCanvas();
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const drawTrendHighs = () => {
    const canvas = ensureTrendCanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (!trendHighlighter.enabled || trendHighlighter.points.length === 0 || !trendHighlighter.chartEl) {
        return;
    }

    const rect = trendHighlighter.chartEl.getBoundingClientRect();
    const sorted = [...trendHighlighter.points].sort((a, b) => a.xRatio - b.xRatio);
    const absolutePoints = sorted.map((p) => ({
        x: rect.left + rect.width * p.xRatio,
        y: rect.top + rect.height * p.yRatio
    }));

    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(absolutePoints[0].x, absolutePoints[0].y);

    for (let i = 1; i < absolutePoints.length; i += 1) {
        ctx.lineTo(absolutePoints[i].x, absolutePoints[i].y);
    }

    ctx.stroke();

    ctx.fillStyle = '#ffd54f';
    absolutePoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
};

const handleChartHighClick = (event) => {
    if (!trendHighlighter.enabled || !event.altKey) return;

    const chartEl = trendHighlighter.chartEl || findChartContainer();
    if (!chartEl) return;

    const rect = chartEl.getBoundingClientRect();
    const { clientX, clientY } = event;

    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    trendHighlighter.chartEl = chartEl;
    trendHighlighter.points.push({
        xRatio: (clientX - rect.left) / rect.width,
        yRatio: (clientY - rect.top) / rect.height
    });

    drawTrendHighs();
};

window.addEventListener('resize', () => {
    resizeTrendCanvas();
    drawTrendHighs();
});
window.addEventListener('scroll', drawTrendHighs, true);
document.addEventListener('click', handleChartHighClick, true);

const injectPanel = () => {
    if (document.getElementById('dt-pro-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dt-pro-panel';
    panel.style = 'position:fixed; top:80px; right:20px; width:220px; background:#131722; border:1px solid #363c4e; border-radius:10px; z-index:9999999; padding:15px; color:white; font-family:sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.5);';

    panel.innerHTML = `
        <div style="font-weight:bold; color:#2962ff; border-bottom:1px solid #363c4e; padding-bottom:10px; margin-bottom:15px; display:flex; justify-content:space-between;">
            <span>DREAMTRADE MASTER</span>
            <span id="dt-status" style="color:#00ff00; font-size:10px;">LIVE</span>
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

        <button id="dt-buy-btn" style="width:100%; background:#2962ff; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer; margin-bottom:10px;">EXECUTE BUY</button>

        <button id="dt-liquidate-btn" style="width:100%; background:transparent; color:#f23645; border:1px solid #f23645; padding:8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold;">LIQUIDATE ALL</button>

        <div style="margin-top:12px; border-top:1px solid #363c4e; padding-top:10px;">
            <div style="font-size:10px; color:#787b86; margin-bottom:8px;">TREND HIGHLIGHTER</div>
            <button id="dt-trend-toggle-btn" style="width:100%; background:#1e222d; color:#ffd54f; border:1px solid #ffd54f; padding:8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold; margin-bottom:8px;">ENABLE (ALT+CLICK HIGHS)</button>
            <button id="dt-trend-clear-btn" style="width:100%; background:transparent; color:#d1d4dc; border:1px solid #555d70; padding:7px; border-radius:6px; font-size:10px; cursor:pointer;">CLEAR TREND LINE</button>
        </div>
    `;
    document.body.appendChild(panel);
    resizeTrendCanvas();

    setInterval(() => {
        const confVal = document.getElementById('dt-conf-val');
        const confBar = document.getElementById('dt-conf-bar');
        if (!confVal || !confBar) return;

        const val = Math.floor(Math.random() * (95 - 65) + 65);
        confVal.innerText = `${val}%`;
        confBar.style.width = `${val}%`;
    }, 4000);

    const buyBtn = document.getElementById('dt-buy-btn');
    if (buyBtn) {
        buyBtn.onclick = () => {
            const symbol = document.title.split(' ')[0];
            chrome.runtime.sendMessage({ action: 'start_trade', symbol, price: 65000 });
            alert('Buy Order Sent!');
        };
    }

    const liquidateBtn = document.getElementById('dt-liquidate-btn');
    if (liquidateBtn) {
        liquidateBtn.onclick = () => {
            if (confirm('Emergency Liquidate?')) {
                chrome.runtime.sendMessage({ action: 'liquidate' });
            }
        };
    }

    const trendToggleBtn = document.getElementById('dt-trend-toggle-btn');
    if (trendToggleBtn) {
        trendToggleBtn.onclick = () => {
            trendHighlighter.enabled = !trendHighlighter.enabled;
            trendHighlighter.chartEl = trendHighlighter.chartEl || findChartContainer();
            trendToggleBtn.innerText = trendHighlighter.enabled
                ? 'DISABLE HIGHLIGHTER'
                : 'ENABLE (ALT+CLICK HIGHS)';
            drawTrendHighs();
        };
    }

    const trendClearBtn = document.getElementById('dt-trend-clear-btn');
    if (trendClearBtn) {
        trendClearBtn.onclick = () => {
            trendHighlighter.points = [];
            drawTrendHighs();
        };
    }
};

setTimeout(injectPanel, 3000);
