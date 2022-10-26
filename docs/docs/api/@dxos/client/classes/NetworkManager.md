# Class `NetworkManager`
> Declared in [`packages/core/mesh/network-manager/dist/src/network-manager.d.ts:25`]()


Manages connection to the swarm.

## Constructors
### constructor
```ts
(__namedParameters: NetworkManagerOptions) => NetworkManager
```

## Properties
### topicsUpdated 
> Type: `Event<void>`
<br/>
### connectionLog
> Type: `undefined | ConnectionLog`
<br/>
### signal
> Type: `SignalManager`
<br/>
### topics
> Type: `PublicKey[]`
<br/>

## Methods
### destroy
```ts
() => Promise<void>
```
### getSwarm
```ts
(topic: PublicKey) => undefined | Swarm
```
### getSwarmMap
```ts
(topic: PublicKey) => undefined | SwarmMapper
```
### joinProtocolSwarm
```ts
(options: SwarmOptions) => Promise<function>
```
### leaveProtocolSwarm
```ts
(topic: PublicKey) => Promise<void>
```
### start
```ts
() => Promise<void>
```