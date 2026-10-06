---
'@dxos/echo': patch
---

- **Breadcrumbs:** separators take the links' muted colour rather than a fainter, half-transparent one, so the trail's structure reads at a glance. A plank header's trail is built from `Breadcrumb.Link` and `Breadcrumb.Current`, so a crumb keeps its size and place as you move down the hierarchy.
- **Unanchored comments:** every comments companion's toolbar has a **+** button that adds a comment on the whole object, not anchored to a span. For an object with no text to select (a drawing), the empty state points to it.
