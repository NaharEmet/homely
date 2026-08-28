import { createRequire } from "module";

const require = createRequire(
  "/home/nahar/Documents/code/house_designer/homely/package.json",
);
const { chromium } = require("playwright");

const port = process.argv[2];
if (!port) {
  console.error("usage: boot.mjs <automationWsPort>");
  process.exit(1);
}
const url = `http://localhost:1420/?automationPort=${port}`;

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--no-sandbox",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => {
  if (m.type() === "error") console.error("PAGE-ERR:", m.text());
});
page.on("pageerror", (e) => console.error("PAGE-EXCEPTION:", e.message));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
try {
  await page.waitForSelector("#plan-canvas", { timeout: 60000 });
} catch {
  console.error("WARN: #plan-canvas not found; continuing");
}
console.log("BROWSER_READY");

const shutdown = async () => {
  await browser.close();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// keep alive until killed by the orchestrator
await new Promise(() => {});
