# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build process — open `index.html` directly in a browser. There are no npm scripts, dependencies, or compilation steps.

## Architecture

Vanilla JavaScript canvas app for visually designing box layouts. No framework, no bundler.

**Module load order matters** (defined in `index.html`):
1. `global.js` — shared state: `boxes[]`, `aspectRatio`, canvas/ctx refs
2. `camera.js` — pan/zoom state and `screenToWorld()` conversion
3. `topbar.js` — aspect ratio controls and presets
4. `sidebar.js` — sidebar resize handle logic
5. `boxes.js` — box creation, deletion, selection, color, name, sidebar list UI
6. `view.js` — canvas render loop, formula evaluation, hit testing, interaction

**Box data model:**
```js
{
  name, x, y, w, h,        // position and size in world units
  visible, color,
  labelBottom,              // label rendered below vs above
  isScreen,                 // marks the reference/container box
  targets: { v?, x?, y?, w?, h? },   // links to other boxes by index
  formulas: { x?, y?, w?, h? }       // math expression strings
}
```

## Formula System (`view.js`)

Boxes can have math expressions instead of static values. Formulas are evaluated inside `evaluateFormula()` using `new Function()` after sanitization. Variables available during evaluation:

- `m*` — this box (e.g. `mw`, `mh`, `mx`, `my`, `mlx`/`mrx` for left/right edges)
- `s*` — screen box (same suffixes)
- `t*` — target box (same suffixes)

Formulas are compiled and cached in `formulaCache` (Map). Recursive evaluation uses a depth limit of 8 and a `currentlyEvaluating` Set to detect cycles.

## Rendering Pipeline (`view.js`)

The `draw()` function runs on every animation frame:
1. Clear + apply camera transform
2. Pass 1: draw all box bodies (fill, stroke, visibility dimming)
3. Pass 2: draw all labels (always on top)
4. Draw snap reference lines (when a drag is snapping)
5. Draw resize handles for the selected box (8 directions: nw/n/ne/e/se/s/sw/w)

Snap threshold is 8px in screen space, converted to world units via the camera zoom.

## Interaction Model

- **Middle-click drag** — pan camera
- **Scroll wheel** — zoom centered on cursor
- **Left-click box** — select; drag to move (with snap)
- **Resize handles** — 8-directional resize; corner handles are aware of which edges they affect
- **Double-click box name in sidebar** — auto-zoom/center on that box

## CSS Design Tokens (`base.css`)

Dark theme: `#0f0f0f` background, `#d1d1d1` text, `#ff9d5c` accent. All major components reference these root variables.
