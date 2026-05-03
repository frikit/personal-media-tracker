#!/usr/bin/env node
// server.js — static file server + save endpoint for the watchlist tracker.
// Serves files from this directory and accepts PUT for the three JSON files,
// writing the body to disk so the page can persist state directly.
//
// Usage: node server.js [port]   (default 8000)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.argv[2] || 8000);
const SAVABLE = new Set(["/to-watch.json", "/watched.json", "/skipped.json"]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
};

function safeJoin(rel) {
  const target = path.normalize(path.join(ROOT, rel));
  return target.startsWith(ROOT) ? target : null;
}

function serveFile(req, res, target) {
  const mime = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": mime, "Cache-Control": "no-store" });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (req.method === "PUT") {
    if (!SAVABLE.has(url)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    const target = safeJoin(url);
    if (!target) {
      res.writeHead(400);
      return res.end("bad path");
    }
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      try {
        JSON.parse(body.toString("utf8"));
      } catch {
        res.writeHead(400);
        return res.end("invalid json");
      }
      fs.writeFile(target, body, (err) => {
        if (err) {
          res.writeHead(500);
          return res.end(err.message);
        }
        console.log(`saved ${url} (${body.length} bytes)`);
        res.writeHead(200);
        res.end("ok");
      });
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    return res.end("method not allowed");
  }

  let target = safeJoin(url === "/" ? "/index.html" : url);
  if (!target) {
    res.writeHead(400);
    return res.end("bad path");
  }
  fs.stat(target, (err, stat) => {
    if (err) {
      res.writeHead(404);
      return res.end("not found");
    }
    if (stat.isDirectory()) {
      target = path.join(target, "index.html");
      return fs.stat(target, (e2, s2) => {
        if (e2 || !s2.isFile()) {
          res.writeHead(404);
          return res.end("not found");
        }
        serveFile(req, res, target);
      });
    }
    serveFile(req, res, target);
  });
});

server.listen(PORT, () => {
  console.log(`serving ${ROOT}`);
  console.log(`http://localhost:${PORT}`);
});
