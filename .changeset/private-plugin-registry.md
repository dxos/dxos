---
'@dxos/edge-client': minor
'@dxos/plugin-registry': minor
---

`dx registry publish --private` publishes a plugin to your own private registry, owned by your identity and never written to AT Protocol, and Plugins → Registry lists it for you alongside the public catalog. A sandbox can publish as you once you grant it account access, and the Composer Plugin project template now does so in the browser. `EdgeHttpClient` gains `uploadPrivatePluginBundle`, `getPrivateRegistryPlugins` and `createApiToken`.
