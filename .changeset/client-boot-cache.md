---
'@dxos/client': minor
---

Add `ClientOptions.bootCache`: the client opens from the identity, spaces and working set its last session persisted to IndexedDB instead of waiting for its services, which bring it current once reachable; edits made before then stay pending until the services take them. Databases gain `exportWorkingSet` / `seedWorkingSet`, and `Client.waitUntilServicesOpen` resolves once the services are open.
