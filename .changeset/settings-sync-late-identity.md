---
'@dxos/app-toolkit': minor
---

Settings sync now starts once the identity loads, so plugin toggles in the registry no longer stay read-only on a profile whose identity arrives after the space list. `AppCapabilities.SettingsSync` gains a required `ready` atom that turns true once the store is bound; the capability is now present before an identity exists, so implementations must provide `ready` and consumers should gate on it rather than on the capability's presence.
