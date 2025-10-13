import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 👇 This serves your frontend files (like index.html)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(__dirname));

// 👇 Root route to load index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 👇 Import your API route
import handler from "./api/generate.js";
app.post("/generate", (req, res) => handler(req, res));

// 👇 Start the server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

