# Design System: Engram Memory OS
**Project ID:** 14875471080970522092
**Stitch Project:** Engram Memory OS UI
**Device Type:** Desktop
**Color Mode:** Dark

---

## 1. Visual Theme & Atmosphere

**Creative North Star: "The Cognitive Loom"**

Engram's interface is a **high-precision instrument for thought** — not a generic dashboard. The aesthetic is **Hyper-Functional Stoicism**: inspired by high-end developer tools (IDE internals, advanced version control) but elevated through an editorial lens.

The atmosphere is **dense, silent, and structurally unassailable**. Think of it as an extension of the developer's mind — a place where every pixel exists to serve the memory architecture. The UI achieves its signature feel through extreme density, rigorous alignment, and a **"No-Line" philosophy** that uses tonal shifts instead of structural borders.

**Key Atmosphere Words:** Obsidian, Precision, Dense-but-Breathable, Monochromatic, Stoic, IDE-Grade, Editorial

---

## 2. Color Palette & Roles

### Primary Accent
- **Luminous Indigo** (`#C0C1FF`) — Primary text accent, active nav indicators, link color
- **Electric Violet Container** (`#8083FF`) — Primary action buttons, CTA backgrounds, gradient endpoint
- **Deep Royal Indigo** (`#6366F1`) — Custom brand color, signature identity tone

### Surface Hierarchy (The Nesting Principle)
Depth is created through **tonal layering**, never through borders. Containers move from lowest (deepest background) to highest (most interactive foreground):

- **The Void** (`#0A0E13` / `surface_container_lowest`) — Deepest recessive areas, sunken inputs
- **Deep Obsidian Canvas** (`#101419` / `surface_dim` / `background`) — The foundation canvas
- **Structural Charcoal** (`#181C21` / `surface_container_low`) — Sidebar background, large structural areas
- **Component Stage** (`#1C2025` / `surface_container`) — Main content area backgrounds
- **Elevated Slate** (`#262A30` / `surface_container_high`) — Card backgrounds, raised elements
- **Interactive Surface** (`#31353B` / `surface_container_highest`) — Active/hover states, highest prominence
- **Bright Surface** (`#36393F` / `surface_bright`) — Maximum brightness for focused interactions

### Text Colors
- **Primary Text** (`#E0E2EA` / `on_surface`) — Main body text, headings — never pure white
- **Secondary Metadata** (`#AFB5C2` / `on_secondary_container`) — Non-essential data points, timestamps, labels
- **Muted Guide** (`#C7C4D7` / `on_surface_variant`) — Tertiary text, descriptions
- **On Primary** (`#1000A9` / `on_primary`) — Text on primary-colored backgrounds

### Accent & Status Colors
- **Warm Amber Signal** (`#FFB783` / `tertiary`) — System alerts, warning badges
- **Amber Container** (`#D97721` / `tertiary_container`) — Warm accent containers
- **Cool Steel Secondary** (`#C0C7D3` / `secondary`) — User tags, secondary badges
- **Error Scarlet** (`#FFB4AB` / `error`) — Error states, destructive actions
- **Error Container** (`#93000A` / `error_container`) — Error backgrounds

### Structural Colors
- **Ghost Line** (`#464554` / `outline_variant`) — Ghost borders at 15% opacity — felt, not seen
- **Subtle Outline** (`#908FA0` / `outline`) — Visible but understated structural hints

### Signature Texture
**Technical Gradient:** Primary CTAs use a linear gradient from `#C0C1FF` → `#8083FF` at 150° angle. This creates a microscopic sense of "material" that flat hex codes lack, making buttons feel premium and physical.

---

## 3. Typography Rules

**Font Family:** Inter (exclusive) — chosen for its high-legibility ink traps, ideal for dense technical interfaces.

### The Density Scale
| Role | Weight | Line-Height | Letter-Spacing | Color Token |
|------|--------|-------------|----------------|-------------|
| **Headings** (`title-sm` to `headline-sm`) | Medium (500) | 1.1 | -0.02em | `on_surface` (#E0E2EA) |
| **Body Content** (`body-md`) | Regular (400) | 1.25 | Normal | `on_surface` (#E0E2EA) |
| **Metadata/Labels** (`label-sm`) | Regular (400) | 1.2 | 0.01em | `on_secondary_container` (#AFB5C2) |
| **Nav Items** (`label-md`) | Medium (500) | 1.3 | Normal | `on_surface` (#E0E2EA) |

**Philosophy:** "Information density without information fatigue." The tight leading (1.25) creates the professional, compact feel of a technical manual.

---

## 4. Component Stylings

### Sidebar (Fixed Left Panel)
- **Background:** Structural Charcoal (`#181C21` / `surface_container_low`)
- **Width:** 240px fixed
- **Nav Items:** `label-md`, Medium weight
- **Active State:** Interactive Surface (`#31353B`) background + 2px vertical Luminous Indigo (`#C0C1FF`) strip on left edge
- **Hover State:** `surface_container_highest` background transition
- **Logo Area:** "Engram" wordmark + "Memory OS" subtitle in Luminous Indigo accent

### Primary Buttons ("Power Cells")
- **Shape:** Subtly rounded (4px / 0.25rem) — sharp, architectural feel
- **Background:** Electric Violet Container (`#8083FF`)
- **Text:** Deep Indigo (`#0D0096` / `on_primary_container`), Bold weight
- **Hover:** Increase brightness by 5%
- **Active:** Decrease brightness by 5%
- **CTA Variant:** Technical Gradient (150° from `#C0C1FF` to `#8083FF`)

### Cards & Containers
- **Corner Radius:** 4px (0.25rem) — precision-tooled, not consumer-soft
- **Background:** Component Stage (`#1C2025`) or Elevated Slate (`#262A30`)
- **Separation:** No borders. Tonal shift between nesting levels defines boundaries
- **Content Padding:** 16px (1rem) internal, consistent 4px grid alignment
- **Never use** corners > 8px — overly round feels too consumer-focused

### Input Fields ("Data Entry Ports")
- **Background:** The Void (`#0A0E13` / `surface_container_lowest`)
- **Border:** Ghost Border — 1px `outline_variant` (`#464554`) at 20% opacity
- **Focus State:** 1px `primary` (`#C0C1FF`) border. No outer glow.
- **Corner Radius:** 4px (0.25rem)

### Compact Rows & Lists
- **Rule:** Absolutely NO divider lines between items
- **Vertical Padding:** 8px (`spacing-2`) per row
- **Hover State:** `surface_container_high` (#262A30) background to define row boundaries
- **Trailing Elements:** `label-sm` for timestamps/metadata, right-aligned to create a strong vertical "axis of data"
- **Separation:** Use background color shifts + padding, never `<hr>` or borders

### Simple Badges / Tags
- **Size:** `label-sm` text
- **Style:** No fill background. 1px ghost border using `outline_variant` (#464554)
- **System Alerts:** Warm Amber Signal (`#FFB783`) text/border
- **User Tags:** Cool Steel Secondary (`#C0C7D3`) text/border
- **Memory Type Tags:** Use badge colors to distinguish `bug_fix`, `decision`, `pattern`, `warning`, `preference`, `architecture`

### Floating Overlays & Tooltips
- **Background:** Component Stage (`#1C2025`) at 85% opacity
- **Effect:** `backdrop-filter: blur(12px)` — underlying data bleeds through, maintaining context
- **Shadow:** Ghost Shadow — Blur: 32px, Y: 8px, Color: `surface_container_lowest` at 40% opacity
- **Corner Radius:** 4px

### Status Indicators
- **System Health:** Circular progress indicator with Luminous Indigo (`#C0C1FF`)
- **Memory Confidence:** Horizontal bar with gradient from low (muted) to high (indigo)
- **Active Sessions:** Pulsing dot in Luminous Indigo

---

## 5. Layout Principles

### Grid & Alignment
- **Base Grid:** 4px grid — every element snaps precisely. Inconsistency in a dense UI feels like an error.
- **Spacing Scale:** 4px, 8px, 12px, 16px, 24px, 32px, 48px
- **Content Density:** Aim for 15–20% more content per screen than a standard web app

### Page Structure
```
┌──────────────────────────────────────────────────┐
│ [Sidebar 240px] │ [Main Content Area]            │
│                 │                                │
│ Logo            │ [Top Bar: Search + Actions]    │
│ ─ Dashboard     │                                │
│ ─ Memories      │ [Content Grid / List]          │
│ ─ Sessions      │                                │
│ ─ Context       │                                │
│ ─ Settings      │ [Detail Panel / Stats]         │
│                 │                                │
│ [Project Select]│                                │
│ [Session Info]  │                                │
└──────────────────────────────────────────────────┘
```

### The "No-Line" Rule
**Explicit Instruction:** Do NOT use 1px solid borders to separate major sections. Boundaries must be defined solely through background color shifts.
- *Correct:* Sidebar (`surface_container_low` #181C21) meets Main Stage (`surface_dim` #101419). The contrast IS the line.
- *Incorrect:* Adding a `border-right: 1px solid #333` to the sidebar.

### Visual Breathing Room
- **Intentional Asymmetry:** If a list section is dense, keep the header area sparse. Create "visual breathing room" locally.
- **Page Margins:** 24px minimum on outer edges
- **Section Gaps:** 24–32px between major content blocks

### Responsiveness
- **Minimum Width:** 1024px (developer tool — no mobile breakpoints needed)
- **Sidebar:** Collapsible to icon-only at narrow widths (< 1200px)
- **Content Area:** Fluid grid that fills remaining width
- **Dashboard Cards:** CSS Grid with `auto-fill, minmax(280px, 1fr)`

---

## 6. Screen-Specific Design Notes

### Dashboard (Home)
- KPI cards across top: Total Memories, Active Sessions, Memory Health Score, Context Tokens Used
- Memory Accrual chart (area chart with Luminous Indigo fill at 10% opacity)
- Recent Extractions list — compact rows, no dividers
- System Health circular gauge (94% shown prominently)

### Memories / Memory Timeline
- Chronological timeline with session grouping
- Filter bar: by type (bug_fix, decision, pattern, etc.), by file, by date
- Each memory card shows: type badge, content summary, file refs, timestamp, confidence score, pin toggle
- Search bar with semantic + keyword modes

### Memory Detail View
- Full memory content display
- Linked files with line references
- Edit/Delete/Pin actions
- Related memories section
- Session provenance data

### Sessions View
- Session list with timestamps, duration, memory count
- Expandable session detail showing extracted memories
- Session replay — view injected context for any past session

### Context Preview
- Live preview of the context payload that would be injected
- Pinned Axioms section (always-injected memories)
- Dynamic Semantic Retrieval section (similarity-matched memories)
- Token budget meter showing usage vs. limit (2000 tokens max)

### Settings
- Claude API key configuration
- ChromaDB connection settings
- Token budget limits
- Auto-index toggle
- Export/Import .engram file controls
- Memory decay settings
- Confidence threshold slider

---

## 7. Do's and Don'ts

### ✅ Do
- **Embrace Density** — Pack more information per screen than a standard web app
- **Use Intentional Asymmetry** — If a list is dense, keep the header sparse for breathing room
- **Rigid 4px Grid** — Every element must snap. Misalignment in dense UI = error
- **Use tonal shifts** for all section boundaries
- **Keep Inter exclusive** — No font mixing

### ❌ Don't
- **Don't use 100% opaque borders** — They trap the eye and break information flow
- **Don't use rounded corners > 8px** — Precision over softness
- **Don't use pure black (#000)** — Use `surface_dim` (#101419) to prevent text "vibrating"
- **Don't use pure white (#FFF)** — Use `on_surface` (#E0E2EA) for all "white" text
- **Don't use standard drop shadows** — Use Ghost Shadows or tonal layering only
- **Don't use divider lines** — Separate with spacing + tonal shifts

---

*DESIGN.md generated from Stitch Project "Engram Memory OS UI" (ID: 14875471080970522092) — following design-md and enhance-prompt skill specifications.*
