// Small local preview server with a guarded same-origin page fetch endpoint.
// Run with: node server.js
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 4173);
const TYPES = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8' };

function ipv4Public(ip) {
  const n = ip.split('.').map(Number);
  if (n.length !== 4 || n.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a,b] = n;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 192 && b === 2) || (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) || (a === 255 && b === 255));
}
function ipv6Public(ip) {
  // Only global-unicast IPv6 is accepted. Reject mapped IPv4 and special ranges.
  const lower = ip.toLowerCase().split('%')[0];
  if (lower.includes('.')) return false;
  const halves = lower.split('::');
  if (halves.length > 2) return false;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = 8 - left.length - right.length;
  if ((halves.length === 1 && fill !== 0) || (halves.length === 2 && fill < 1)) return false;
  const groups = [...left, ...Array(fill).fill('0'), ...right].map(x => parseInt(x || '0', 16));
  if (groups.length !== 8 || groups.some(x => !Number.isInteger(x) || x < 0 || x > 65535)) return false;
  return groups[0] >= 0x2000 && groups[0] <= 0x3fff && !(groups[0] === 0x2001 && groups[1] === 0x0db8);
}
async function resolvePublic(host) {
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) throw Error('Adresse locale ou privée refusée.');
  const literalFamily = net.isIP(host);
  let records;
  try {
    records = literalFamily ? [{ address: host, family: literalFamily }] : await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('La résolution DNS du site a expiré. Vérifiez l’adresse ou réessayez plus tard.')), 5000);
      dns.lookup(host, { all:true, verbatim:true }).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
  } catch (error) {
    if (/ENOTFOUND|EAI_AGAIN|ENODATA/.test(error.code || '')) throw Error('Le nom de domaine est introuvable ou son DNS ne répond pas.');
    throw error;
  }
  if (!records.length || records.some(r => !(r.family === 4 ? ipv4Public(r.address) : ipv6Public(r.address)))) throw Error('Le site pointe vers une adresse privée ou non publique.');
  // Pin the chosen, validated address for the request to prevent DNS rebinding.
  return records[0];
}
function requestPage(url, redirects = 0, referer = `${url.origin}/`) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80','443'].includes(url.port))) throw Error('Seules les adresses HTTP/HTTPS publiques sont acceptées.');
      if (redirects > 4) throw Error('Trop de redirections.');
      const target = await resolvePublic(url.hostname);
      const transport = url.protocol === 'https:' ? https : http;
      const req = transport.request(url, { method:'GET', headers:{ 'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', Accept:'text/html,application/xhtml+xml,application/json,image/avif,image/webp,image/apng,*/*;q=0.8', 'Accept-Language':'fr-FR,fr;q=0.9,en;q=0.7', Referer:referer }, lookup:(_hostname,options,callback)=>options?.all?callback(null,[target]):callback(null,target.address,target.family) }, res => {
        if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url);
          requestPage(next, redirects + 1, referer).then(resolve, reject);
          return;
        }
        if (res.statusCode >= 300 && res.statusCode < 400) { res.resume(); reject(Error('Redirection invalide.')); return; }
        if (res.statusCode === 401 || res.statusCode === 403) { res.resume(); reject(Error('Cette page requiert une authentification ou bloque les requêtes automatisées.')); return; }
        if (res.statusCode === 404) { res.resume(); reject(Error('Cette fiche manga est introuvable (404).')); return; }
        if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); reject(Error(`Le site a répondu avec l’erreur ${res.statusCode}.`)); return; }
        const type = String(res.headers['content-type'] || '');
        if (!/text\/html|application\/xhtml\+xml|application\/json|image\/(jpeg|png|webp|avif|gif)/i.test(type)) { res.resume(); reject(Error('La ressource reçue n’est pas un format pris en charge.')); return; }
        let size = 0; const chunks = [];
        res.on('data', chunk => { size += chunk.length; if (size > 20 * 1024 * 1024) { req.destroy(Error('La ressource dépasse la taille maximale de 20 Mo.')); } else chunks.push(chunk); });
        res.on('end', () => resolve({ status:res.statusCode, contentType:type, body:Buffer.concat(chunks) }));
      });
      req.setTimeout(12000, () => req.destroy(Error('Le site met trop de temps à répondre (délai de 12 secondes).')));
      req.on('error', reject); req.end();
    } catch (error) { reject(error); }
  });
}
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/page' && req.method === 'GET') {
    const started = Date.now();
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    try {
      const raw = new URL(req.url, 'http://localhost').searchParams.get('url');
      if (!raw || raw.length > 2048) throw Error('Adresse web invalide.');
      const result = await requestPage(new URL(raw));
      res.writeHead(200); res.end(JSON.stringify({ status:result.status, html:result.body.toString('utf8') }));
      console.log(`[scan] page ${new URL(raw).hostname} ${Date.now()-started}ms OK`);
    } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error:error.message || 'Impossible de charger cette page.' })); console.log(`[scan] page failed ${Date.now()-started}ms: ${error.message}`); }
    return;
  }
  if (pathname === '/api/data' && req.method === 'GET') {
    const started = Date.now();
    res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store');
    try {
      const raw = new URL(req.url, 'http://localhost').searchParams.get('url');
      if (!raw || raw.length > 2048) throw Error('Adresse web invalide.');
      const result = await requestPage(new URL(raw));
      if (!/application\/json/i.test(result.contentType)) throw Error('La source n’a pas renvoyé de données JSON.');
      res.writeHead(200); res.end(JSON.stringify({ status:result.status, data:JSON.parse(result.body.toString('utf8')) }));
      console.log(`[scan] data ${new URL(raw).hostname} ${Date.now()-started}ms OK`);
    } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error:error.message || 'Impossible de charger les données de la source.' })); console.log(`[scan] data failed ${Date.now()-started}ms: ${error.message}`); }
    return;
  }
  if (pathname === '/api/image' && req.method === 'GET') {
    const started = Date.now();
    try {
      const raw = new URL(req.url, 'http://localhost').searchParams.get('url');
      if (!raw || raw.length > 2048) throw Error('Adresse d’image invalide.');
      const requestUrl = new URL(req.url, 'http://localhost');
      const referer = requestUrl.searchParams.get('referer') || `${new URL(raw).origin}/`;
      if (!['http:', 'https:'].includes(new URL(referer).protocol)) throw Error('Adresse de référence invalide.');
      const result = await requestPage(new URL(raw), 0, referer);
      if (!/^image\/(jpeg|png|webp|avif|gif)$/i.test(result.contentType.split(';')[0])) throw Error('La ressource reçue n’est pas une image reconnue.');
      res.writeHead(200, {'Content-Type':result.contentType.split(';')[0], 'Cache-Control':'private, max-age=3600', 'X-Content-Type-Options':'nosniff'});
      res.end(result.body);
      console.log(`[reader] image ${new URL(raw).hostname} ${Date.now()-started}ms ${result.body.length} bytes`);
    } catch (error) { res.writeHead(502, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}); res.end(error.message || 'Image indisponible.'); console.log(`[reader] image failed ${Date.now()-started}ms: ${error.message}`); }
    return;
  }
  let file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (file.includes('..') || file.includes('/') || file.includes('\\')) { res.writeHead(404).end('Not found'); return; }
  const full = path.join(ROOT,file);
  fs.readFile(full,(error,body)=>{ if(error){res.writeHead(404).end('Not found');return;} res.writeHead(200,{'Content-Type':TYPES[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body); });
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Manga Reader preview: http://localhost:${PORT}`));
