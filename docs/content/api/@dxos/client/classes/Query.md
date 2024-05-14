# Class `Query`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/query/query.d.ts:79]()</sub>


Predicate based query.

## Constructors
### [constructor(_queryContext, filter)]()




Returns: <code>[Query](/api/@dxos/client/classes/Query)&lt;T&gt;</code>

Arguments: 

`_queryContext`: <code>QueryContext</code>

`filter`: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;any&gt;</code>



## Properties
### [filter]()
Type: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;any&gt;</code>



### [objects]()
Type: <code>[EchoReactiveObject](/api/@dxos/client/types/EchoReactiveObject)&lt;T&gt;[]</code>



### [results]()
Type: <code>QueryResult&lt;T&gt;[]</code>




## Methods
### [run(\[timeout\])]()




Returns: <code>Promise&lt;OneShotQueryResult&lt;T&gt;&gt;</code>

Arguments: 

`timeout`: <code>object</code>


### [subscribe(\[callback\], \[opts\])]()


Subscribe to query results.
Queries that have at least one subscriber are updated reactively when the underlying data changes.

Returns: <code>[Subscription](/api/@dxos/client/types/Subscription)</code>

Arguments: 

`callback`: <code>function</code>

`opts`: <code>QuerySubscriptionOptions</code>


