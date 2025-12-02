import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const APP_SECRET = process.env.APP_SECRET;
const XENDIT_SECRET = process.env.XENDIT_SECRET;
const ROBLOX_UNIVERSE_ID = process.env.ROBLOX_UNIVERSE_ID;
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;

function calcTax(nominal) {
  return Math.ceil(nominal * 1.43);
}

app.post('/api/create-order', async (req, res) => {
  try {
    const {username, nominal} = req.body;
    const taxed = calcTax(nominal);
    const orderId = crypto.randomUUID();
    res.json({status: "success", orderId, toPay: taxed, username});
  } catch (e) {
    res.status(500).json({error: "internal_error"});
  }
});

app.post('/api/payment-webhook', async (req, res) => {
  const signature = req.headers['x-callback-token'];
  if (signature !== XENDIT_SECRET) return res.status(403).end();

  const data = req.body;
  if (data.status !== "PAID") return res.json({ok: true});

  const robux = data.nominal;
  await fetch(`https://apis.roblox.com/game-passes/v1/universes/${ROBLOX_UNIVERSE_ID}/transactions`, {
    method: "POST",
    headers: {
      "x-api-key": ROBLOX_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      playerName: data.username,
      amount: robux
    })
  });

  res.json({ok: true});
});

app.listen(3000, () => console.log("Backend running on 3000"));
