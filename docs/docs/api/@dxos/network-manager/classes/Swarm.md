# Class `Swarm`
> Declared in [`packages/core/mesh/network-manager/src/swarm/swarm.ts`](https://github.com/dxos/protocols/blob/main/packages/core/mesh/network-manager/src/swarm/swarm.ts#L32)

A single peer's view of the swarm.
Manages a set of connections implemented by simple-peer instances.
Routes signal events and maintains swarm topology.

## Constructors
```ts
const newSwarm = new Swarm(
_topic: PublicKey,
_ownPeerId: PublicKey,
_topology: Topology,
_protocolProvider: ProtocolProvider,
_messenger: Messenger,
_transportFactory: TransportFactory,
_label: undefined | string
)
```

## Properties

## Functions
