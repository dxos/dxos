# Class `NetworkManager`
Declared in [`packages/core/mesh/network-manager/dist/src/network-manager.d.ts:51`]()


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
### [`closeSwarmConnection`]()


Close the connection.

Returns: `Promise<void>`

Arguments: 

`topic`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
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
### [`openSwarmConnection`]()


Join the swarm.

Returns: `Promise<SwarmConnection>`

Arguments: 

`__namedParameters`: `SwarmOptions`
### [`start`]()


Returns: `Promise<void>`

Arguments: none