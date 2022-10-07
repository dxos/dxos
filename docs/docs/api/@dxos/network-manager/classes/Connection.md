# Class `Connection`
> Declared in [`packages/core/mesh/network-manager/src/swarm/connection.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/network-manager/src/swarm/connection.ts#L60)

Represents a connection to a remote peer.

## Constructors
```ts
new Connection(
topic: PublicKey,
ownId: PublicKey,
remoteId: PublicKey,
sessionId: PublicKey,
initiator: boolean,
_signalMessaging: SignalMessaging,
_protocol: Protocol,
_transportFactory: TransportFactory
)
```

---
- Connection : Class
- constructor : Constructor
- new Connection : Constructor signature
- topic : Parameter
- ownId : Parameter
- remoteId : Parameter
- sessionId : Parameter
- initiator : Parameter
- _signalMessaging : Parameter
- _protocol : Parameter
- _transportFactory : Parameter
- _bufferedSignals : Property
- _state : Property
- _transport : Property
- errors : Property
- initiator : Property
- ownId : Property
- remoteId : Property
- sessionId : Property
- stateChanged : Property
- topic : Property
- protocol : Accessor
- protocol : Get signature
- state : Accessor
- state : Get signature
- transport : Accessor
- transport : Get signature
- _changeState : Method
- _changeState : Call signature
- state : Parameter
- close : Method
- close : Call signature
- connect : Method
- connect : Call signature
- initiate : Method
- initiate : Call signature
- signal : Method
- signal : Call signature
- msg : Parameter
