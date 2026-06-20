# @dxos/plugin-crx

Coordinates with the [`@dxos/composer-crx`](../../apps/composer-crx) browser
extension. This plugin owns the Composer side of the page-actions bridge:

- Plugins contribute page actions under `CrxCapabilities.PageAction` — a
  serializable descriptor (label, icon, URL patterns, contexts, extractor)
  paired with a target operation. This plugin contributes three picker
  actions (Person, Organization, Note); plugin-bookmarks contributes
  "Add bookmark".
- The extension lists contributed actions via
  `CustomEvent('composer:page-actions:list')`, caches the descriptors in its
  registry, and invokes an action via
  `CustomEvent('composer:page-action:invoke')`. Every request is acked with
  stable error codes (`invalidPayload`, `unsupportedVersion`,
  `unknownAction`, `noSpace`, `operationFailed`).
- Picked/extracted content travels as a `PageAction.Snapshot` (source,
  selection, hints, optional image data). The target operation receives
  `{ snapshot, target }` — where `target` is the active space's database —
  and creates the object there; outcomes surface as toasts.

It also owns the user-facing settings surface, including the render-proxy
settings and an extension connection test.

See [PLUGIN.mdl](./PLUGIN.mdl) for the specification.
