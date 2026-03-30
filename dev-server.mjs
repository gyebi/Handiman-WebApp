import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clients = new Set();
const rootDir = __dirname;
const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT || "4173", 10);
const args = process.argv.slice(2);
const openArgIndex = args.indexOf("--open");
const requestedEntry =
  openArgIndex >= 0 && args[openArgIndex + 1]
    ? args[openArgIndex + 1]
    : "index.html";

const watchExtensions = new Set([
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".svg",
  ".png",
  ".webp"
]);

const ignoredSegments = new Set([".git", "node_modules"]);
let fileSnapshot = new Map();

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".rtf": "application/rtf",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function normalizePathname(urlPathname) {
  const decoded = decodeURIComponent(urlPathname.split("?")[0]);
  const stripped = decoded.replace(/^\/+/, "");
  return stripped || requestedEntry;
}

function safeJoin(root, requestedPath) {
  const resolved = path.resolve(root, requestedPath);
  if (!resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}

function createLiveReloadSnippet() {
  return `
<script>
(() => {
  const protocol = location.protocol === "https:" ? "https" : "http";
  const source = new EventSource(protocol + "://" + location.host + "/__live_reload");
  source.addEventListener("reload", () => location.reload());
  source.onerror = () => {
    source.close();
    setTimeout(() => location.reload(), 1000);
  };
})();
</script>`;
}

function injectLiveReload(html) {
  if (html.includes("/__live_reload")) {
    return html;
  }

  const snippet = createLiveReloadSnippet();
  if (html.includes("</body>")) {
    return html.replace("</body>", `${snippet}\n</body>`);
  }

  return `${html}\n${snippet}`;
}

async function collectFiles(dir, snapshot = new Map()) {
  const entries = await readFileList(dir);

  for (const entry of entries) {
    if (ignoredSegments.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (entry.isDirectory()) {
      await collectFiles(fullPath, snapshot);
      continue;
    }

    if (!watchExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const fileStat = await stat(fullPath);
    snapshot.set(relativePath, fileStat.mtimeMs);
  }

  return snapshot;
}

async function readFileList(dir) {
  const { readdir } = await import("node:fs/promises");
  return readdir(dir, { withFileTypes: true });
}

function broadcastReload(changedPath) {
  for (const client of clients) {
    client.write(`event: reload\ndata: ${changedPath}\n\n`);
  }
}

async function detectChanges() {
  try {
    const nextSnapshot = await collectFiles(rootDir);
    const changes = [];

    for (const [filePath, mtimeMs] of nextSnapshot) {
      if (!fileSnapshot.has(filePath) || fileSnapshot.get(filePath) !== mtimeMs) {
        changes.push(filePath);
      }
    }

    for (const filePath of fileSnapshot.keys()) {
      if (!nextSnapshot.has(filePath)) {
        changes.push(filePath);
      }
    }

    if (changes.length > 0) {
      fileSnapshot = nextSnapshot;
      broadcastReload(changes[0]);
    }
  } catch (error) {
    console.error("Live reload scan failed:", error);
  }
}

const server = createServer(async (req, res) => {
  const requestPath = req.url || "/";

  if (requestPath === "/__live_reload") {
    res.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream"
    });
    res.write("\n");
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  const normalizedPath = normalizePathname(requestPath);
  const filePath = safeJoin(rootDir, normalizedPath);

  if (!filePath || !existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  try {
    let body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    if (ext === ".html") {
      body = Buffer.from(injectLiveReload(body.toString("utf8")));
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
    console.error("Request failed:", error);
  }
});

fileSnapshot = await collectFiles(rootDir);
setInterval(detectChanges, 500);

server.listen(port, host, () => {
  console.log(`Handiman live view running at http://${host}:${port}/${requestedEntry}`);
});
