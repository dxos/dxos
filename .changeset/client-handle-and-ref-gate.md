---
'@dxos/client': patch
'@dxos/plugin-client': patch
'@dxos/compute-runtime': patch
---

`ClientService` providers built through the process manager now hand out the client capability's lazy handle (`ClientCapabilities.ClientHandle`) instead of waiting for initialization while the layer is built, so a CLI command that runs an operation before anything reads the client no longer waits out the initialization timeout. The client's teardown timeout now ends the wait for a hung `destroy()`. A bundle's input no longer loads a reference envelope in a field typed `Unknown` or `Any`; such a field reaches the handler as the data the caller sent.
