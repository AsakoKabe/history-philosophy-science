const fs = require("fs");

const [jsonPath, prefix, sourceUrl, titleArg] = process.argv.slice(2);

if (!jsonPath || !prefix) {
  console.error("Usage: node tools/json3_to_text.js <input.json3> <output-prefix> [source-url]");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
}

const cues = [];

for (const event of data.events || []) {
  if (!event.segs) continue;
  const text = event.segs
    .map((segment) => segment.utf8 || "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) continue;
  cues.push({ timeMs: event.tStartMs || 0, text });
}

const title = titleArg || "Транскрипт лекции";
const header = [
  title,
  sourceUrl ? `Источник: ${sourceUrl}` : null,
  "Автосубтитры YouTube, язык: ru-orig",
  "",
]
  .filter((line) => line !== null)
  .join("\n");

const timestamped = cues.map((cue) => `[${formatTime(cue.timeMs)}] ${cue.text}`).join("\n");
fs.writeFileSync(`${prefix}_timestamps.txt`, `${header}${timestamped}\n`);

const blocks = [];
let current = [];
let blockStart = 0;

for (const cue of cues) {
  if (!current.length) blockStart = cue.timeMs;
  if (cue.timeMs - blockStart >= 60000 && current.length) {
    blocks.push(current.join(" "));
    current = [];
    blockStart = cue.timeMs;
  }
  current.push(cue.text);
}

if (current.length) blocks.push(current.join(" "));

fs.writeFileSync(`${prefix}_clean.txt`, `${header}${blocks.join("\n\n")}\n`);

const chunks = [];
let chunkText = [];
let chunkStart = 0;

for (const cue of cues) {
  if (!chunkText.length) chunkStart = Math.floor(cue.timeMs / 300000) * 300000;
  if (cue.timeMs - chunkStart >= 300000 && chunkText.length) {
    chunks.push({ timeMs: chunkStart, text: chunkText.join(" ") });
    chunkText = [];
    chunkStart = Math.floor(cue.timeMs / 300000) * 300000;
  }
  chunkText.push(cue.text);
}

if (chunkText.length) chunks.push({ timeMs: chunkStart, text: chunkText.join(" ") });

fs.writeFileSync(
  `${prefix}_chunks_5min.txt`,
  chunks.map((chunk) => `## ${formatTime(chunk.timeMs)}\n${chunk.text}`).join("\n\n") + "\n",
);

console.log(`cues=${cues.length}`);
console.log(`${prefix}_timestamps.txt`);
console.log(`${prefix}_clean.txt`);
console.log(`${prefix}_chunks_5min.txt`);
