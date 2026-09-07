---
'@dxos/protocols': patch
'@dxos/client-protocol': patch
'@dxos/client-services': patch
'@dxos/echo-client': patch
---

Move the devtools snapshot/feed/metadata responses and the invitation device profile to buf
messages, and correct `ClientServices` to declare the buf shapes those methods carry. `@dxos/echo-client`
no longer depends on `@dxos/codec-protobuf`. Gossip stays on protobuf.js: announces cross the network
between peers, and the two codecs frame an `Any` payload differently.
