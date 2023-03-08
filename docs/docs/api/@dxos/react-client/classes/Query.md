# Class `Query`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database.d.ts:48]()</sub>





## Constructors
### [constructor(_dbObjects, _updateEvent, _filter)]()



Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;T&gt;</code>

Arguments: 

`_dbObjects`: <code>Map&lt;string, [EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;&gt;</code>

`_updateEvent`: <code>Event&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;Model&lt;any, any&gt;&gt;[]&gt;</code>

`_filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt;</code>


## Properties
### [objects]()
Type: <code>T[]</code>


## Methods
### [subscribe(callback)]()



Returns: <code>[Subscription](/api/@dxos/react-client/types/Subscription)</code>

Arguments: 

`callback`: <code>function</code>
