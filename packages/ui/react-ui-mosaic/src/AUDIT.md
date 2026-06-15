# Mosaic Audit

- [x] Research `@fluentui/react-tabster` and summarize very concisely below how key navigation works (ArrowUp, ArrowDown, Tab, Enter, Escape)
- [x] `Stack.stories.tsx` contains a vertical Stack (i.e., a list); determine:
  - [x] How is the currently focused Tile element determined?
  - [x] Is `aria-current` updated as the user navigates the list?
  - [x] Do we need to mark tiles (e.g., `DefaultStackTile`) as "focusable" or use Focus.Group or set the tabIndex?
  - [x] How could we configure pressing Enter to activate the current item?
  - [x] How should we use/extend the tailwind classes defined in `selected.css` (in ui-theme).
- [x] Determine if there are common elements from `react-ui-list` wrt key navigation/current/selection.

## Issues

- padding top/bottom of scroll area
- card menu focus border clipped by scroll area

## Tabster Notes

### Key Navigation Summary (`@fluentui/react-tabster`)

Tabster provides declarative keyboard navigation via React hooks that attach `data-tabster` attributes to DOM elements. No manual `onKeyDown` handlers needed for basic navigation.

| Key                      | Behavior                                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ArrowUp/ArrowDown**    | Moves focus between items within a `useArrowNavigationGroup({ axis: 'vertical' })` group. With `memorizeCurrent: true`, the last-focused item is remembered when returning to the group. |
| **ArrowLeft/ArrowRight** | Same, for `axis: 'horizontal'` groups. Used in the tabster board example for column-to-column navigation.                                                                                |
| **Tab**                  | Controlled by `useFocusableGroup({ tabBehavior })`. `'limited-trap-focus'` traps Tab within the group. `'limited'` allows Tab to leave when at first/last item.                          |
| **Enter**                | **Not handled by tabster.** Must be implemented via custom `onKeyDown` on the group or individual items.                                                                                 |
| **Escape**               | **Not handled by tabster.** Must be implemented manually (e.g., to exit a focus-trapped group).                                                                                          |

**Hooks used in this codebase:**

- `useArrowNavigationGroup({ axis, memorizeCurrent })` — arrow key navigation within a group.
- `useFocusableGroup({ tabBehavior })` — Tab key behavior and focus grouping.
- `useMergedTabsterAttributes_unstable(...)` — merges multiple tabster attribute sets.
- `useFocusFinders()` — programmatic focus (`findFirstFocusable`, etc.).

**Pattern:** See `tabster.stories.tsx` for a working Board > Column > Item example with nested groups.

### Stack Focus Analysis

**How is the currently focused Tile determined?**
`Focus.Group` (in `Focus.tsx`) wraps the stack container with `useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true })`. Tabster internally tracks which child element has focus. However, **individual tiles (`Mosaic.Tile`) do not have `tabIndex`** — they render as `role="listitem"` divs without being independently focusable. The `Focus.Group` itself has `tabIndex={0}`, so focus lands on the group, not on individual tiles. Arrow keys currently have nothing to navigate between because no tile children are focusable.

**Is `aria-current` updated as the user navigates?**
**No.** Neither `Focus.Group`, `Mosaic.Tile`, nor `DefaultStackTile` set `aria-current`. There is no mechanism to track or display the "current" item in the navigation sense.

**Do we need to mark tiles as focusable?**
**Yes.** For arrow key navigation to work between tiles, each tile needs `tabIndex={0}` (or `-1` with programmatic focus). The `tabster.stories.tsx` example confirms this: each `Item` has `tabIndex={0}` and `useFocusableGroup()` attributes. Options:

1. Add `tabIndex={0}` directly to `Mosaic.Tile` (simplest — every tile becomes focusable).
2. Require tile implementations (e.g., `DefaultStackTile`) to set their own `tabIndex`.
3. Add a `focusable` prop to `Mosaic.Tile` that conditionally sets `tabIndex={0}`.

**How to configure Enter to activate the current item?**
Add an `onKeyDown` handler to the `Focus.Group` (or its container) that listens for `Enter` on the currently focused tile:

```tsx
const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  if (event.key === 'Enter') {
    const focused = document.activeElement;
    // Extract tile id from focused element and invoke activation callback.
  }
};
```

Alternatively, add `onKeyDown` per-tile and call an `onActivate` prop. The group-level approach is simpler.

**How to use/extend `selected.css` classes?**
`selected.css` defines three utility classes in `@layer dx-components`:

- `.dx-hover` — cursor + hover background/text via `hover:bg-highlight-surface`.
- `.dx-highlighted` — uses `data-[highlighted]` attribute for programmatic highlighting.
- `.dx-selected` — uses `aria-selected` for persistent selection state (bg, text, font-weight, tracking).

For tiles, apply `.dx-selected` and set `aria-selected={true}` on the active/selected tile. For focus-follows-current behavior, consider adding a new `.dx-current` class that styles based on `aria-current="true"`:

```css
.dx-current {
  @apply aria-[current=true]:bg-highlight-surface
    aria-[current=true]:text-highlight-surface-text;
}
```

This distinguishes "current" (keyboard focus/navigation) from "selected" (user-chosen persistent state).

### Common Elements with `react-ui-list`

`react-ui-list` (`ListItem.tsx`) already implements patterns that mosaic tiles should adopt:

| Feature              | `react-ui-list`             | `react-ui-mosaic`                                      | Gap                                          |
| -------------------- | --------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `role="listitem"`    | Yes                         | Yes                                                    | —                                            |
| `aria-selected`      | Yes (`selected` prop)       | No                                                     | Need to add `selected` prop to `Mosaic.Tile` |
| `.dx-selected` class | Yes (applied on `ListItem`) | No                                                     | Apply to tiles when selectable               |
| `.dx-hover` class    | Yes (applied on `ListItem`) | No                                                     | Apply to tiles when interactive              |
| Keyboard navigation  | No (no tabster)             | Partial (`Focus.Group` exists but tiles not focusable) | Make tiles focusable                         |
| Drag handle          | Yes (`ListItemDragHandle`)  | Yes (`Card.DragHandle`)                                | —                                            |
| Drag preview         | Yes (portal-based)          | Yes (portal-based)                                     | —                                            |

**Shared patterns to extract/align:**

1. Both use `role="listitem"` and `@atlaskit/pragmatic-drag-and-drop`.
2. `react-ui-list` has selection support (`aria-selected` + `.dx-selected .dx-hover`) that mosaic tiles lack.
3. Neither currently uses tabster for keyboard navigation — `react-ui-list` has no arrow key support at all.
4. A shared approach to "current item" tracking (`aria-current`) and "selected item" (`aria-selected`) would benefit both packages.
