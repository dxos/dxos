# Class `EchoDatabase`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database.d.ts:27]()</sub>


Database wrapper.

## Constructors
### [constructor(_router)]()


Returns: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Arguments: 

`_router`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

## Properties
### [objects]()
Type: <code>[EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;[]</code>
### [router]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

## Methods
### [delete(obj)]()


Toggle deleted flag.

Returns: <code>Promise&lt;T&gt;</code>

Arguments: 

`obj`: <code>T</code>
### [getObjectById(id)]()


Returns: <code>undefined | [EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;</code>

Arguments: 

`id`: <code>string</code>
### [query(\[filter\])]()


Filter by type.

Returns: <code>[Query](/api/@dxos/react-client/types/Query)&lt;T&gt;</code>

Arguments: 

`filter`: <code>[TypeFilter](/api/@dxos/react-client/types/TypeFilter)&lt;T&gt;</code>
Returns: <code>[Query](/api/@dxos/react-client/types/Query)&lt;[Document](/api/@dxos/react-client/classes/Document)&gt;</code>

Arguments: 

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt;</code>
### [save(obj)]()


Flush mutations.

Returns: <code>Promise&lt;T&gt;</code>

Arguments: 

`obj`: <code>T</code>