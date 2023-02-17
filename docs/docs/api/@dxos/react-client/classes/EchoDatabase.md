# Class `EchoDatabase`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database.d.ts:23]()</sub>


Database wrapper.

## Constructors
### [constructor(_backend, _router)]()


Returns: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Arguments: 

`_backend`: <code>DatabaseBackendProxy</code>

`_router`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

## Properties
### [_backend]()
Type: <code>DatabaseBackendProxy</code>
### [objects]()
Type: <code>[EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;[]</code>
### [router]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

## Methods
### [add(obj)]()


Add object to th database.
Restores the object if it was deleted.

Returns: <code>Promise&lt;T&gt;</code>

Arguments: 

`obj`: <code>T</code>
### [getObjectById(id)]()


Returns: <code>undefined | [EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;</code>

Arguments: 

`id`: <code>string</code>
### [query(\[filter\])]()


<<<<<<< HEAD
<<<<<<< HEAD
Filter by type.

Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;T&gt;</code>

Arguments: 

`filter`: <code>[TypeFilter](/api/@dxos/react-client/types/TypeFilter)&lt;T&gt;</code>
Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;[Document](/api/@dxos/react-client/classes/Document)&gt;</code>
=======
Returns: <code>[Query](/api/@dxos/react-client/types/Query)&lt;[Document](/api/@dxos/react-client/classes/Document)&gt;</code>
>>>>>>> 5ed417652 (wip docs)
=======
Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;[Document](/api/@dxos/react-client/classes/Document)&gt;</code>
>>>>>>> 446e8e253 (docs: regen apidoc and ts guide)

Arguments: 

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt;</code>
### [remove(obj)]()


Remove object.

Returns: <code>void</code>

Arguments: 

`obj`: <code>T</code>