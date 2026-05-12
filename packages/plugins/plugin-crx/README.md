# @dxos/plugin-crx

Coordinates with the [`@dxos/composer-crx`](../../apps/composer-crx) browser
extension. This plugin owns:

- The user-facing settings surface (master toggle, post-clip behavior).
- The receiver bridge that materializes incoming clippings as `Person`,
  `Organization`, or `Note` objects in the active space.

The extension discovers an open Composer tab via `chrome.tabs.query`, injects a
tiny bridge content script, and dispatches a same-origin `window`
`CustomEvent('composer:clip', { detail: clip })`. This plugin listens for that
event, validates the payload, maps it to an ECHO object, and acks the
extension via `CustomEvent('composer:clip:ack')`.

See [PLUGIN.mdl](./PLUGIN.mdl) for the specification.
