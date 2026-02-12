const express = require('express');
const cors = require('cors');
const { placeOrder, monitorExit, getAccount } = require('./execution');
const app = express();
app.use(cors());
app.use(express.json());

app.post('/trade-signal', (req, res) => {
    const { symbol, price, rsi } = req.body;

    // Strategy: Only Buy if RSI < 30 (Stock is oversold/cheap)
    if (rsi < 30) {
        placeOrder(symbol, 'buy', price);
        res.json({ status: "Bought", message: `RSI is ${rsi}. Buying the dip!` });
    } else {
        res.json({ status: "Ignored", message: `RSI is ${rsi}. Not cheap enough to buy.` });
    }
});

// New endpoint for your Extension UI to show history
app.get('/history', (req, res) => {
    res.json(getAccount());
});

app.listen(3000, () => console.log('Simulator Server running on port 3000'));