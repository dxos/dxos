# Class `NetworkManager`
> Declared in [`packages/core/mesh/network-manager/dist/src/network-manager.d.ts:25`]()


Manages connection to the swarm.

## Constructors
```ts
new NetworkManager (__namedParameters: NetworkManagerOptions) => NetworkManager
```

## Properties
### `topicsUpdated: Event<void>`
### `connectionLog:  get undefined | ConnectionLog`
### `signal:  get SignalManager`
### `topics:  get PublicKey[]`

## Functions
```ts
destroy () => Promise<void>
```
```ts
getSwarm (topic: PublicKey) => undefined | Swarm
```
```ts
getSwarmMap (topic: PublicKey) => undefined | SwarmMapper
```
```ts
joinProtocolSwarm (options: SwarmOptions) => Promise<function>
```
```ts
leaveProtocolSwarm (topic: PublicKey) => Promise<void>
```
```ts
start () => Promise<void>
```