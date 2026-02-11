const express = require('express');
const cors = require('cors');
const { placeOrder, monitorExit } = require('./execution');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/trade-signal', async (req, res) => {
    const { symbol } = req.body;
    console.log(`Execution signal for: ${symbol}`);
    
    // 1. Buy immediately
    const order = await placeOrder(symbol, 'buy');
    
    // 2. Start the automated "Best Point to Sell" logic
    if(order) {
        monitorExit(symbol);
        res.json({ status: "Success", message: "Order placed and monitoring exit." });
    } else {
        res.status(500).json({ status: "Error" });
    }
});

app.listen(3000, () => console.log('Senior Engineer Server running on http://localhost:3000'));