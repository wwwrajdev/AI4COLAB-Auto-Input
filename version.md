# AI4COLAB Auto Input — Version History

## v2.1.0 — Scroll Wheel Suggestions + 2-Min Delay
**Date:** 2026-02-21

### Features
- **Scroll Wheel Suggestion Navigator** — Vertical scrollable list showing up to 8 suggestions with scroll-snap behavior
- **Mouse Wheel Navigation** — Scroll through suggestions with mouse wheel, smooth scroll-into-view
- **Search/Filter Bar** — Live-filter suggestions by typing in the glassmorphism search input
- **2-Minute Submit Delay** — Prevents accidental form submission for 2 minutes after accepting a suggestion
- **Counter Badge** — Shows "1 of 8" position indicator in the header bar
- **Premium Header Bar** — Gradient AI4COLAB branded header with logo and counter
- **Enter Arrow Indicator** — Shows ↵ on hover/selected to indicate press Enter to accept
- **Vertical Keyboard Navigation** — ↑/↓ arrows, Tab cycle, Enter accept, Esc close
- **Custom Scrollbar** — Thin blue-tinted scrollbar matching dark theme
- **Glow Animations** — Selected item pulses with blue glow, entrance blur-in animation

### Files Modified
- `content.js` — Scroll wheel UI, 8-suggestion fetch, search filter, mouse wheel, vertical nav, 2-min delay
- `styles.css` — Complete redesign of `.ainput-inline-suggestions` with scroll container, header, search, footer
- `version.md` — Added v2.1.0 entry

---

## v2.0.0 — Premium Dark UI Redesign
**Date:** 2026-02-21

### Features
- **Premium Dark Glassmorphism Theme** — Rich dark backgrounds with blur effects across all UI
- **AI4COLAB Branding** — Full-color SVG logo in popup and dashboard
- **Neon Accent Colors** — Google brand colors (Blue, Green, Red, Yellow) with glow effects
- **Micro-Animations** — Hover lifts, entrance animations, staggered card reveals, floating empty states
- **Custom Toggle Switch** — Beautiful animated toggle replacing plain checkbox
- **Pill-Style Tabs** — Active tab with blue glow highlight
- **Custom Scrollbar** — Dark-themed thin scrollbar
- **Keyboard Shortcut Chips** — Styled `kbd` badges in instructions
- **Responsive Dark Layout** — Mobile-optimized with fluid grid
- **Ripple Effect Buttons** — Active press feedback on all buttons

### Files Modified
- `popup.html` — Complete UI rewrite
- `dashboard.html` — Dark layout with enhanced structure
- `dashboard.css` — Full premium theme with animations
- `styles.css` — Dark inline suggestions and feedback panels
- `inline-feedback-styles.css` — Dark standalone feedback styles
- `manifest.json` — Rebranded to AI4COLAB

---

## v1.0.0 — Initial Release

### Features
- Auto-suggest text from `t.txt` file for input fields
- Inline suggestion box with 2 options (arrow key navigation)
- Like/Dislike feedback system
- Draggable feedback panels with position persistence
- Dashboard for managing suggestions (add, delete, import, export)
- Tab filtering: All / Liked / Disliked / Custom
- Custom suggestion additions via dashboard
- Toggle t.txt file usage
- Works on all websites including contenteditable fields (Grok, ChatGPT)
- Submit delay protection to prevent accidental form submissions
