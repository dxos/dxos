---
'@dxos/echo': minor
---

A loaded object document that nothing changes or edits for 30 seconds goes back to its stored changes, subscribed passive, and leaves memory. The object stays live, kept current by the host's JSON, and the next write or document read loads the document again. Only a document holding just that object, on the main branch, with no editor attached, is released. `constructDatabase` takes `documentTtl` to set the time.
