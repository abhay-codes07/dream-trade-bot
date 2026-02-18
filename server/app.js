const express = require('express');
const cors = require('cors');
const { placeOrder, monitorExit, getAccount } = require('./execution');
const { calculateRSI } = require('./strategy');
const app = express();
app.use(cors());
app.use(express.json());

const NEWS_CACHE_TTL_MS = 30 * 1000;
const newsCacheByQuery = new Map();

const sanitizeSymbol = (input) => {
    if (typeof input !== 'string') return '';
    return input.toUpperCase().replace(/[^A-Z0-9._-]/g, '').slice(0, 15);
};

const buildNewsFeedUrl = (symbol) => {
    const query = symbol
        ? `${symbol} stock OR ${symbol} forex OR ${symbol} crypto when:1d`
        : 'stock market OR forex OR crypto when:1d';
    return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
};

const readTag = (input, tagName) => {
    const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = input.match(regex);
    return match ? match[1].trim() : '';
};

const decodeEntities = (value) => value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const parseRssNewsItems = (xml) => {
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    return itemMatches.slice(0, 15).map((itemXml) => {
        const title = decodeEntities(readTag(itemXml, 'title'));
        const url = decodeEntities(readTag(itemXml, 'link'));
        const source = decodeEntities(readTag(itemXml, 'source')) || 'Market News';
        const pubDateRaw = readTag(itemXml, 'pubDate');
        const parsedDate = new Date(pubDateRaw);

        return {
            title,
            url,
            source,
            publishedAt: Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
        };
    }).filter((item) => item.title && item.url);
};

const fetchMarketNews = async (symbol = '') => {
    const normalizedSymbol = sanitizeSymbol(symbol);
    const cacheKey = normalizedSymbol || '__global__';
    const now = Date.now();
    const cached = newsCacheByQuery.get(cacheKey);
    if (cached && cached.items.length && (now - cached.fetchedAt) < NEWS_CACHE_TTL_MS) {
        return { ...cached, symbol: normalizedSymbol || null };
    }

    const response = await fetch(buildNewsFeedUrl(normalizedSymbol), {
        method: 'GET',
        headers: { 'User-Agent': 'DreamTrade/1.0' }
    });

    if (!response.ok) {
        throw new Error(`News feed returned ${response.status}`);
    }

    const xml = await response.text();
    const parsedItems = parseRssNewsItems(xml);
    const fresh = { fetchedAt: now, items: parsedItems };
    newsCacheByQuery.set(cacheKey, fresh);
    return { ...fresh, symbol: normalizedSymbol || null };
};

app.post('/trade-signal', (req, res) => {
    const { symbol, price, rsi, closes } = req.body;
    const parsedRSI = Number(rsi);
    const effectiveRSI = Number.isFinite(parsedRSI) ? parsedRSI : calculateRSI(closes);

    if (!Number.isFinite(effectiveRSI)) {
        return res.status(400).json({
            status: "Invalid Input",
            message: "Provide rsi, or provide closes with at least 15 numeric values."
        });
    }

    // Strategy: Only Buy if RSI < 30 (Stock is oversold/cheap)
    if (effectiveRSI < 30) {
        placeOrder(symbol, 'buy', price);
        return res.json({ status: "Bought", message: `RSI is ${effectiveRSI}. Buying the dip!` });
    } else {
        return res.json({ status: "Ignored", message: `RSI is ${effectiveRSI}. Not cheap enough to buy.` });
    }
});

// New endpoint for your Extension UI to show history
app.get('/history', (req, res) => {
    res.json(getAccount());
});

app.get('/market-news', async (req, res) => {
    try {
        const requestedSymbol = typeof req.query.symbol === 'string' ? req.query.symbol : '';
        const data = await fetchMarketNews(requestedSymbol);
        res.json({
            source: 'Google News RSS',
            symbol: data.symbol,
            updatedAt: new Date(data.fetchedAt).toISOString(),
            items: data.items
        });
    } catch (error) {
        res.status(502).json({
            status: 'error',
            message: 'Unable to fetch market news right now.'
        });
    }
});

app.listen(3000, () => console.log('Simulator Server running on port 3000'));
