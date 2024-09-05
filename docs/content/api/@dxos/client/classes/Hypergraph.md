# Class `Hypergraph`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/hypergraph.d.ts:10]()</sub>


Manages cross-space database interactions.

## Constructors
### [constructor()]()




Returns: <code>[Hypergraph](/api/@dxos/client/classes/Hypergraph)</code>

Arguments: none





## Properties
### [query]()
Type: <code>QueryFn</code>



### [schemaRegistry]()
Type: <code>[RuntimeSchemaRegistry](/api/@dxos/client/classes/RuntimeSchemaRegistry)</code>




## Methods
### [_getOwningObject(spaceId)]()




Returns: <code>unknown</code>

Arguments: 

`spaceId`: <code>[SpaceId](/api/@dxos/client/types/SpaceId)</code>


### [_register(spaceId, spaceKey, database, \[owningObject\])]()


Register a database.

Returns: <code>void</code>

Arguments: 

`spaceId`: <code>[SpaceId](/api/@dxos/client/types/SpaceId)</code>

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

`database`: <code>EchoDatabaseImpl</code>

`owningObject`: <code>unknown</code>


### [_unregister(spaceId)]()




Returns: <code>void</code>

Arguments: 

`spaceId`: <code>[SpaceId](/api/@dxos/client/types/SpaceId)</code>


### [registerQuerySourceProvider(provider)]()




Returns: <code>void</code>

Arguments: 

`provider`: <code>QuerySourceProvider</code>


### [unregisterQuerySourceProvider(provider)]()


Does not remove the provider from active query contexts.

Returns: <code>void</code>

Arguments: 

`provider`: <code>QuerySourceProvider</code>


