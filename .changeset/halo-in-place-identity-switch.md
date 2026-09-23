---
'@dxos/shell': minor
'@dxos/plugin-client': minor
---

Logging out, recovering an identity and joining another identity as a new device now delete the current identity with `client.halo.deleteIdentity()` and continue in the same page, instead of resetting the client storage and reloading. Breaking: the `onReset` option of `ClientPlugin` is removed; contribute `ClientCapabilities.OnIdentityDeleted` to react when an identity is deleted in place.
