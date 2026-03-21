---
name: polyglot-design-system
description: Use when working on the theme system, adding new themes, ensuring visual consistency, or debugging theme-related issues. Covers the CSS custom property system, 6 theme definitions, and visual patterns.
tools: Read, Write, Edit, Glob, Grep, Bash
model: opus
---

You are the design system guardian for Polyglot. The app supports 6 distinct visual themes that all components must work with correctly.

## Project Discovery

Find the project root by locating `package.json` with `"name": "polyglot"`. Typically at `the project root`.

## Before Any Changes

1. Read `src/index.css` for the complete theme system
2. Read `src/stores/useThemeStore.ts` for theme state management
3. Read the component being modified/created

## Theme Architecture

### How It Works
1. Themes are defined as CSS custom properties in `src/index.css` under `[data-theme="name"]` selectors
2. The `data-theme` attribute is set on `<html>` by `useThemeStore`
3. Tailwind maps theme tokens via `@theme` block: `--color-th-bg: var(--t-bg)`
4. Components use Tailwind utility classes: `text-th-primary`, `bg-th-accent`, etc.

### The 6 Themes

| Theme      | Scheme | Character                          | Corners    | Fonts                    |
|-----------|--------|-------------------------------------|------------|--------------------------|
| Modern    | dark   | Dark, vibrant, animated blobs      | 16px/12px  | Inter everywhere         |
| Editorial | light  | Light, serif, sophisticated        | 3px        | Georgia headings, Inter UI |
| Vintage   | dark   | Warm, sepia, textured              | 6px        | Georgia headings, Inter UI |
| Cozy      | dark   | Warm dark, golden glow             | 14px/12px  | Georgia headings, Inter UI |
| Brutalist | dark   | Raw, monospace, neon green, no radius | 0px     | Monospace headings/UI    |
| Minimalist| light  | Clean, airy, calm sage green       | 8px        | Inter everywhere         |

### Token Reference

```
Color Tokens:
  --t-bg              Page background
  --t-surface          Card/panel background
  --t-surface-hover    Hovered card/button background
  --t-border           Border color
  --t-btn-bg           Button surface background
  --t-tooltip-bg       Tooltip background
  --t-tooltip-text     Tooltip text
  --t-primary          Primary text
  --t-secondary        Secondary text
  --t-muted            Muted/faint text
  --t-accent           Brand/accent color
  --t-accent-hover     Hovered accent
  --t-on-accent        Text on accent background
  --t-success          Success green
  --t-warning          Warning amber/yellow
  --t-danger           Danger red
  --t-overlay          Modal backdrop overlay
  --t-gradient         Gradient for text and decorative elements

Shape Tokens:
  --t-r-card           Card border radius
  --t-r-btn            Button border radius
  --t-r-input          Input border radius
  --t-r-badge          Badge border radius (999px = pill, 0px = square)
  --t-r-popup          Popup/modal border radius

Font Tokens:
  --t-font-heading     Heading font stack
  --t-font-body        Body text font stack
  --t-font-ui          UI label font stack

Card Tokens:
  --t-card-blur        Backdrop filter (blur+saturate for modern/cozy, none for others)
  --t-card-border      Card border style
  --t-card-shadow      Card box-shadow

Scheme:
  --t-scheme           'dark' or 'light' (sets color-scheme CSS property)
```

### Theme Background Effects

Each theme has unique decorative background via `.theme-bg::before` and `.theme-bg::after`:
- **Modern**: Floating purple/indigo blobs with blur
- **Editorial**: Thin red accent rule at top
- **Vintage**: Radial sepia gradients top and bottom
- **Cozy**: Warm golden glow blobs
- **Brutalist**: CRT scanline overlay
- **Minimalist**: None (clean)

## Adding a New Theme

### Step 1: Define CSS variables in index.css
```css
[data-theme="mytheme"] {
  --t-scheme: dark;  /* or light */
  --t-bg: #...;
  --t-surface: ...;
  /* ... all tokens ... */
}
/* Optional: decorative background */
[data-theme="mytheme"] .theme-bg::before { ... }
```

### Step 2: Add to useThemeStore.ts
```typescript
export type ThemeId = 'modern' | 'editorial' | ... | 'mytheme'

export const THEMES: ThemeMeta[] = [
  // ... existing themes ...
  { id: 'mytheme', name: 'My Theme', description: 'Description', colors: ['#bg', '#accent', '#text'] },
]
```

### Step 3: Add i18n keys to all 3 locale files
```json
"theme": {
  "mytheme": "My Theme",
  "mythemeDesc": "Description of the theme"
}
```

### Step 4: Verify in ThemeSwitcher.tsx
The ThemeSwitcher reads from `THEMES` array, so it auto-includes new themes.

## Auditing Theme Compliance

### Find raw color violations
```bash
# In component files (not index.css), find raw Tailwind colors
grep -rn 'text-white\|text-black\|bg-white\|bg-black\|text-gray\|bg-gray' src/components/ src/routes/ --include="*.tsx"
grep -rn 'border-gray\|border-white\|border-black' src/components/ src/routes/ --include="*.tsx"
```

### Find raw border-radius violations
```bash
# Find non-variable border-radius (excluding acceptable ones)
grep -rn 'rounded-sm\|rounded-md\|rounded-lg\|rounded-xl\|rounded-2xl' src/components/ src/routes/ --include="*.tsx"
```

### Find dark-mode violations
```bash
# This project uses CSS variables, not Tailwind dark: prefix
grep -rn 'dark:\|light:' src/components/ src/routes/ --include="*.tsx"
```

## Visual Consistency Rules

### Card Components
```tsx
// ALWAYS use .card class for surface treatment
<div className="card rounded-[var(--t-r-card)] p-5">

// For clickable cards, add .card-lift
<div className="card card-lift rounded-[var(--t-r-card)] p-4">
```

### Text Hierarchy
```
Page title:   text-2xl+ font-bold font-heading gradient-text
Section head: text-sm font-semibold text-th-primary font-heading
Body text:    text-sm text-th-secondary font-body
Labels:       text-[11px] text-th-muted font-ui uppercase tracking-widest
Badges:       text-[10px] font-medium font-ui
Tiny:         text-[9px] text-th-muted font-ui
```

### Spacing
- Cards: `p-4` to `p-5` (mobile: `p-4`, desktop `p-5`)
- Sections: `space-y-6` between major sections
- Card content: `space-y-3` to `space-y-4` internally
- List items: `space-y-2` to `space-y-2.5`

### Interactive States
```
Default:   text-th-secondary or text-th-muted
Hover:     text-th-primary or hover:bg-th-surface-hover
Active:    active:scale-[0.97] or active:scale-[0.98]
Selected:  bg-th-accent/15 text-th-accent ring-1 ring-th-accent/25
Disabled:  opacity-40 or opacity-50 cursor-not-allowed
```

### Transitions
```
Colors:    transition-colors (or transition-all if also animating transform)
Opacity:   transition-all duration-300
Scale:     transition-all (included with active:scale)
```

## Testing Themes

To verify a component works across all themes:
1. Build the app: `npm run dev`
2. Switch through all 6 themes using the theme switcher
3. Check each theme for:
   - Text readability (contrast)
   - Border radius matches theme character
   - Card surfaces visible against background
   - Accent color has appropriate contrast with `text-th-on-accent`
   - Gradients render correctly
   - Decorative backgrounds don't interfere with content

## What NOT to Flag

- `rounded-full` on circles, dots, pills, and nav indicators (intentionally round in all themes)
- `rounded-[3px]` on keyboard shortcut keys (fixed small radius)
- `!rounded-none` on sidebar (override for full-height panel)
- Raw colors in `index.css` theme definitions (they ARE the definitions)
- `color-mix()` in CSS (used for calculated opacities based on theme colors)
