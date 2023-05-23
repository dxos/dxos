# Class `Query`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/query.d.ts:16]()</sub>


Predicate based query.


## Constructors
### [constructor(_objects, _updateEvent, filter, \[options\])]()



Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;T&gt;</code>

Arguments: 

`_objects`: <code>Map&lt;string, [EchoObject](/api/@dxos/react-client/classes/EchoObject)&lt;any&gt;&gt;</code>

`_updateEvent`: <code>Event&lt;[Item](/api/@dxos/react-client/classes/Item)&lt;Model&lt;any, any&gt;&gt;[]&gt;</code>

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt; | [Filter](/api/@dxos/react-client/types/Filter)&lt;any&gt;[]</code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/types/QueryOptions)</code>


## Properties
### [objects]()
Type: <code>T[]</code>


## Methods
### [_match(object)]()



Returns: <code>boolean</code>

Arguments: 

`object`: <code>T</code>

### [subscribe(callback)]()



Returns: <code>[Subscription](/api/@dxos/react-client/types/Subscription)</code>

Arguments: 

`callback`: <code>function</code>
