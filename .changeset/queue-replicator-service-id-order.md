---
'@dxos/protocols': patch
---

The queue replicator service id now encodes the space id ahead of the namespace — `queue-replicator:{spaceId}:{namespace}` — matching every other replicator, which puts the space id first.

`FeedProtocol.decodeServiceId` accepts both orderings, telling them apart by which segment is a valid space id, so no version marker is needed and clients on the old encoding keep working. The inbound path on the client only reads the service name (`serviceId.split(':')[0]`) and takes the space and namespace from the payload, so a peer decoding an id it did not encode is unaffected in either direction; there is no rollout ordering constraint.

Why it matters: EDGE could not read the addressed space at a shared segment index, so every queue replicator frame — its highest-volume inbound path — fell through to a KV lookup per frame inside the router Durable Object's critical section, and was metered against the identity's HALO space instead of the space it addressed.
