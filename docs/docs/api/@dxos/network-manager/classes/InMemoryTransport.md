# Class `InMemoryTransport`
> Declared in package `@dxos/network-manager`

Abstraction over a P2P connection transport. Currently either WebRTC or in-memory.

## Constructors
```ts
new InMemoryTransport(
_ownId: PublicKey,
_remoteId: PublicKey,
_sessionId: PublicKey,
_topic: PublicKey,
_stream: ReadWriteStream
)
```
