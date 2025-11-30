import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Client, middleware } from "@line/bot-sdk";

import { replyToClient} from "./replymessage.js";

import { createChatEntry } from "./chatHistory.js"
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// -----------------------------
// LINE CONFIG
// -----------------------------
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const lineClient = new Client(lineConfig);

// -----------------------------
// VUEJS API
// -----------------------------
app.post("/api/chat", async (req, res) => {
  try {
    const { userQuery, language, userId } = req.body;
    const result = await replyToClient(userQuery, language, userId);

    const reply = result.message;
    const replyimg = result.img;
    const intent = result.intent;
    const property_id = result.property_id;
    const chatHistory = await createChatEntry(userId, userQuery, reply, intent, property_id)
    
    //const replymessage = await replymessage(userQuery, language, chatHistory)
    res.json({ intent, reply, replyimg, chatHistory });

  
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// n8n connected through webhook
/*import axios from "axios";

async function sendToN8N(payload) {
  try {
    const res = await axios.post(
      "https://mark2000.app.n8n.cloud/webhook-test/119ce4cf-c1e2-46e9-baf7-aae6970704fb",
      payload
    );
    console.log("n8n response:", res.data);
  } catch (err) {
    console.error("Error sending to n8n:", err);
  }
}

sendToN8N("Hello")
*/


// -----------------------------
// LINE WEBHOOK — only middleware here
// -----------------------------
app.post(
  "/line/webhook",
  middleware(lineConfig),   // applied ONLY to this route
  async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleLineEvent));
      res.status(200).end();
    } catch (err) {
      console.error("LINE Webhook Error:", err);
      res.status(500).end();
    }
  }
);

// -----------------------------
// LINE EVENT HANDLER
// -----------------------------
async function handleLineEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return;

  const userMsg = event.message.text;
  const reply = await replyToClient(userMsg);

  return lineClient.replyMessage(event.replyToken, {
    type: "text",
    text: reply
  });
}

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
