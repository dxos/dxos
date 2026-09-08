---
'@dxos/echo': patch
---

Fix `space.postMessage` dropping its payload. The request carried a bare `google.protobuf.Any`,
which neither codec substitutes at the schema root, so a serialized transport wrote an empty `Any`
and the payload never reached the wire. The shape-compat layer now substitutes an `Any` reached as
the schema itself, and the request carries the buf message.

`space.listen` and the gossip subscription move to buf, and so do the feed message codec and the
credential codec: a credential's signature covers the canonical form of the decoded object rather
than the envelope's bytes, so the envelope's codec can change. A checked-in golden vector — a
credential signed by an earlier build, with its exact signing payload — now pins that signature
format so a future shape change cannot silently invalidate previously-issued credentials.
