---
'@dxos/app-framework': patch
---

`PluginManager.add` activates a plugin whose id is already enabled, such as one enabled in an earlier session and
loaded again from its URL. Before, it read as enabled while none of its modules ran, until it was switched off and on.
