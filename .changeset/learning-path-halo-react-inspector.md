---
'@dxos/halo-react': minor
'@dxos/plugin-inspector': patch
---

`@dxos/halo-react` adds `useContacts`, which returns everyone the local identity shares a ready space with, once each, with the spaces they share, and re-renders when a space is joined or left or its members change. The plugin inspector's Operations view passes a reference to the sample for a `Ref` input, leaves empty optional fields out, and shows the sample after an operation that returns nothing; its sample picker follows the sample's label as it is edited.
