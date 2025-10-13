import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route to check server status
app.get("/", (req, res) => {
  res.send("✅ Server is running!");
});

// Proxy the /generate route to your generate.js if needed
import handler from "./api/generate.js";
app.post("/generate", (req, res) => handler(req, res));

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
