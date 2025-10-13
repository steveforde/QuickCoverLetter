import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import handler from "./api/generate.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

// 👇 change this to match frontend
app.post("/api/generate", handler);

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
