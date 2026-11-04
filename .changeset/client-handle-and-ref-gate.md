---
'@dxos/client': patch
'@dxos/plugin-client': patch
'@dxos/compute-runtime': patch
---

`ClientService` providers built through the process manager now hand out the client capability's lazy handle (`ClientCapabilities.ClientHandle`) instead of waiting for initialization while the layer is built, so a CLI command that runs an operation before anything reads the client no longer waits out the initialization timeout. The client's teardown timeout now ends the wait for a hung `destroy()`. A bundle's input loads a reference envelope into a live object only in a field whose schema takes an ECHO entity; an envelope in an `Unknown` field reaches the handler as the data the caller sent.
