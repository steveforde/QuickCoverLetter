// emailTemplates.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadTemplate = (templateName) => {
  try {
    const filePath = path.join(__dirname, "emails", `${templateName}.html`);
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    console.error(`❌ Failed to load email template: ${templateName}`, err.message);
    return "<p>Template missing</p>";
  }
};
