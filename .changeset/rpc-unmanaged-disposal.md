---
'@dxos/eslint-plugin-rules': minor
---

Add the `rpc-unmanaged-disposal` rule: a value reached through a service binding's `getUnmanaged()` must be held by `using`, or returned from a factory passed to an owner (`RpcStubCache` by default, configurable with `owners`). The binding does not dispose these values, and an undisposed one holds its Workers RPC session until GC. Not enabled in the `recommended` config.
