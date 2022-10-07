# Class `Broadcast`
> Declared in [`packages/core/mesh/broadcast/src/broadcast.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/broadcast/src/broadcast.ts#L72)

Abstract module to send broadcast messages.

## Constructors
```ts
new Broadcast(
middleware: Middleware<P>,
options: Options
)
```

---
- Broadcast : Class
- P : Type parameter
- constructor : Constructor
- new Broadcast : Constructor signature
- P : Type parameter
- middleware : Parameter
- options : Parameter
- _codec : Property
- _id : Property
- _isOpen : Property
- _lookup : Property
- _peers : Property
- _seenSeqs : Property
- _send : Property
- _subscribe : Property
- _unsubscribe : Property
- packet : Property
- send : Property
- sendError : Property
- subscribeError : Property
- _onPacket : Method
- _onPacket : Call signature
- packetEncoded : Parameter
- _publish : Method
- _publish : Call signature
- packet : Parameter
- options : Parameter
- __type : Type literal
- close : Method
- close : Call signature
- open : Method
- open : Call signature
- pruneCache : Method
- pruneCache : Call signature
- publish : Method
- publish : Call signature
- data : Parameter
- options : Parameter
- updateCache : Method
- updateCache : Call signature
- opts : Parameter
- updatePeers : Method
- updatePeers : Call signature
- peers : Parameter
