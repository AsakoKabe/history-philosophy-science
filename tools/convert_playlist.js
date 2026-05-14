const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();
const rawDir = path.join(root, "lectures", "raw");
const transcriptDir = path.join(root, "lectures", "transcripts");

for (const dir of ["clean", "timestamps", "chunks"].map((name) => path.join(transcriptDir, name))) {
  fs.mkdirSync(dir, { recursive: true });
}

for (let index = 1; index <= 26; index += 1) {
  const num = String(index).padStart(2, "0");
  const json3 = path.join(rawDir, `playlist${num}.ru-orig.json3`);
  const infoPath = path.join(rawDir, `playlist${num}.info.json`);

  if (!fs.existsSync(json3)) {
    console.warn(`skip playlist${num}: no json3`);
    continue;
  }

  let title = `Лекция ${num}`;
  let sourceUrl = "";

  if (fs.existsSync(infoPath)) {
    const info = JSON.parse(fs.readFileSync(infoPath, "utf8"));
    title = info.title || title;
    sourceUrl = info.webpage_url || info.original_url || sourceUrl;
  }

  const prefix = path.join(transcriptDir, `playlist${num}_transcript`);
  const result = spawnSync(
    process.execPath,
    ["tools/json3_to_text.js", json3, prefix, sourceUrl, title],
    { cwd: root, encoding: "utf8" },
  );

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }

  fs.renameSync(
    `${prefix}_clean.txt`,
    path.join(transcriptDir, "clean", `playlist${num}_transcript_clean.txt`),
  );
  fs.renameSync(
    `${prefix}_timestamps.txt`,
    path.join(transcriptDir, "timestamps", `playlist${num}_transcript_timestamps.txt`),
  );
  fs.renameSync(
    `${prefix}_chunks_5min.txt`,
    path.join(transcriptDir, "chunks", `playlist${num}_transcript_chunks_5min.txt`),
  );

  process.stdout.write(`converted playlist${num}\n`);
}
