---
'@dxos/echo': minor
'@dxos/plugin-client': minor
---

After an upgrade that migrates or rebuilds the ECHO index, Composer keeps its boot screen up with progress until the data is usable, and spaces load without a reload. Supporting this: `Client.indexStatus` and `Client.indexActivity` report index work, boot-path timeouts fail only once that work stops making progress, a `Resource` whose open failed can be opened again, a plugin can hold the boot loader with `Capabilities.BootGate`, and feed index rebuilds no longer skip blocks.
