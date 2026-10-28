const http=require("http");
const https=require("https");
const fs=require("fs");
const path=require("path");
const sql=require("mssql/msnodesqlv8");

const PORT=Number(process.env.PORT||4173);
const DIST=path.join(__dirname,"dist");
const dbName=process.env.SQL_DATABASE||"CIPSite";
const dbConfig={server:process.env.SQL_SERVER||"localhost\\SQLEXPRESS",database:dbName,driver:"msnodesqlv8",options:{trustedConnection:true,trustServerCertificate:true}};
let poolPromise;
function getPool(){if(!poolPromise)poolPromise=sql.connect(dbConfig);return poolPromise;}
function send(res,status,body,type="application/json"){res.writeHead(status,{"Content-Type":type,"Cache-Control":"no-store"});res.end(type==="application/json"?JSON.stringify(body):body);}
function readBody(req){return new Promise((resolve,reject)=>{let b="";req.on("data",c=>{b+=c;if(b.length>1000000)req.destroy()});req.on("end",()=>resolve(b));req.on("error",reject)})}
function proxyLive(req,res,url){const u=https.get(`https://seba.nyrava.com${url.pathname}${url.search}`,{"headers":{"User-Agent":"Grupo-CIP-local-preview"}},r=>{res.writeHead(r.statusCode||502,{"Content-Type":r.headers["content-type"]||"application/octet-stream","Cache-Control":"no-store"});r.pipe(res)});u.on("error",e=>send(res,502,{error:e.message}))}

const fallbackCss=`
:root{--navy:#06284d;--blue:#0b4770;--yellow:#f4bd2b;--ink:#092742;--muted:#557083}
*{box-sizing:border-box}html{font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#fff}
body{margin:0;line-height:1.55}.container{width:min(1180px,92%);margin:auto}
a{color:inherit}.topline{background:var(--navy);color:#fff;padding:10px 0;font-size:14px}.topline .container{display:flex;justify-content:space-between}
.site-header{background:#fff;border-bottom:1px solid #d8e1e8;position:sticky;top:0;z-index:3}.nav{min-height:86px;display:flex;align-items:center;gap:28px}.logo{display:flex;align-items:center;gap:12px;text-decoration:none;margin-right:auto}.logo img{width:160px;height:auto}.logo small{font-size:11px;color:var(--muted);max-width:130px}.nav nav{display:flex;align-items:center;gap:22px}.nav-link,.language,.button{font-size:14px;text-decoration:none}.button{display:inline-block;padding:13px 20px;border-radius:3px}.yellow{background:var(--yellow);color:#06284d}.page-intro{padding:90px 0 55px}.eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#5d7485}.page-intro h1{font-size:clamp(36px,6vw,72px);line-height:1.02;max-width:850px;margin:20px 0}.page-intro>p:last-child{font-size:20px;color:var(--muted)}.section{padding:45px 0}.detail-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:60px;align-items:center}.detail-grid img,.solution-card img{width:100%;height:auto;display:block;object-fit:cover}.detail-grid h2{font-size:36px;line-height:1.1}.solution-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}.solution-card{text-decoration:none;border:1px solid #d7e0e8;background:#fff}.solution-card div{padding:20px}.solution-card h3{font-size:21px}.cip-bottom-cta{background:var(--navy);color:#fff;margin-top:50px}.cip-footer{background:#031a33;color:#fff;padding:55px 0}.cip-footer-grid{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:40px}.cip-footer a{display:block;margin:8px 0;color:#fff}.cip-footer h3{color:var(--yellow)}@media(max-width:800px){.nav nav{display:none}.detail-grid,.solution-grid,.cip-footer-grid{grid-template-columns:1fr}.page-intro{padding-top:50px}}
`;

const clientScript=`<script>
document.addEventListener("submit",async function(e){const f=e.target;if(!(f instanceof HTMLFormElement))return;const d=Object.fromEntries(new FormData(f).entries());if(!Object.keys(d).length)return;e.preventDefault();try{const r=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(d)});const j=await r.json();alert(r.ok?"Mensaje enviado.":(j.error||"No se pudo enviar."))}catch(x){alert("No se pudo conectar con el servidor.")}});
</script>`;

function rewriteAssets(html){
  return html.replace(/\/assets\/optimized\/[^"')]+/g, m=>{
    if(m.includes("cip-logo")) return "/assets/cip-logo-transparent.png";
    if(m.includes("electrical")) return "/assets/commercial/electrical.jpg";
    if(m.includes("generator")) return "/assets/commercial/generator.jpg";
    if(m.includes("network")) return "/assets/commercial/network-cip.png";
    return "/assets/commercial/cip-infrastructure-reference.png";
  });
}
async function handle(req,res){
  const url=new URL(req.url,`http://localhost:${PORT}`);
  if(url.pathname==="/api/health"){try{const p=await getPool();await p.request().query("SELECT 1 AS ok");return send(res,200,{ok:true,database:dbName})}catch(e){return send(res,503,{ok:false,error:e.message})}}
  if(url.pathname==="/api/contact"&&req.method==="POST"){try{const v=JSON.parse(await readBody(req));const p=await getPool();await p.request().input("name",sql.NVarChar(200),String(v.name||v.nombre||"")).input("email",sql.NVarChar(320),String(v.email||"")).input("message",sql.NVarChar(sql.MAX),String(v.message||v.mensaje||v.comments||"")).query("INSERT INTO dbo.ContactMessages (Name,Email,Message) VALUES (@name,@email,@message)");return send(res,201,{ok:true})}catch(e){return send(res,500,{ok:false,error:e.message})}}
  if(req.method!=="GET"&&req.method!=="HEAD")return send(res,405,{error:"Method not allowed"});
  let fp=path.join(DIST,decodeURIComponent(url.pathname));if(url.pathname==="/"||url.pathname.endsWith("/"))fp=path.join(fp,"index.html");if(!fp.startsWith(DIST))return send(res,403,{error:"Forbidden"});
  fs.stat(fp,(se,st)=>{if(se||!st.isFile())return proxyLive(req,res,url);fs.readFile(fp,(re,data)=>{if(re)return send(res,500,"Read error","text/plain");if(path.extname(fp).toLowerCase()===".html"){let h=rewriteAssets(data.toString("utf8"));h=h.replace("</head",`<style>${fallbackCss}</style></head`);h=h.replace("</body",clientScript+"</body");return send(res,200,h,"text/html; charset=utf-8")}const types={".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".woff2":"font/woff2"};return send(res,200,data,types[path.extname(fp).toLowerCase()]||"application/octet-stream")})});
}
http.createServer((req,res)=>handle(req,res).catch(e=>send(res,500,{error:e.message}))).listen(PORT,()=>{console.log(`Grupo CIP running at http://localhost:${PORT}`);console.log(`SQL target: ${dbConfig.server}/${dbName}`)});
