# Class `NetworkManager`
> Declared in [`packages/core/mesh/network-manager/dist/src/network-manager.d.ts:25`]()


Manages connection to the swarm.

## Constructors
### constructor
```ts
(__namedParameters: NetworkManagerOptions) => [NetworkManager](/api/@dxos/client/classes/NetworkManager)
```

## Properties
### topicsUpdated 
Type: Event&lt;void&gt;
### connectionLog
Type: undefined | ConnectionLog
### signal
Type: SignalManager
### topics
Type: [PublicKey](/api/@dxos/client/classes/PublicKey)[]

## Methods
### destroy
```ts
() => Promise&lt;void&gt;
```
### getSwarm
```ts
(topic: [PublicKey](/api/@dxos/client/classes/PublicKey)) => undefined | Swarm
```
### getSwarmMap
```ts
(topic: [PublicKey](/api/@dxos/client/classes/PublicKey)) => undefined | SwarmMapper
```
### joinProtocolSwarm
```ts
(options: SwarmOptions) => Promise&lt;function&gt;
```
### leaveProtocolSwarm
```ts
(topic: [PublicKey](/api/@dxos/client/classes/PublicKey)) => Promise&lt;void&gt;
```
### start
```ts
() => Promise&lt;void&gt;
```