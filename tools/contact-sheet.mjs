// Tiles screenshots into one image so many screens can be compared at once.
//   node tools/contact-sheet.mjs <out.jpg> <cols> <img...>
import { writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { Browser } from "../.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs";

const [out, cols, ...imgs] = process.argv.slice(2);
const n = Number(cols);
const cellW = Math.floor(1800 / n);
const html = `<!doctype html><body style="margin:0;background:#888;display:grid;grid-template-columns:repeat(${n},${cellW}px);gap:6px;font:14px system-ui">
${imgs.map((p) => `<figure style="margin:0;background:#fff"><figcaption style="padding:2px 6px">${basename(p)}</figcaption><img src="file://${resolve(p)}" style="width:100%;display:block"></figure>`).join("")}
</body>`;
const tmp = resolve(out + ".html");
writeFileSync(tmp, html);
const b = await Browser.launch({ extraArgs: ["--allow-file-access-from-files"] });
const p = await b.newPage({ width: n * cellW + (n - 1) * 6, height: 800 });
await p.goto("file://" + tmp, { settleMs: 800 });
await p.screenshot({ path: out, fullPage: true, quality: 82 });
await b.close();
