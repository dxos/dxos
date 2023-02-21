# Class `Query`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database.d.ts:56]()</sub>




## Constructors
### [constructor(_dbObjects, _updateEvent, _filter)]()


Returns: <code>[Query](/api/@dxos/client/classes/Query)&lt;T&gt;</code>

Arguments: 

`_dbObjects`: <code>Map&lt;string, [EchoObject](/api/@dxos/client/classes/EchoObject)&lt;any&gt;&gt;</code>

`_updateEvent`: <code>Event&lt;[Item](/api/@dxos/client/classes/Item)&lt;Model&lt;any, any&gt;&gt;[]&gt;</code>

`_filter`: <code>[Filter](/api/@dxos/client/types/Filter)&lt;any&gt;</code>

## Properties
### [objects]()
Type: <code>T[]</code>

## Methods
### [subscribe(callback)]()


Returns: <code>[Subscription](/api/@dxos/client/types/Subscription)</code>

Arguments: 

`callback`: <code>function</code>