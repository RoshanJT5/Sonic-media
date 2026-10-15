# The Sonic Media — Project Architecture & Library Catalogue

Welcome to **The Sonic Media** codebase repository. This project is structured like an organized digital library, separating concerns cleanly across routes, services, assets, mockups, documentation, and local development tools.

---

## 🏛️ High-Level Directory Overview

```
sanjukhatwani99-ux-sonic-media-website-main/
├── index.html                      # Homepage (Hero, Bento Grid, Philosophy, Testimonials, CTA)
├── about.html                      # Agency Story, Leadership, Values & Credentials
├── services.html                   # High-level Services Directory (10 Core Disciplines)
├── portfolio.html                  # Agency Work & Case Study Gallery
├── project.html                    # Dynamic Project Case Viewer (URL param: ?id=...)
├── casestudies.html                # Dedicated Case Studies Hub
├── case-study.html                 # Dynamic Case Study Viewer (URL param: ?id=...)
├── journal.html                    # Insights & Thought Leadership Articles Directory
├── article.html                    # Dynamic Article Viewer (URL param: ?id=...)
├── contact.html                    # Client Consultation & Discovery Booking Form
├── faq.html                        # Agency FAQ & Client Onboarding Questions
├── future.html                     # Agency Vision & Future Roadmap
├── linktree.html                   # Link-in-Bio Quick Access Hub
├── studio.html                     # Studio Showcase / Alternate Portfolio View
├── sonicmediaadmin.html            # Protected CMS Admin Portal (Supabase Powered)
│
├── assets/                         # Static Assets Library
│   ├── css/                        # Global & Page Style Definitions
│   │   └── styles.css              # Main Design System & Responsive Tokens
│   ├── js/                         # Client Scripts & Dynamic Modules
│   │   ├── app.js                  # Primary Interactive Behaviors & Navigation
│   │   ├── sonic-live-cms.js       # Live Supabase CMS Fetching & Dynamic Rendering
│   │   ├── supabase-rest.js        # Supabase Direct REST API Helper
│   │   └── service-page-optimizations.js # Scroll, animations & service optimizations
│   ├── images/                     # Local Brand Images & Fallbacks
│   │   ├── favicon.ico
│   │   └── favicon.png
│   └── icons/                      # Local SVG / Vector Icon Definitions
│
├── services/                       # Specialized Service Landing Pages (Clean URLs)
│   ├── ai.html                     # AI Automation & Workflows (/services/ai)
│   ├── app.html                    # App Development (/services/app)
│   ├── brand.html                  # Brand Identity & Strategy (/services/brand)
│   ├── content.html                # Content Creation & Production (/services/content)
│   ├── ecom.html                   # E-Commerce Growth (/services/ecom)
│   ├── inf.html                    # Influencer Marketing (/services/inf)
│   ├── perf.html                   # Performance Marketing & Ads (/services/perf)
│   ├── seo.html                    # Search Engine Optimization (/services/seo)
│   ├── smm.html                    # Social Media Management (/services/smm)
│   └── web.html                    # High-Performance Web Development (/services/web)
│
├── samples/                        # Dedicated Client Pitch & Industry Demo Templates
│   ├── sample-dentist.html         # Dental Practice Showcase (/samples/sample-dentist)
│   ├── sample-finance-dsa.html     # Financial / Loan DSA Template (/samples/sample-finance-dsa)
│   ├── sample-interiordesigner.html# Luxury Interior Design Template (/samples/sample-interiordesigner)
│   ├── sample-verdan.html          # Verdan Corporate Brand Demo (/samples/sample-verdan)
│   ├── sample-vertex.html          # Vertex Technology Product Demo (/samples/sample-vertex)
│   └── sweetbasket.html            # Sweet Basket Artisanal E-Commerce Demo (/samples/sweetbasket)
│
├── server/                         # Local Development Server Tooling
│   ├── server.js                   # Node.js Clean URL Dev Server (Port 8080)
│   └── server.py                   # Python 3 Clean URL Dev Server (Port 8080)
│
├── docs/                           # Documentation, Architecture & Project Specifications
│   ├── ARCHITECTURE.md             # This structural catalog & maintenance guide
│   └── plans/                      # Strategic Implementation Plans & Roadmaps
│       └── 2026-10-14-supabase-admin-panel.md
│
├── _redirects                      # Netlify & Cloudflare Pages Clean URL Rewrites
├── vercel.json                     # Vercel Deployment Configuration & Security Headers
├── .htaccess                       # Apache / LiteSpeed Server Rewrite Rules
├── package.json                    # NPM Scripts & Project Meta
├── sitemap.xml                     # Search Engine Indexing Sitemap
└── robots.txt                      # Search Engine Crawler Directives
```

---

## 🗂️ Library Sections Explained

### 1. Core Route Pages (Root Directory)
All user-facing public root routes (`index.html`, `about.html`, `services.html`, etc.) reside at the root level.
- **Why Root?** Static hosting providers (Netlify, Vercel, Cloudflare, Apache) and local servers serve root paths (`/about`, `/contact`) directly from root HTML files without deep subdirectory rewrite dependencies.
- **Dynamic Readers**: `project.html`, `case-study.html`, and `article.html` act as dynamic templates. When accessed via clean URLs (e.g., `/project/lux-brand` or `/article/future-of-marketing`), they read query parameters or URL slugs to load dynamic content from the Supabase database.

### 2. Services Directory (`services/`)
Contains 10 standalone, high-converting service landing pages.
- Access URL: `https://thesonicmedia.com/services/<service-name>` (e.g. `/services/web`, `/services/ai`).
- Each page is fully styled and optimized with schema markup, breadcrumb navigation, and CTA forms.

### 3. Samples Directory (`samples/`)
Contains self-contained client demo prototypes used during sales pitches and client previews.
- Kept separate from core agency pages to keep root clean.
- All sample files are completely self-contained.
- Backward-compatible routing rules ensure legacy URLs like `/sample-dentist` or `/sweetbasket` continue working flawlessly.

### 4. Assets Library (`assets/`)
The visual and behavioral foundation of the website:
- **`assets/css/styles.css`**: Design tokens, color system (Sonic Orange `#FF5C00`, Dark `#080808`), typography, responsive media queries, and global UI components.
- **`assets/js/`**:
  - `app.js`: Main client interactions, mobile drawer, smooth scroll, form validation.
  - `sonic-live-cms.js`: Real-time Supabase CMS fetch and DOM hydration for dynamic projects, articles, and reviews.
  - `supabase-rest.js`: Direct HTTP REST helpers for Supabase communication.
  - `service-page-optimizations.js`: Performance enhancements and scroll observers for service pages.
- **`assets/images/` & `assets/icons/`**: Local repository asset home for brand marks, favicons, and vector icons.

### 5. Local Server Suite (`server/`)
Contains lightweight local servers configured to replicate production clean URLs:
- **Node Server**: `npm run dev` or `node server/server.js 8080`
- **Python Server**: `npm run serve:py` or `python server/server.py 8080`
Both servers automatically handle clean URLs (e.g., `/about` serves `about.html`), redirect `.html` extensions to clean URLs, and safely resolve nested routes.

---

## 🚀 Running the Project Locally

```bash
# Option 1: Node.js (Recommended)
npm run dev

# Option 2: Python 3
npm run serve:py

# The server will start at http://localhost:8080/
```

---

## 🔒 Security & Admin Panel (`sonicmediaadmin.html`)
- Accessible at `/sonicmediaadmin`.
- Protected by Supabase Auth with Row Level Security (RLS).
- Provides comprehensive CRUD management for projects, articles, case studies, client reviews, and contact inquiries.
- Includes clear, user-friendly error indicators for database connection and credentials.
