---
'@dxos/app-toolkit': minor
'@dxos/react-ui-card': minor
---

A card header's leading depiction is now contributable per type via the `AppSurface.CardIcon` role. Hosts wrap their existing default in `CardIconSlot`, which renders a contributed surface when one matches and the default otherwise — `Surface`'s own `fallback` is the error boundary, and unlike `CardContent` a miss here cannot render nothing. Scoped to cards deliberately: a 6-unit card block affords initials or a photograph where a 16px navtree row does not, so non-card surfaces keep resolving `IconAnnotation` through `Obj.getIcon`. `ObjectAvatar` now derives its initials' hue from the object's label rather than its type, since a type declaring a single hue put every instance on the same disc; it is no longer a card's default depiction, only what a type opts into.
