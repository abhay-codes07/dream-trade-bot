const express = require('express');
const cors = require('cors');
const { placeOrder, monitorExit, getAccount } = require('./execution');
const { calculateRSI } = require('./strategy');
const app = express();
app.use(cors());
app.use(express.json());

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

app.listen(3000, () => console.log('Simulator Server running on port 3000'));
