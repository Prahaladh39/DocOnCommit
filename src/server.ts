// import dotenv from "dotenv";
// dotenv.config();
import express from "express";
import crypto from "crypto";
import { handlePushEvent } from "./github.ts";

const app = express();

// Capture raw body for signature verification
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })
);

function verifySignature(req: any) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET!);
  hmac.update(req.rawBody);
  const digest = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post("/webhook", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.headers["x-github-event"];

  if (event === "push") {
    await handlePushEvent(req.body);
  }

  res.sendStatus(200);
});

app.listen(3000, () => {
  console.log("DocSync bot running on port 3000");
});
