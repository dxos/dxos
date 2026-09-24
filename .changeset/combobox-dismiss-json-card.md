---
'@dxos/react-ui-list': minor
'@dxos/plugin-preview': patch
---

A combobox popover could not be dismissed. `Combobox.Content` stamped its own `id` on the popover content, overwriting the one the popover machine assigns and uses to find that element, so the machine had no layer to test an interaction against and an outside click was never recognised. The content no longer sets an id, and the trigger no longer overrides `aria-expanded`, `aria-controls` or `aria-haspopup` — the popover trigger already supplies all three, naming the content it actually rendered. The trigger also forced the popover open on every click, which made a second click a no-op depending on handler order; it now lets the trigger toggle.

Breaking: `Combobox.Arrow` is removed. The arrow was a caller-supplied child, so it landed inside `Combobox.Content`'s scrolling viewport rather than beside it, positioned against the wrong box and painted under the viewport's surface. `Combobox.Content` now renders it, so drop `<Combobox.Arrow />` from call sites.

The preview plugin's JSON fallback card top-aligns its disclosure toggle instead of floating it at the middle of an expanded dump, and renders the payload through `Syntax.*` so it scrolls in a `ScrollArea` with the themed scrollbar rather than the platform's own.
