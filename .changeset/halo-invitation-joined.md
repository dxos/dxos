---
'@dxos/halo': minor
'@dxos/plugin-client': minor
'@dxos/react-ui-grid': minor
---

A successful invitation now reports the space or identity it joined. Breaking: `Invitation.Type` no longer includes `'multiuse'` (keep an invitation open with the `multiUse` option instead), `Identity.personalSpaceId` is removed, `CreateIdentity` no longer returns `spaceId`, and `Grid.Content` no longer accepts `mode` and `gridId`.
