# Supabase Customization Admin Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a secure, secret admin panel at `/sonicmediaadmin` connected to the Supabase project "Sonic Media" (`plytoawhcvzdjtrgtnrn`) to manage and customize Portfolio, Case Studies, and Journal content without touching code.

**Architecture:** 
1. **Supabase Database & Auth**: Create dedicated tables (`portfolio_items`, `case_studies`, `journal_posts`, `site_content`) in the Sonic Media project with Row Level Security (RLS: public read, authenticated-only write). Create Supabase Storage bucket for image uploads. Create an admin user via Supabase Auth.
2. **Secret Admin Panel (`sonicmediaadmin.html`)**: Hidden standalone dashboard accessed only via secret route `/sonicmediaadmin`, completely unlinked from navigation/sitemaps and disallowed in `robots.txt`. Protected by Supabase Auth (Admin ID & Password). Rich luxury dark UI matching Sonic Media branding.
3. **Frontend Dynamic Hydration (`assets/js/app.js`)**: Fetch customized data on load from Supabase and dynamically update `PAGE_DATA`, with instant static fallback if offline or loading.

**Tech Stack:**
- Supabase (PostgreSQL 17, Supabase Auth, Supabase Storage, JS SDK v2 CDN)
- Supabase Project: `Sonic Media` (`plytoawhcvzdjtrgtnrn`, Region: `ap-south-1`)
- Frontend: Vanilla HTML5, CSS3 (Syne / DM Sans / Bebas Neue, #FF5C00 accents), JavaScript (ES6+)
- Deployment / Routing: Vercel cleanUrls & rewrites

---

### Task 1: Supabase Database Schema & Storage Setup

**Project Context:**
- Supabase Project ID: `plytoawhcvzdjtrgtnrn` (Sonic Media)
- Server-side tool: `supabase` MCP `apply_migration` or `execute_sql`

**Step 1: Write SQL migration for tables, RLS policies, and triggers**

Tables to create:
1. `site_content`
   - `key` (text, primary key) — e.g. `'portfolio_header'`, `'casestudies_header'`, `'journal_header'`
   - `data` (jsonb, not null)
   - `updated_at` (timestamptz default now())
2. `portfolio_items`
   - `id` (text, primary key) — slug ID e.g. `'luxefashion'`
   - `display_order` (integer default 0)
   - `num` (text) — display number e.g. `'01'`
   - `cat` (text) — category name
   - `name` (text) — project title
   - `tags` (text[]) — array of tags
   - `img` (text) — cover image URL
   - `metric_val` (text) — e.g. `'Live'`, `'Done'`
   - `metric_lbl` (text) — e.g. `'lcpladvisory.com'`
   - `details` (jsonb) — subtitle, industry, location, year, status, about, challenge, solution, deliverables[], images[]
   - `created_at` (timestamptz default now())
   - `updated_at` (timestamptz default now())
3. `case_studies`
   - `id` (text, primary key) — slug ID e.g. `'d2c-growth-playbook'`
   - `display_order` (integer default 0)
   - `img` (text)
   - `cat` (text) — category key e.g. `'strategy'`
   - `cat_label` (text) — e.g. `'Strategy'`
   - `date` (text) — e.g. `'May 18, 2026'`
   - `title` (text)
   - `excerpt` (text)
   - `created_at` (timestamptz default now())
   - `updated_at` (timestamptz default now())
4. `journal_posts`
   - `id` (text, primary key) — slug ID e.g. `'blog-google-ai-seo'`
   - `display_order` (integer default 0)
   - `num` (text) — e.g. `'01'`
   - `title` (text)
   - `cat` (text) — e.g. `'SEO'`
   - `read_time` (text) — e.g. `'7 min read'`
   - `date` (text) — e.g. `'May 2026'`
   - `thumb_url` (text)
   - `content` (text)
   - `created_at` (timestamptz default now())
   - `updated_at` (timestamptz default now())

**Step 2: Apply RLS policies**
- Enable RLS on all 4 tables:
  ```sql
  ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
  ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE journal_posts ENABLE ROW LEVEL SECURITY;

  -- Public read
  CREATE POLICY "Public read site_content" ON site_content FOR SELECT USING (true);
  CREATE POLICY "Public read portfolio_items" ON portfolio_items FOR SELECT USING (true);
  CREATE POLICY "Public read case_studies" ON case_studies FOR SELECT USING (true);
  CREATE POLICY "Public read journal_posts" ON journal_posts FOR SELECT USING (true);

  -- Authenticated write (Admin only)
  CREATE POLICY "Admin write site_content" ON site_content FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Admin write portfolio_items" ON portfolio_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Admin write case_studies" ON case_studies FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "Admin write journal_posts" ON journal_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  ```

**Step 3: Setup Storage Bucket for Image Uploads**
- Bucket: `sonicmedia-assets` (public read, authenticated write).

---

### Task 2: Supabase Initial Data Seeding

**Files:**
- Reference: `assets/js/app.js:1906-2134` (PAGE_DATA) & `assets/js/app.js:648-827` (workDetails)

**Step 1: Construct Seed SQL Script**
- Insert all 6 existing portfolio items with their complete `workDetails` (about, deliverables, gallery images, metrics).
- Insert all 9 existing case studies with categories, excerpts, images.
- Insert all 10 existing journal posts with categories, read times, thumbnails.
- Insert default section headers for Portfolio, Case Studies, and Journal.

**Step 2: Execute Seed Script on Supabase**
- Run via MCP `execute_sql` on `plytoawhcvzdjtrgtnrn`.

**Step 3: Verify Data Integrity**
- Query row counts: 6 portfolio items, 9 case studies, 10 journal posts, 3 site_content records.

---

### Task 3: Secure Admin Authentication Setup

**Goal:** Provide secure ID and Password for the Admin Panel so only authorized users can log in.

**Step 1: Create Admin User in Supabase Auth**
- User identifier: `admin@thesonicmedia.com` (Admin Login ID)
- Generate a high-entropy cryptographically secure password.
- Insert into Supabase `auth.users` via Supabase API / SQL with confirmed email.

**Step 2: Test Authentication via Supabase Client**
- Verify `supabase.auth.signInWithPassword({ email, password })` produces a valid JWT session.
- Prepare secure credential handoff format for the user.

---

### Task 4: Dynamic Frontend Hydration in the Public Website

**Files:**
- Modify: `index.html` (add Supabase JS CDN)
- Modify: `studio.html` (add Supabase JS CDN)
- Modify: `casestudies.html` (add Supabase JS CDN)
- Modify: `journal.html` (add Supabase JS CDN)
- Modify: `assets/js/app.js` (add Supabase fetch and hydration function)

**Step 1: Add Supabase JS client to public pages**
- Add `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` before `assets/js/app.js`.

**Step 2: Add `syncSupabaseData()` to `assets/js/app.js`**
- Initialize Supabase client using project URL `https://plytoawhcvzdjtrgtnrn.supabase.co` and publishable/anon key.
- Fetch `portfolio_items`, `case_studies`, `journal_posts`, and `site_content`.
- When data arrives:
  1. Update `PAGE_DATA.portfolio.works` with rows from `portfolio_items`.
  2. Update `workDetails` dictionary with `details` JSON from `portfolio_items`.
  3. Update `PAGE_DATA.casestudies.items` with rows from `case_studies`.
  4. Update `PAGE_DATA.journal.posts` with rows from `journal_posts`.
  5. Update section headers (`PAGE_DATA.portfolio.eyebrow`, `titleMain`, etc.) from `site_content`.
  6. Re-trigger `renderPageData()`.
- **Zero layout shift / offline resilience**: Default embedded `PAGE_DATA` renders immediately on DOMContentLoaded. Supabase data smoothly updates in-place once received.

---

### Task 5: Build Secret Admin Panel (`sonicmediaadmin.html`)

**Files:**
- Create: `sonicmediaadmin.html` (standalone single-file admin app with embedded scoped CSS & JS)

**Features & Layout:**
1. **Security & Login Gateway**:
   - Hidden authentication modal when no valid Supabase session exists.
   - Fields: Admin Login ID (Email), Password, "Remember session" checkbox, Sign In button.
   - Error handling: Invalid credentials message, loading animation.
   - Auto-logout on token expiration.

2. **Dashboard Navigation Bar**:
   - Sonic Media Logo + Badge `ADMIN CONTROL CENTER`.
   - Live Site preview button (opens in new tab).
   - Admin status indicator ("Connected to Sonic Media Supabase").
   - Logout button.

3. **Tab 1: Portfolio Manager**:
   - List view showing: Reorder drag/number, Thumbnail, Project Name, Category, Status/Metric, Actions (Edit, Delete).
   - "Add New Portfolio Item" button.
   - Edit/Create Modal:
     - Basic Info: Slug ID, Number (`01`), Category (dropdown + custom), Project Name.
     - Tags: pill input / comma separated.
     - Cover Image: Image URL input + direct upload button (uploads to Supabase Storage).
     - Metric: Metric Value (`Live`, `Done`, `+340%`), Metric Label (`lcpladvisory.com`).
     - Detail Page Fields: Subtitle, Industry, Location, Year, Status, About text, Challenge text, Solution text.
     - Deliverables list (add/remove bullet points).
     - Gallery Images list (URL, Title, Description).
   - Save / Delete with confirmation and instant toast alerts.

4. **Tab 2: Case Studies Manager**:
   - List view of all case studies with category tags.
   - "Add New Case Study" button.
   - Edit/Create Modal:
     - Slug ID, Title, Category (`strategy`, `performance`, `seo`, `social`, `branding`, `technology`), Category Label, Date, Image URL (+ upload), Excerpt.
   - Save / Delete with instant toast alerts.

5. **Tab 3: Journal Manager**:
   - List view of all blog posts.
   - "Add New Journal Post" button.
   - Edit/Create Modal:
     - Slug ID, Post Number (`01`), Title, Category (`SEO`, `Performance`, `Branding`, `Social Media`, etc.), Read Time (`7 min read`), Date (`May 2026`), Thumbnail URL (+ upload).
   - Save / Delete with instant toast alerts.

6. **Tab 4: Section Headers & Texts**:
   - Form to edit:
     - Portfolio Eyebrow, Title Main, Title Sub, Title Highlight, Tagline.
     - Case Studies Tag, Title Main, Title Highlight.
     - Journal Tag, Title Main, Title Highlight.
   - One-click "Save All Headers" button.

7. **Aesthetics & UX**:
   - Luxury Dark UI matching Sonic Media: `#09090b` dark background, `#FF5C00` brand orange accents, `#18181b` card surfaces, subtle borders `#27272a`, Syne & DM Sans typography, glassmorphism, responsive for mobile and desktop.

---

### Task 6: Secret Routing & Concealment Configuration

**Files:**
- Modify: `vercel.json` (route configuration)
- Modify: `robots.txt` (search engine crawler exclusion)
- Verify: `sitemap.xml` (ensure admin URL is NOT present)

**Step 1: Configure `vercel.json`**
- Ensure `/sonicmediaadmin` rewrites directly to `/sonicmediaadmin.html` without redirects that leak in URLs or search engines:
  ```json
  "rewrites": [
    { "source": "/sonicmediaadmin", "destination": "/sonicmediaadmin.html" }
  ]
  ```

**Step 2: Update `robots.txt`**
- Add:
  ```
  User-agent: *
  Disallow: /sonicmediaadmin
  Disallow: /sonicmediaadmin.html
  Allow: /
  ```

**Step 3: Verification of Absolute Secrecy**
- Check that `/sonicmediaadmin` is NOT referenced in:
  - Header navigation (`index.html`, `about.html`, `studio.html`, `casestudies.html`, `journal.html`, etc.)
  - Mobile navigation
  - Footer links
  - `sitemap.xml`
  - Public JS bundles

---

### Task 7: Verification & Credential Delivery

**Step 1: Test Login & CRUD Operations**
- Log into `/sonicmediaadmin` using the created Admin ID and Password.
- Test editing a Portfolio item (e.g., updating a title/tagline) -> Verify it updates in Supabase and displays on the public website.
- Test editing a Case Study -> Verify live update.
- Test editing a Journal post -> Verify live update.
- Test section headers customization -> Verify live update.

**Step 2: Hand Off Credentials Securely**
- Hand the user:
  - Admin Panel URL: `https://thesonicmedia.com/sonicmediaadmin` (and local URL `http://localhost:3000/sonicmediaadmin`)
  - Admin Login ID
  - Admin Password
  - Security instructions (how to change password, manage content, and keep the URL confidential).
