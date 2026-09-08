---
'@dxos/echo': patch
---

Fix `space.postMessage` dropping its payload. The request carried a bare `google.protobuf.Any`,
which neither codec substitutes at the schema root, so a serialized transport wrote an empty `Any`
and the payload never reached the wire. The shape-compat layer now substitutes an `Any` reached as
the schema itself, and the request carries the buf message.

`space.listen` and the gossip subscription move to buf, and the feed message codec moves to buf: a
credential's signature covers the canonical form of the decoded object rather than the envelope's
bytes, so the envelope's codec can change.
