# Class `InMemoryTransport`
> Declared in [`packages/core/mesh/network-manager/src/transport/in-memory-transport.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/network-manager/src/transport/in-memory-transport.ts#L23)

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

---
- InMemoryTransport : Class
- constructor : Constructor
- new InMemoryTransport : Constructor signature
- _ownId : Parameter
- _remoteId : Parameter
- _sessionId : Parameter
- _topic : Parameter
- _stream : Parameter
- _incomingDelay : Property
- _outgoingDelay : Property
- _ownKey : Property
- _remoteConnection : Property
- _remoteKey : Property
- closed : Property
- connected : Property
- errors : Property
- _connections : Property
- remoteId : Accessor
- remoteId : Get signature
- sessionId : Accessor
- sessionId : Get signature
- close : Method
- close : Call signature
- signal : Method
- signal : Call signature
- signal : Parameter
