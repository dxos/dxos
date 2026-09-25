---
'@dxos/echo-host': patch
'@dxos/client-services': patch
---

Host document handles are acquired through ref-counted `DocumentLease`s (`Symbol.dispose`, usable with `using`), and a document is evicted from the repo cache once its last lease is disposed.
