---
'@dxos/echo': patch
---

Move the credentials package's credential codec to buf, and pin the credential signature format with
a checked-in golden vector: a credential signed by an earlier build, its exact signing payload, and
tests that both codecs verify it and reproduce that payload byte for byte.
