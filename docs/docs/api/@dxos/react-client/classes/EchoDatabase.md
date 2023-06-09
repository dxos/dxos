# Class `EchoDatabase`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database.d.ts:9]()</sub>


Database wrapper.


## Constructors
### [constructor(_backend, _router)]()



Returns: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Arguments: 

`_backend`: <code>DatabaseProxy</code>

`_router`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>


## Properties
### [_backend]()
Type: <code>DatabaseProxy</code>

### [objects]()
Type: <code>[EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;[]</code>

### [router]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>


## Methods
### [add(obj)]()



Add object to the database.
Restores the object if it was deleted.


Returns: <code>T</code>

Arguments: 

`obj`: <code>T</code>

### [flush()]()



Wait for all pending operations to complete.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [getObjectById(id)]()



Returns: <code>undefined | T</code>

Arguments: 

`id`: <code>string</code>

### [query(\[filter\], \[options\])]()



Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;[TypedObject](/api/@dxos/react-client/values#TypedObject)&gt;</code>

Arguments: 

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/types/QueryOptions)</code>

### [remove(obj)]()



Remove object.


Returns: <code>void</code>

Arguments: 

`obj`: <code>T</code>
