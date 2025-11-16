const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const admin = require("firebase-admin");
const app = express();

app.use(bodyParser.json());

// ----------------------------------------------------
// 1) CONFIG FIREBASE
// ----------------------------------------------------
const serviceAccount = require("./firebase/google-services.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ----------------------------------------------------
// 2) CONFIG MESSENGER
// ----------------------------------------------------
const PAGE_ACCESS_TOKEN = "EAATXosgc8QgBP4t2bTevFxuEcvvqA3v7IeDO1HKtKjStsEU93U6jb4Me15F5pyS0cxnnPoHBXjtWOnbbsgi4BCXRKAfBjsvbblFQu8msZBUt0DgdHSyq2woWkk5AkUn4TFOPNZAzNYFqH4DQ3nU28BNIJ1Fy6l4dev5S4SU57QnpP5mfqUy6pFaBuywgLtxgQSQPP4vQZDZD";
const VERIFY_TOKEN = "VONJYKELY";

// ----------------------------------------------------
// 3) WEBHOOK VERIFICATION (OBLIGATOIRE POUR META)
// ----------------------------------------------------
app.get("/webhook", (req, res) => {
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("Webhook verified !");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ----------------------------------------------------
// 4) RECEVOIR LES MESSAGES MESSENGER
// ----------------------------------------------------
app.post("/webhook", async (req, res) => {
  let body = req.body;

  if (body.object === "page") {
    body.entry.forEach(entry => {
      let event = entry.messaging[0];
      let sender = event.sender.id;

      if (event.message && event.message.text) {
        let userMessage = event.message.text;

        console.log("Message reçu :", userMessage);

        // Sauvegarde dans Firestore
        saveClientMessage(sender, userMessage);

        // Répondre au client
        sendMessage(sender, "Bonjour 👋 ! Comment puis-je t’aider ?");
      }
    });

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ----------------------------------------------------
// 5) SAUVEGARDE DANS FIRESTORE
// ----------------------------------------------------
async function saveClientMessage(senderID, message) {
  await db.collection("Clients").doc(senderID.toString()).set({
    conversation_id: senderID,
    last_message: message,
    time: Date.now()
  }, { merge: true });

  console.log("🔥 Message enregistré dans Firestore !");
}

// ----------------------------------------------------
// 6) ENVOYER MESSAGE À MESSENGER
// ----------------------------------------------------
async function sendMessage(recipientId, text) {
  await axios.post(
    `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      recipient: { id: recipientId },
      message: { text: text }
    }
  );
}

// ----------------------------------------------------
// 7) SERVER LISTEN (Render)
// ----------------------------------------------------
app.listen(10000, () => {
  console.log("🚀 Bot en ligne sur Render !");
});
