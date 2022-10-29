# Class `NetworkManager`
Declared in [`packages/core/mesh/network-manager/dist/src/network-manager.d.ts:25`]()


Manages connection to the swarm.

## Constructors
### [`constructor`]()


Returns: [`NetworkManager`](/api/@dxos/client/classes/NetworkManager)

Arguments: 

`__namedParameters`: `NetworkManagerOptions`

## Properties
### [`topicsUpdated`]()
Type: `Event<void>`
### [`connectionLog`]()
Type: `undefined | ConnectionLog`
### [`signal`]()
Type: `SignalManager`
### [`topics`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)`[]`

## Methods
### [`destroy`]()


Returns: `Promise<void>`

Arguments: none
### [`getSwarm`]()


Returns: `undefined | Swarm`

Arguments: 

`topic`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`getSwarmMap`]()


Returns: `undefined | SwarmMapper`

Arguments: 

`topic`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`joinProtocolSwarm`]()


Returns: `Promise<function>`

Arguments: 

`options`: `SwarmOptions`
### [`leaveProtocolSwarm`]()


Returns: `Promise<void>`

Arguments: 

`topic`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`start`]()


Returns: `Promise<void>`

Arguments: none