/**
 * The Sonic Media — Local Development Server with Clean URLs
 * Supports clean URL routing for both dev and testing (/about -> about.html, /sonicmediaadmin -> sonicmediaadmin.html)
 * Automatically redirects legacy .html requests to clean URLs.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8080', 10);
// Project root is one level up from server/
const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.xml':  'application/xml',
  '.txt':  'text/plain; charset=utf-8',
  '.pdf':  'application/pdf'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Security check: prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let fullPath = path.join(ROOT_DIR, safePath);

  // 1. If someone accesses /index.html directly -> redirect 301 to /
  if (pathname === '/index.html') {
    const target = '/' + (parsedUrl.search || '');
    res.writeHead(301, { 'Location': target });
    res.end();
    return;
  }

  // 2. If someone accesses a .html file directly (e.g. /about.html or /sonicmediaadmin.html) -> redirect 301 to clean URL
  if (pathname.endsWith('.html')) {
    const cleanPath = pathname.slice(0, -5);
    const target = cleanPath + (parsedUrl.search || '');
    res.writeHead(301, { 'Location': target });
    res.end();
    return;
  }

  // 3. Normalize root path /
  if (pathname === '/' || pathname === '') {
    fullPath = path.join(ROOT_DIR, 'index.html');
  }

  // Helper to serve a file
  function serveFile(filePath, status = 200) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        serve404();
        return;
      }
      res.writeHead(status, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  }

  // Helper for 404
  function serve404() {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>404 — Page Not Found | The Sonic Media</title>
        <style>
          body { background:#080808; color:#F5F0EB; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; flex-direction:column; text-align:center; }
          h1 { color:#FF5C00; font-size:48px; margin:0 0 10px; }
          p { color:rgba(245,240,235,0.6); margin:0 0 24px; font-size:16px; }
          a { color:#FF5C00; border:1px solid #FF5C00; padding:10px 24px; border-radius:50px; text-decoration:none; font-weight:bold; }
        </style>
      </head>
      <body>
        <h1>404</h1>
        <p>The requested clean URL <code>${escapeHtml(pathname)}</code> does not exist.</p>
        <a href="/">Return to Home</a>
      </body>
      </html>
    `);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[s]));
  }

  // 4. Check if exact file exists (e.g. static assets /assets/css/styles.css)
  fs.stat(fullPath, (err, stat) => {
    if (!err && stat.isFile()) {
      serveFile(fullPath);
      return;
    }

    if (!err && stat.isDirectory()) {
      // Check for index.html inside directory
      const subIndex = path.join(fullPath, 'index.html');
      if (fs.existsSync(subIndex)) {
        serveFile(subIndex);
        return;
      }
    }

    // 5. Clean URL rewrite: Check if fullPath + '.html' exists
    // (e.g. /about -> about.html, /sonicmediaadmin -> sonicmediaadmin.html, /services/web -> services/web.html, /samples/sample-dentist -> samples/sample-dentist.html)
    const htmlCandidate = fullPath + '.html';
    fs.stat(htmlCandidate, (htmlErr, htmlStat) => {
      if (!htmlErr && htmlStat.isFile()) {
        serveFile(htmlCandidate);
        return;
      }

      // Backward-compatible alias for /sample-* or /sweetbasket -> samples/*.html
      if (pathname.startsWith('/sample-') || pathname === '/sweetbasket') {
        const sampleTarget = path.join(ROOT_DIR, 'samples', pathname.slice(1) + '.html');
        if (fs.existsSync(sampleTarget)) {
          serveFile(sampleTarget);
          return;
        }
      }

      // 6. Special dynamic routes: /project/:id, /article/:id, /case-study/:id, /studio
      if (pathname.startsWith('/project/')) {
        const projectTarget = path.join(ROOT_DIR, 'project.html');
        if (fs.existsSync(projectTarget)) {
          serveFile(projectTarget);
          return;
        }
      }
      if (pathname.startsWith('/article/')) {
        const articleTarget = path.join(ROOT_DIR, 'article.html');
        if (fs.existsSync(articleTarget)) {
          serveFile(articleTarget);
          return;
        }
      }
      if (pathname.startsWith('/case-study/')) {
        const csTarget = path.join(ROOT_DIR, 'case-study.html');
        if (fs.existsSync(csTarget)) {
          serveFile(csTarget);
          return;
        }
      }
      if (pathname.startsWith('/casestudies/') && pathname !== '/casestudies') {
        const csTarget = path.join(ROOT_DIR, 'case-study.html');
        if (fs.existsSync(csTarget)) {
          serveFile(csTarget);
          return;
        }
      }
      if (pathname === '/studio') {
        const studioTarget = path.join(ROOT_DIR, 'portfolio.html');
        if (fs.existsSync(studioTarget)) {
          serveFile(studioTarget);
          return;
        }
      }

      // 7. Not found
      serve404();
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  The Sonic Media — Clean URL Dev Server Running!`);
  console.log(`  Local URL:        http://localhost:${PORT}/`);
  console.log(`  Clean Routes:     http://localhost:${PORT}/about`);
  console.log(`                    http://localhost:${PORT}/services`);
  console.log(`                    http://localhost:${PORT}/portfolio`);
  console.log(`                    http://localhost:${PORT}/casestudies`);
  console.log(`                    http://localhost:${PORT}/journal`);
  console.log(`                    http://localhost:${PORT}/contact`);
  console.log(`======================================================\n`);
});
