const http = require("http");
const fs = require("fs");
const path = require("path");
const sql = require("mssql/msnodesqlv8");

const PORT = Number(process.env.PORT || 4173);
const DIST = path.join(__dirname, "dist");
const dbName = process.env.SQL_DATABASE || "CIPSite";

const dbConfig = {
  server: process.env.SQL_SERVER || "localhost\\SQLEXPRESS",
  database: dbName,
  driver: "msnodesqlv8",
  options: {
    trustedConnection: true,
    trustServerCertificate: true
  }
};

let poolPromise;
function getPool() {
  if (!poolPromise) poolPromise = sql.connect(dbConfig);
  return poolPromise;
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const clientScript = `
<script>
document.addEventListener("submit", async function (event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  const data = Object.fromEntries(new FormData(form).entries());
  if (!Object.keys(data).length) return;
  event.preventDefault();
  const status = document.createElement("p");
  status.textContent = "Enviando...";
  form.appendChild(status);
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });
    const result = await response.json();
    status.textContent = response.ok ? "Mensaje enviado." : (result.error || "No se pudo enviar.");
  } catch (error) {
    status.textContent = "No se pudo conectar con el servidor.";
  }
});
</script>`;

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/health") {
    try {
      const pool = await getPool();
      await pool.request().query("SELECT 1 AS ok");
      return send(res, 200, { ok: true, database: dbName });
    } catch (error) {
      return send(res, 503, { ok: false, error: error.message });
    }
  }

  if (url.pathname === "/api/contact" && req.method === "POST") {
    try {
      const values = JSON.parse(await readBody(req));
      const pool = await getPool();
      await pool.request()
        .input("name", sql.NVarChar(200), String(values.name || values.nombre || ""))
        .input("email", sql.NVarChar(320), String(values.email || ""))
        .input("message", sql.NVarChar(sql.MAX), String(values.message || values.mensaje || values.comments || ""))
        .query("INSERT INTO dbo.ContactMessages (Name, Email, Message) VALUES (@name, @email, @message)");
      return send(res, 201, { ok: true });
    } catch (error) {
      return send(res, 500, { ok: false, error: error.message });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, { error: "Method not allowed" });

  let filePath = path.join(DIST, decodeURIComponent(url.pathname));
  if (url.pathname === "/" || url.pathname.endsWith("/")) filePath = path.join(filePath, "index.html");
  if (!filePath.startsWith(DIST)) return send(res, 403, { error: "Forbidden" });

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) return send(res, 404, "Not found", "text/plain; charset=utf-8");
    fs.readFile(filePath, (readError, data) => {
      if (readError) return send(res, 500, "Read error", "text/plain; charset=utf-8");
      if (path.extname(filePath).toLowerCase() === ".html") {
        const html = data.toString("utf8").replace("</body>", clientScript + "</body>");
        return send(res, 200, html, "text/html; charset=utf-8");
      }
      const types = { ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };
      return send(res, 200, data, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    });
  });
}

http.createServer((req, res) => handle(req, res).catch(error => send(res, 500, { error: error.message }))).listen(PORT, () => {
  console.log(`Grupo CIP running at http://localhost:${PORT}`);
  console.log(`SQL target: ${dbConfig.server}/${dbName}`);
});
