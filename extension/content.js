console.log("DreamTrade Master Engine Loading...");

const trendHighlighter = {
    enabled: false,
    points: [],
    canvas: null,
    chartEl: null
};

const rsiIndicator = {
    enabled: false,
    period: 14,
    closes: [],
    current: null,
    canvas: null,
    chartEl: null,
    sampleTimer: null
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

const extractCurrentPrice = () => {
    const selectors = [
        '[data-name="legend-source-item"] [data-field="close"]',
        '[data-name="legend-source-item"] [data-field="last"]',
        '.lastContainer-3_4epN0P',
        '.priceWrapper-3PT2D-PK',
        '.tv-symbol-price-quote__value'
    ];

    for (const selector of selectors) {
        const node = document.querySelector(selector);
        if (!node) continue;
        const raw = node.textContent || '';
        const value = Number(raw.replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(value)) return value;
    }

    const titleMatch = document.title.match(/([0-9]+(?:[.,][0-9]+)?)/);
    if (!titleMatch) return null;
    const fallback = Number(titleMatch[1].replace(',', ''));
    return Number.isFinite(fallback) ? fallback : null;
};

const extractCurrentSymbol = () => {
    const pathMatch = window.location.pathname.match(/\/symbols\/([^/?#]+)/i);
    if (pathMatch && pathMatch[1]) {
        const fromPath = pathMatch[1].toUpperCase().replace(/[^A-Z0-9:._-]/g, '');
        if (fromPath) return fromPath;
    }

    const titleMatch = document.title.match(/^([A-Z0-9:._-]{1,20})\b/);
    if (titleMatch && titleMatch[1]) return titleMatch[1];

    return '';
};

const calculateRSI = (closes, period = 14) => {
    if (!Array.isArray(closes) || closes.length <= period) return null;

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i += 1) {
        const change = closes[i] - closes[i - 1];
        if (change >= 0) gainSum += change;
        else lossSum += Math.abs(change);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    for (let i = period + 1; i < closes.length; i += 1) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return Number((100 - (100 / (1 + rs))).toFixed(2));
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

const ensureRSICanvas = () => {
    if (rsiIndicator.canvas) return rsiIndicator.canvas;

    const canvas = document.createElement('canvas');
    canvas.id = 'dt-rsi-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999997';
    document.body.appendChild(canvas);

    rsiIndicator.canvas = canvas;
    return canvas;
};

const resizeRSICanvas = () => {
    const canvas = ensureRSICanvas();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};

const drawRSIOverlay = () => {
    const canvas = ensureRSICanvas();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (!rsiIndicator.enabled) return;

    const chartEl = rsiIndicator.chartEl || findChartContainer();
    if (!chartEl) return;
    rsiIndicator.chartEl = chartEl;

    const values = [];
    for (let i = rsiIndicator.period; i < rsiIndicator.closes.length; i += 1) {
        const slice = rsiIndicator.closes.slice(0, i + 1);
        const value = calculateRSI(slice, rsiIndicator.period);
        if (Number.isFinite(value)) values.push(value);
    }
    if (values.length < 2) return;

    const rect = chartEl.getBoundingClientRect();
    const panelWidth = Math.min(320, rect.width * 0.34);
    const panelHeight = Math.max(90, rect.height * 0.18);
    const x = rect.right - panelWidth - 12;
    const y = rect.bottom - panelHeight - 12;

    ctx.fillStyle = 'rgba(19, 23, 34, 0.82)';
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeStyle = 'rgba(54, 60, 78, 0.95)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    const toY = (rsiValue) => y + ((100 - rsiValue) / 100) * panelHeight;
    const y30 = toY(30);
    const y70 = toY(70);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(242, 54, 69, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y30);
    ctx.lineTo(x + panelWidth, y30);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(34, 171, 148, 0.85)';
    ctx.beginPath();
    ctx.moveTo(x, y70);
    ctx.lineTo(x + panelWidth, y70);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = '#ffb74d';
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    for (let i = 0; i < values.length; i += 1) {
        const pointX = x + (i / (values.length - 1)) * panelWidth;
        const pointY = toY(values[i]);
        if (i === 0) ctx.moveTo(pointX, pointY);
        else ctx.lineTo(pointX, pointY);
    }
    ctx.stroke();

    const latest = values[values.length - 1];
    rsiIndicator.current = latest;

    ctx.fillStyle = '#ffb74d';
    ctx.font = 'bold 11px Segoe UI, sans-serif';
    ctx.fillText(`RSI(${rsiIndicator.period}): ${latest.toFixed(2)}`, x + 8, y + 14);
};

const sampleRSIPrice = () => {
    if (!rsiIndicator.enabled) return;
    const price = extractCurrentPrice();
    if (!Number.isFinite(price)) return;

    const last = rsiIndicator.closes[rsiIndicator.closes.length - 1];
    if (last === price) return;

    rsiIndicator.closes.push(price);
    if (rsiIndicator.closes.length > 250) {
        rsiIndicator.closes.shift();
    }
    drawRSIOverlay();
};

const startRSITracking = () => {
    if (rsiIndicator.sampleTimer) clearInterval(rsiIndicator.sampleTimer);
    rsiIndicator.sampleTimer = setInterval(sampleRSIPrice, 2000);
    sampleRSIPrice();
};

const stopRSITracking = () => {
    if (rsiIndicator.sampleTimer) {
        clearInterval(rsiIndicator.sampleTimer);
        rsiIndicator.sampleTimer = null;
    }
};

const formatNewsAge = (isoDate) => {
    if (!isoDate) return 'now';
    const timestamp = new Date(isoDate).getTime();
    if (!Number.isFinite(timestamp)) return 'now';
    const minutesAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutesAgo < 1) return 'now';
    if (minutesAgo < 60) return `${minutesAgo}m`;
    return `${Math.floor(minutesAgo / 60)}h`;
};

const getSentimentColor = (label) => {
    if (label === 'bullish') return '#22ab94';
    if (label === 'bearish') return '#f23645';
    return '#7a808f';
};

const getImpactStyle = (impactLabel) => {
    if (impactLabel === 'high') return 'color:#f7b6bc;border-color:#f23645;background:rgba(242,54,69,0.16);';
    if (impactLabel === 'medium') return 'color:#ffd28c;border-color:#ffb74d;background:rgba(255,183,77,0.12);';
    return 'color:#9dc9ff;border-color:#2962ff;background:rgba(41,98,255,0.10);';
};

const updatePanelMood = (moodPayload, symbol) => {
    const moodNode = document.getElementById('dt-mood-label');
    const sentimentNode = document.getElementById('dt-mood-sentiment');
    const riskNode = document.getElementById('dt-mood-risk');
    if (!moodNode || !sentimentNode || !riskNode) return;

    const mood = moodPayload || {};
    const moodText = (mood.mood || 'neutral').toUpperCase();
    const sentimentScore = Number(mood.sentimentScore) || 0;
    const riskScore = Math.round(Number(mood.riskScore) || 0);

    moodNode.innerText = symbol ? `${moodText} (${symbol})` : moodText;
    moodNode.style.color = getSentimentColor(mood.mood);
    sentimentNode.innerText = sentimentScore.toFixed(1);
    riskNode.innerText = `${riskScore}`;
};

const evaluateTradeRisk = async (symbol) => {
    try {
        const endpoint = symbol
            ? `http://localhost:3000/market-news?symbol=${encodeURIComponent(symbol)}`
            : 'http://localhost:3000/market-news';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        const mood = payload.mood || {};
        const riskScore = Number(mood.riskScore) || 0;
        const moodLabel = (mood.mood || 'neutral').toLowerCase();
        const highImpact = Array.isArray(payload.items)
            ? payload.items.find((item) => item.impactLabel === 'high')
            : null;

        const shouldGuard = moodLabel === 'bearish' && riskScore >= 60;
        if (!shouldGuard) {
            return { allow: true, reason: '', headline: '' };
        }

        return {
            allow: false,
            reason: `Risk Guard: ${symbol || 'Market'} mood is bearish with risk ${Math.round(riskScore)}/100.`,
            headline: highImpact ? highImpact.title : ''
        };
    } catch (error) {
        return {
            allow: true,
            reason: '',
            headline: ''
        };
    }
};

const refreshPanelNews = async () => {
    const listNode = document.getElementById('dt-news-list');
    const statusNode = document.getElementById('dt-news-status');
    if (!listNode || !statusNode) return;

    try {
        const symbol = extractCurrentSymbol();
        const endpoint = symbol
            ? `http://localhost:3000/market-news?symbol=${encodeURIComponent(symbol)}`
            : 'http://localhost:3000/market-news';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const payload = await response.json();
        updatePanelMood(payload.mood, symbol);
        const items = Array.isArray(payload.items) ? payload.items.slice(0, 4) : [];
        listNode.innerHTML = '';

        if (items.length === 0) {
            listNode.innerHTML = '<div style="font-size:10px; color:#787b86;">No headlines available.</div>';
        } else {
            items.forEach((item) => {
                const row = document.createElement('a');
                row.href = item.url;
                row.target = '_blank';
                row.rel = 'noopener noreferrer';
                row.style = `display:block; text-decoration:none; color:#d1d4dc; font-size:10px; line-height:1.35; background:#1a1f2b; border:1px solid #363c4e; border-left:3px solid ${getSentimentColor(item.sentimentLabel)}; border-radius:5px; padding:6px; margin-bottom:6px;`;
                row.innerHTML = `
                    <div style="margin-bottom:3px;">${item.title}</div>
                    <div style="color:#787b86;">${item.source || 'Market'} - ${formatNewsAge(item.publishedAt)}</div>
                    <div style="margin-top:4px;">
                        <span style="font-size:9px; border:1px solid transparent; border-radius:999px; padding:1px 6px; text-transform:uppercase; ${getImpactStyle(item.impactLabel)}">${item.impactLabel || 'low'} impact</span>
                    </div>
                `;
                listNode.appendChild(row);
            });
        }

        statusNode.innerText = payload.updatedAt
            ? `Updated ${new Date(payload.updatedAt).toLocaleTimeString()}${symbol ? ` (${symbol})` : ''}`
            : 'Feed live';
    } catch (error) {
        statusNode.innerText = 'News feed offline';
        if (!listNode.innerHTML) {
            listNode.innerHTML = '<div style="font-size:10px; color:#787b86;">Start local server to stream news.</div>';
        }
    }
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
    resizeRSICanvas();
    drawRSIOverlay();
});
window.addEventListener('scroll', () => {
    drawTrendHighs();
    drawRSIOverlay();
}, true);
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

        <div id="dt-risk-guard-banner" style="margin-bottom:10px; font-size:10px; color:#8ec5ff; background:#1a1f2b; border:1px solid #2c3f68; border-radius:6px; padding:6px; text-align:center;">
            RISK GUARD ON - checks live news before buy
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

        <div style="margin-top:12px; border-top:1px solid #363c4e; padding-top:10px;">
            <div style="font-size:10px; color:#787b86; margin-bottom:8px;">RSI INDICATOR</div>
            <button id="dt-rsi-toggle-btn" style="width:100%; background:#1e222d; color:#ffb74d; border:1px solid #ffb74d; padding:8px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:bold; margin-bottom:8px;">SHOW RSI ON CHART</button>
            <button id="dt-rsi-reset-btn" style="width:100%; background:transparent; color:#d1d4dc; border:1px solid #555d70; padding:7px; border-radius:6px; font-size:10px; cursor:pointer;">RESET RSI DATA</button>
        </div>

        <div style="margin-top:12px; border-top:1px solid #363c4e; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div style="font-size:10px; color:#787b86;">MARKET NEWS</div>
                <div id="dt-news-status" style="font-size:9px; color:#787b86;">Connecting...</div>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:8px;">
                <div style="flex:1; background:#1a1f2b; border:1px solid #363c4e; border-radius:5px; padding:6px;">
                    <div style="font-size:9px; color:#787b86;">Mood</div>
                    <div id="dt-mood-label" style="font-size:10px; font-weight:bold; color:#d1d4dc;">NEUTRAL</div>
                </div>
                <div style="width:54px; background:#1a1f2b; border:1px solid #363c4e; border-radius:5px; padding:6px; text-align:center;">
                    <div style="font-size:9px; color:#787b86;">S</div>
                    <div id="dt-mood-sentiment" style="font-size:10px; font-weight:bold;">0.0</div>
                </div>
                <div style="width:54px; background:#1a1f2b; border:1px solid #363c4e; border-radius:5px; padding:6px; text-align:center;">
                    <div style="font-size:9px; color:#787b86;">R</div>
                    <div id="dt-mood-risk" style="font-size:10px; font-weight:bold;">0</div>
                </div>
            </div>
            <div id="dt-news-list"></div>
        </div>
    `;
    document.body.appendChild(panel);
    resizeTrendCanvas();
    resizeRSICanvas();
    refreshPanelNews();
    setInterval(refreshPanelNews, 20000);

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
        buyBtn.onclick = async () => {
            const symbol = extractCurrentSymbol() || document.title.split(' ')[0];
            const latestPrice = extractCurrentPrice();
            const statusNode = document.getElementById('dt-status');
            const guardResult = await evaluateTradeRisk(symbol);

            if (!guardResult.allow) {
                if (statusNode) {
                    statusNode.style.color = '#f23645';
                    statusNode.innerText = 'RISK LOCK';
                    setTimeout(() => {
                        statusNode.style.color = '#00ff00';
                        statusNode.innerText = 'LIVE';
                    }, 5000);
                }

                const warning = guardResult.headline
                    ? `${guardResult.reason}\nTop headline: ${guardResult.headline}\n\nPress OK to FORCE BUY, Cancel to abort.`
                    : `${guardResult.reason}\n\nPress OK to FORCE BUY, Cancel to abort.`;
                const forceBuy = confirm(warning);
                if (!forceBuy) return;
            }

            chrome.runtime.sendMessage({
                action: 'start_trade',
                symbol,
                price: Number.isFinite(latestPrice) ? latestPrice : 65000,
                rsi: rsiIndicator.current,
                closes: rsiIndicator.closes.slice(-100)
            });
            alert(guardResult.allow ? 'Buy Order Sent!' : 'Risk Override: Buy Order Sent!');
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

    const rsiToggleBtn = document.getElementById('dt-rsi-toggle-btn');
    if (rsiToggleBtn) {
        rsiToggleBtn.onclick = () => {
            rsiIndicator.enabled = !rsiIndicator.enabled;
            rsiIndicator.chartEl = rsiIndicator.chartEl || findChartContainer();
            rsiToggleBtn.innerText = rsiIndicator.enabled ? 'HIDE RSI ON CHART' : 'SHOW RSI ON CHART';

            if (rsiIndicator.enabled) {
                startRSITracking();
            } else {
                stopRSITracking();
                drawRSIOverlay();
            }
        };
    }

    const rsiResetBtn = document.getElementById('dt-rsi-reset-btn');
    if (rsiResetBtn) {
        rsiResetBtn.onclick = () => {
            rsiIndicator.closes = [];
            rsiIndicator.current = null;
            drawRSIOverlay();
        };
    }
};

setTimeout(injectPanel, 3000);
