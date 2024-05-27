# Class `Hypergraph`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/hypergraph.d.ts:11]()</sub>


Manages cross-space database interactions.

## Constructors
### [constructor()]()




Returns: <code>[Hypergraph](/api/@dxos/client/classes/Hypergraph)</code>

Arguments: none





## Properties
### [runtimeSchemaRegistry]()
Type: <code>[RuntimeSchemaRegistry](/api/@dxos/client/classes/RuntimeSchemaRegistry)</code>




## Methods
### [_getOwningObject(spaceKey)]()




Returns: <code>unknown</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>


### [_register(spaceKey, database, \[owningObject\])]()


Register a database.

Returns: <code>void</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

`database`: <code>EchoDatabaseImpl</code>

`owningObject`: <code>unknown</code>


### [_unregister(spaceKey)]()




Returns: <code>void</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>


### [query(\[filter\], \[options\])]()


Filter by type.

Returns: <code>[Query](/api/@dxos/client/classes/Query)&lt;T&gt;</code>

Arguments: 

`filter`: <code>[FilterSource](/api/@dxos/client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/client/interfaces/QueryOptions)</code>


### [registerQuerySourceProvider(provider)]()




Returns: <code>void</code>

Arguments: 

`provider`: <code>QuerySourceProvider</code>


### [unregisterQuerySourceProvider(provider)]()


Does not remove the provider from active query contexts.

Returns: <code>void</code>

Arguments: 

`provider`: <code>QuerySourceProvider</code>


