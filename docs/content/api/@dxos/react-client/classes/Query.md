# Class `Query`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/query/query.d.ts:55]()</sub>


Predicate based query.

## Constructors
### [constructor(_queryContext, filter)]()




Returns: <code>[Query](/api/@dxos/react-client/classes/Query)&lt;T&gt;</code>

Arguments: 

`_queryContext`: <code>QueryContext</code>

`filter`: <code>[Filter](/api/@dxos/react-client/classes/Filter)&lt;[EchoObject](/api/@dxos/react-client/interfaces/EchoObject)&gt;</code>



## Properties
### [filter]()
Type: <code>[Filter](/api/@dxos/react-client/classes/Filter)&lt;[EchoObject](/api/@dxos/react-client/interfaces/EchoObject)&gt;</code>



### [objects]()
Type: <code>T[]</code>



### [results]()
Type: <code>QueryResult&lt;T&gt;[]</code>




## Methods
### [subscribe(callback, \[fire\])]()




Returns: <code>[Subscription](/api/@dxos/react-client/types/Subscription)</code>

Arguments: 

`callback`: <code>function</code>

`fire`: <code>boolean</code>


### [update()]()


Resend query to remote agents.

Returns: <code>void</code>

Arguments: none




