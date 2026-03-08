import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(packageRoot, "src", "panel");
const targetDir = path.join(packageRoot, "dist", "panel");

if (!existsSync(sourceDir)) {
  throw new Error(`Panel source directory not found: ${sourceDir}`);
}

mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });
