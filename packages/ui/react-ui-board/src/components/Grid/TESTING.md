# Grid — Manual Test Plan

Interactive drag/resize can't be synthesized in automation (native HTML5 DnD), so this is a manual
pass. Everything below was verified headless (build/lint/unit tests + DOM measurements + render) EXCEPT
the drag/resize **gestures**, which are what this plan is for.

## Setup

From THIS worktree (`.../.claude/worktrees/cloudflare-dashboard-source-e3fa9a`):

```
cd tools/storybook-react && pnpm exec storybook dev --port=9010 --no-open
```

Open: `http://localhost:9010/?path=/story/ui-react-ui-board-grid--default`
Stories: **Default** (compact cells, float) · **Pack** (compacts up) · **Large** (card-size cells) · **Media** (poster images, ≤2×2).

Engine logic (collision/push/compact/resize/clamp) has **30 unit tests** — run:
`moon run react-ui-board:test`.

## Checklist

### Layout / render

- [ ] **Default** renders 5 tiles on an 8-col grid; empty cells are dashed; title sits in the header next to the ⠿ drag handle.
- [ ] Grid is **centered** in the viewport on load (equal gutter L/R when it fits; scrolled to the middle when it overflows).
- [ ] Gutter is **symmetric** on all four edges (no flush top-left / margin-only bottom-right).
- [ ] **No outer border** around the grid; the container uses the **custom DXOS scrollbar** (thin, styled).
- [ ] **Compact**: same layout at ~half cell size.
- [ ] **Media**: each tile shows a poster image filling the body, title still in the header.

### Move (drag a tile by its ⠿ handle)

- [ ] Dragging shows a **preview that keeps the tile's size** (doesn't balloon).
- [ ] A **magnetic ring outline** appears at the snapped target cell and jumps cell-to-cell as you move.
- [ ] **Other tiles animate out of the way** live as you hover over them, moving **as a group**, and
      **spring back** to their original spots if you don't drop (release outside / press Esc).
- [ ] Dropping on an occupied cell **pushes** the occupant; direction is **right** when you're moving
      the tile rightward, otherwise **down** (falls back to down at the right edge).
- [ ] You can drop a tile **back onto its own footprint** / overlapping cells (not just outside).
- [ ] Dragging a wide tile toward the **right edge clamps** it within the columns.
- [ ] **Pack** mode: after a move that leaves a gap above a tile, the layout **compacts upward**.

### Resize (drag a tile's bottom-right corner)

- [ ] The **resize cursor + corner mark appear at the tile edge** (bottom-right); handle is reachable.
- [ ] The ghost outline **follows freely but magnetizes** to whole cells within ~16px; snaps on release.
- [ ] Resize **pushes neighbours** (right when growing wider, down when growing taller) and respects min/max.

### Auto-scroll

- [ ] Dragging a tile **near the container edge auto-scrolls** the viewport.
- [ ] Resizing **near the edge also auto-scrolls**.

### Add

- [ ] Hovering an empty (dashed) cell shows a **`+` button**; clicking it adds a tile there.

## NOT expected to work yet (logged follow-ups — need live iteration)

- **Resize from any corner/side**: only the bottom-right handle exists (no 8-way handles).
- **Pinch-to-zoom** (trackpad): not implemented; complicates the drag/resize pixel math (scaled space).
- **List/Tree still use their own DnD** (Phase 5 migration not done — needs a live session).

## If something's off

Open DevTools console and drag; the monitor logs `Root.onDrop { source, location }` and warns
`invalid target/source`. Paste those lines — they pinpoint whether the drop routed and to where.
