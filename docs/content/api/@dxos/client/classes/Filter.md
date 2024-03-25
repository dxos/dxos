# Class `Filter`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/query/filter.d.ts:23]()</sub>




## Constructors
### [constructor(params, \[options\])]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>

Arguments: 

`params`: <code>FilterParams&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/client/interfaces/QueryOptions)</code>



## Properties
### [and]()
Type: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;[EchoObject](/api/@dxos/client/interfaces/EchoObject)&gt;[]</code>



### [not]()
Type: <code>boolean</code>



### [options]()
Type: <code>[QueryOptions](/api/@dxos/client/interfaces/QueryOptions)</code>



### [or]()
Type: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;[EchoObject](/api/@dxos/client/interfaces/EchoObject)&gt;[]</code>



### [predicate]()
Type: <code>OperatorFilter&lt;any&gt;</code>



### [properties]()
Type: <code>Record&lt;string, any&gt;</code>



### [text]()
Type: <code>string</code>



### [type]()
Type: <code>Reference</code>



### [spaceKeys]()
Type: <code>undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)[]</code>




## Methods
### [toProto()]()




Returns: <code>Filter</code>

Arguments: none




### [and(filters)]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>

Arguments: 

`filters`: <code>[FilterSource](/api/@dxos/client/types/FilterSource)&lt;T&gt;[]</code>


### [from(\[source\], \[options\])]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>

Arguments: 

`source`: <code>[FilterSource](/api/@dxos/client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/client/interfaces/QueryOptions)</code>


### [fromProto(proto)]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;[EchoObject](/api/@dxos/client/interfaces/EchoObject)&gt;</code>

Arguments: 

`proto`: <code>Filter</code>


### [not(source)]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>

Arguments: 

`source`: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>


### [or(filters)]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;T&gt;</code>

Arguments: 

`filters`: <code>[FilterSource](/api/@dxos/client/types/FilterSource)&lt;T&gt;[]</code>


### [schema(schema, \[filter\])]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;[Expando](/api/@dxos/client/types/Expando)&gt;</code>

Arguments: 

`schema`: <code>[Schema](/api/@dxos/client/classes/Schema)</code>

`filter`: <code>Record&lt;string, any&gt; | OperatorFilter&lt;any&gt;</code>


### [typename(typename, \[filter\])]()




Returns: <code>[Filter](/api/@dxos/client/classes/Filter)&lt;any&gt;</code>

Arguments: 

`typename`: <code>string</code>

`filter`: <code>Record&lt;string, any&gt; | OperatorFilter&lt;any&gt;</code>


