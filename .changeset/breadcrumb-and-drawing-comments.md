---
'@dxos/echo': patch
---

- **Breadcrumbs:** separators take the links' muted colour rather than a fainter, half-transparent one, so the trail's structure reads at a glance. A plank header's trail is built from `Breadcrumb.Link` and `Breadcrumb.Current`, so a crumb keeps its size and place as you move down the hierarchy.
- **Unanchored comments:** every comments companion's toolbar has a **+** button that adds a comment on the whole object, not anchored to a span. For an object with no text to select (a drawing), the empty state points to it.
- **Chat widgets:** a system-generated turn (the lightning row) collapses to its first line behind a disclosure caret at its end, built from the same panel as the tool, summary and fallback widgets. Suggestion and select buttons share one button.
- **Background tool results:** a result recovered on a later turn renders in the tool panel as "Background result" (or a failed one), not as a raw `<result>` prompt.
