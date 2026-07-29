---
'@dxos/schema': minor
'@dxos/react-ui-list': minor
'@dxos/react-ui-form': patch
'@dxos/plugin-connector': patch
'@dxos/plugin-routine': patch
'@dxos/react-ui': patch
---

Annotation-driven publishing of ECHO objects to the AT Protocol. `@dxos/schema` gains `AtprotoRecordAnnotation` (type-level: target collection, record-key strategy, and a declarative serializable lens) and `AtprotoVisibilityAnnotation` (field-level, private by default — a field is published only when explicitly marked), so a generic companion can discover and publish any annotated type without knowing the type itself.

`MasterDetail` moves from plugin-routine into `@dxos/react-ui-list` as a reusable primitive: a selectable master list above a detail slot, nestable by placing another `MasterDetail` in `detail`. Per-row actions are a caller-supplied `renderActions` slot, so the primitive stays menu-agnostic and `react-ui-list` takes no dependency on `@dxos/react-ui-menu`.

`ComboboxField` now shows the selected option's label rather than the stored value, which is often an opaque id the user never chose to see.
