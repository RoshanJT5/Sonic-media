# The Sonic Media — Official Website Repository

> Premium Digital Marketing & AI Automation Agency Website

---

## 📚 Library & Folder Organization

The project is organized into clear directories for easy access and maintainability:

| Directory / File | Description |
| :--- | :--- |
| **`index.html`** & root pages | Core user-facing routes (`/about`, `/services`, `/portfolio`, `/contact`, `/sonicmediaadmin`, etc.) |
| **`services/`** | 10 specialized service landing pages (`/services/ai`, `/services/web`, `/services/smm`, etc.) |
| **`samples/`** | Client demo & pitch mockups (`/samples/sample-dentist`, `/samples/sweetbasket`, etc.) |
| **`assets/css/`** | Global stylesheet (`styles.css`) containing design tokens, bento layouts & animations |
| **`assets/js/`** | Scripts (`app.js`, `sonic-live-cms.js`, `supabase-rest.js`, `service-page-optimizations.js`) |
| **`assets/images/`** | Local brand graphics, icons, and favicons |
| **`server/`** | Clean-URL local development servers (`server.js` and `server.py`) |
| **`docs/`** | Architectural specifications & implementation documentation ([Architecture Guide](docs/ARCHITECTURE.md)) |

---

## ⚡ Quick Start (Local Development)

```bash
# Start local clean-URL Node server (port 8080)
npm run dev

# Or start Python 3 clean-URL server (port 8080)
npm run serve:py
```

Once running, navigate to `http://localhost:8080/`.

---

## 🌐 Production Deployment

The project is configured out-of-the-box for seamless deployment:
- **Vercel**: Configuration in `vercel.json` (clean URLs, CSP report-only, security headers, dynamic rewrites)
- **Netlify / Cloudflare Pages**: Clean URL routing configured in `_redirects`
- **Apache / LiteSpeed**: Mod_rewrite rules configured in `.htaccess`

For full technical specifications, database architecture, and routing rules, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
