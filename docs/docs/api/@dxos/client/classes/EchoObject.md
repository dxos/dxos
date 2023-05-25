# Class `EchoObject`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/object.d.ts:10]()</sub>


Base class for all echo objects.
Can carry different models.


## Constructors
### [constructor(modelConstructor)]()



Returns: <code>[EchoObject](/api/@dxos/client/classes/EchoObject)&lt;T&gt;</code>

Arguments: 

`modelConstructor`: <code>ModelConstructor&lt;T&gt;</code>


## Properties
### [[base]]()
Type: <code>[EchoObject](/api/@dxos/client/classes/EchoObject)&lt;T&gt;</code>

Proxied object.

### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Database reference if bound.

### [id]()
Type: <code>string</code>

ID accessor.


## Methods
### [\[subscribe\](callback)]()



Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>
