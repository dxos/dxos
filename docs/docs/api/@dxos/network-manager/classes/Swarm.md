# Class `Swarm`
> Declared in [`packages/core/mesh/network-manager/src/swarm/swarm.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/network-manager/src/swarm/swarm.ts#L32)

A single peer's view of the swarm.
Manages a set of connections implemented by simple-peer instances.
Routes signal events and maintains swarm topology.

## Constructors
```ts
new Swarm(
_topic: PublicKey,
_ownPeerId: PublicKey,
_topology: Topology,
_protocolProvider: ProtocolProvider,
_messenger: Messenger,
_transportFactory: TransportFactory,
_label: undefined | string
)
```

---
- Swarm : Class
- constructor : Constructor
- new Swarm : Constructor signature
- _topic : Parameter
- _ownPeerId : Parameter
- _topology : Parameter
- _protocolProvider : Parameter
- _messenger : Parameter
- _transportFactory : Parameter
- _label : Parameter
- _connections : Property
- _discoveredPeers : Property
- _swarmMessenger : Property
- connected : Property
- connectionAdded : Property
- connectionRemoved : Property
- errors : Property
- id : Property
- connections : Accessor
- connections : Get signature
- label : Accessor
- label : Get signature
- ownPeerId : Accessor
- ownPeerId : Get signature
- topic : Accessor
- topic : Get signature
- _closeConnection : Method
- _closeConnection : Call signature
- peerId : Parameter
- _createConnection : Method
- _createConnection : Call signature
- initiator : Parameter
- remoteId : Parameter
- sessionId : Parameter
- _getSwarmController : Method
- _getSwarmController : Call signature
- _initiateConnection : Method
- _initiateConnection : Call signature
- remoteId : Parameter
- destroy : Method
- destroy : Call signature
- onOffer : Method
- onOffer : Call signature
- message : Parameter
- onSignal : Method
- onSignal : Call signature
- message : Parameter
- onSwarmEvent : Method
- onSwarmEvent : Call signature
- swarmEvent : Parameter
- setTopology : Method
- setTopology : Call signature
- newTopology : Parameter
