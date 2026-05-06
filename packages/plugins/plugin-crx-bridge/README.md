# @dxos/plugin-crx-bridge

Receives clippings sent from the Composer browser extension
([`@dxos/composer-crx`](../../apps/composer-crx)) and materializes them as
`Person` or `Organization` objects in the active space.

The extension discovers an open Composer tab via `chrome.tabs.query`, injects a
tiny bridge content script, and dispatches a same-origin `window`
`CustomEvent('composer:clip', { detail: clip })`. This plugin listens for that
event, validates the payload, maps it into an ECHO object, and acks the
extension via `CustomEvent('composer:clip:ack')`.

See [PLUGIN.mdl](./PLUGIN.mdl) for the full specification.
