---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Layout fixes for narrow decks and dialogs.

- **Create Space dialog:** the icon and colour pickers sit side by side, and Cancel and Create end at the fields' edge rather than in the gutter.
- **Form fields:** a control narrower than its field (a picker button) starts under its label instead of centring.
- **Companion width:** the deck shows a plank's companion only when the plank and the companion both fit at their minimum widths, and caps the companion so the pair never runs under the end sidebar. Before, a narrow deck hid the companion's close button.
- **Plank header:** in flat mode, with breadcrumbs, the controls sit at the header's end.
- **Settings:** opening settings closes the companion.
