# @dxos/plugin-crx

Manages how Composer coordinates with the `@dxos/composer-crx` browser
extension. Owns the user-facing settings surface and exposes a settings
capability that other plugins (e.g.
[`@dxos/plugin-crx-bridge`](../plugin-crx-bridge)) can read before acting on
incoming clippings.

See [PLUGIN.mdl](./PLUGIN.mdl) for the specification.
