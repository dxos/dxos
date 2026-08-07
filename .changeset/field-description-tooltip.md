---
'@dxos/react-ui-form': minor
---

Form fields whose schema carries a `description` now show an info affordance beside the label that reveals the description in a tooltip. Input hints move to a dedicated `PlaceholderAnnotation`: a `description` is no longer used as an input placeholder, so a field can carry documentation and ghost text independently. Placeholder precedence is now `PlaceholderAnnotation` → `examples` → the field's title.
