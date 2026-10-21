# Universal Visual Builder Image & Media Customization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Empower the administrator with complete, tactile control over all image and media sections in the Visual Page Builder (`admin-builder.html`), including visual drag-to-resize (width & height), visual drag-to-reposition (focal point / object-position), dynamic grid column layouts (1, 2, 3, 4, 5, 6 images per row), custom aspect ratios, gap controls, and slider/carousel dimensions.

**Architecture:**
1. **Interactive Canvas Resizers (`admin-builder.html` & `assets/css/section-builder.css`)**: Attach visual resize handles (bottom for height, right for width, bottom-right corner for both) to selected image/media sections in the builder canvas with live pixel tooltip feedback and constraint snapping.
2. **Visual Focal Point & Pan Repositioning**: Provide an interactive drag-to-reposition interaction directly on images and an interactive 2D Focal Pad in the inspector, adjusting `object-position` / `background-position` in real time.
3. **Advanced Grid & Gallery Engine (`assets/js/section-registry.js`)**: Extend `image_grid` and `gallery` with dynamic column controls (1–6 cols), aspect ratio presets (`16:9`, `4:3`, `1:1`, `3:4`, `2:3`, `auto`), custom gap slider (0–60px), and item reordering.
4. **Enhanced Carousel / Slider Controls**: Expose customizable slide heights, slide widths (`100%`, `50%`, `33%`, `85% peek`), autoplay timers, and navigation toggles.
5. **Universal Public Renderer Compatibility**: Ensure `project.html`, `case-study.html`, and `article.html` render the custom dimensions, alignments, and column styles faithfully.

**Tech Stack:** Vanilla JavaScript (ES6+), CSS3 Grid & Flexbox, Pointer Events API, Supabase Database & JSONB.

---

### Task 1: Interactive Canvas Drag-to-Resize Component

**Files to modify:**
- `admin-builder.html`
- `assets/css/section-builder.css`

**Objectives:**
- Add visual bounding box handles to the selected section on the builder canvas:
  - `resize-handle-s` (bottom edge) for height adjustment.
  - `resize-handle-e` (right edge) for width adjustment.
  - `resize-handle-se` (bottom-right corner) for dual dimension adjustment.
- Implement pointer event handlers (`pointerdown`, `pointermove`, `pointerup`) with pointer capture so dragging is buttery smooth across the canvas even if the cursor leaves the element.
- Display a floating dimension badge tooltip during drag (e.g. `Height: 520px · Width: 100%`).
- Commit the resulting dimensions into `section.settings` on pointer up and trigger history/undo state.

---

### Task 2: Visual Drag-to-Reposition & Focal Point Controller

**Files to modify:**
- `admin-builder.html`
- `assets/css/section-builder.css`
- `assets/js/section-registry.js`

**Objectives:**
- Support 2D focal point repositioning for:
  - Hero background images (`hero`)
  - Standalone image & banner (`image`)
  - Carousel slides (`carousel`)
  - Grid items (`image_grid` & `gallery`)
- Add a "Reposition Image" toggle on selected media blocks. When enabled, dragging over the image smoothly adjusts `object-position: X% Y%` or `background-position: X% Y%`.
- Add an interactive 2D Focal Pinpoint Pad in the Inspector panel with a 9-point quick-alignment grid (Top-Left, Center, Bottom-Right, etc.) for users who prefer one-click presets.

---

### Task 3: Advanced Grid Layouts (1, 2, 3, 4, 5, 6 Columns & Gaps)

**Files to modify:**
- `assets/js/section-registry.js`
- `admin-builder.html`
- `assets/css/section-builder.css`

**Objectives:**
- Upgrade `image_grid` and `gallery` sections to support:
  - **Columns**: `1 Column` (Full Width Stack), `2 Columns` (50/50), `3 Columns` (33/33/33), `4 Columns` (25/25/25/25), `5 Columns`, and `6 Columns`.
  - **Gap Slider**: 0px (edge-to-edge collage) up to 60px (airy luxury spacing).
  - **Card Aspect Ratio**: `16:9` (Widescreen), `4:3` (Standard), `1:1` (Square), `3:4` (Portrait), `2:3` (Tall Poster), or `Natural / Auto` (Original image ratio).
  - **Item Heights**: Uniform card height or auto-fitting height with customizable container padding.
  - **Visual Item Reorder**: Drag handles to reorder images within the grid list inside the properties inspector.

---

### Task 4: Complete Carousel & Slider Customization

**Files to modify:**
- `assets/js/section-registry.js`
- `admin-builder.html`

**Objectives:**
- Add complete controls to `carousel`:
  - Slide height slider / drag handle (250px up to 900px).
  - Visible slide count / width: `1 Slide (100% full screen)`, `2 Slides (50% each)`, `3 Slides (33% each)`, or `Peek mode (85% width)`.
  - Autoplay timer speed (1 second to 15 seconds) with toggle.
  - Show/hide arrows and show/hide dot indicators.
  - Pause-on-hover toggle.

---

### Task 5: Dual Synchronization with Properties Inspector

**Files to modify:**
- `admin-builder.html`

**Objectives:**
- Ensure that any visual adjustment made by dragging directly on the canvas updates the respective numeric inputs and sliders in the right-hand Properties Inspector in real time, and vice versa.
- Provide direct text/number input boxes for precise pixel entry (`450px`, `100%`, `1200px`).

---

### Task 6: Public Display Pages Verification & Compatibility

**Files to verify:**
- `project.html`
- `case-study.html`
- `article.html`

**Objectives:**
- Confirm that all newly added settings (`object-position`, custom height, custom width, 1–6 column grids, aspect ratios, gap spacing) render identically on the live public websites as seen in the builder preview.
- Ensure 100% mobile responsiveness (auto-stacking grids on narrow screens while preserving desktop multi-column layouts).

---

### Task 7: End-to-End Automated & Browser Verification

**Test cases:**
1. Resize a Hero and a Single Image via canvas drag handle and verify height persists upon save.
2. Reposition image focal point by dragging and verify `object-position` applies.
3. Switch an Image Grid from 2 columns to 3 columns, then to 4 columns, and change gap to 10px.
4. Adjust Carousel height to 600px and set 2 slides side-by-side.
5. Save draft, publish, and verify live preview on `project.html`, `case-study.html`, and `article.html`.
