# Class `Swarm`
> Declared in package `@dxos/network-manager`

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
