---
'@dxos/plugin-client': minor
---

`initializeIdentity` (from `@dxos/plugin-client/testing`) now creates a single empty space by default instead of the app's first-run settings/default pair, so the seeded space is simply the first entry in `client.spaces` again. Breaking: `settingsSpace` is no longer created unless the new `settingsSpace: true` option is passed, and it is now optional on the result.
