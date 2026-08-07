---
'@dxos/echo': minor
---

Form fields whose schema carries a `description` now show an info affordance beside the label that reveals the description in a tooltip. Input hints move to a dedicated `Annotation.FormPlaceholderAnnotation`: a `description` is no longer used as an input placeholder, so a field can carry documentation and ghost text independently. Placeholder precedence is now `FormPlaceholderAnnotation` → `examples` → the field's title, and the annotation round-trips through JSON schema so stored types keep their hints.
