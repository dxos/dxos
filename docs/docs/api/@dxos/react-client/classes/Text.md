# Class `Text`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/text-object.d.ts:4]()</sub>


Base class for all echo objects.
Can carry different models.


## Constructors
### [constructor(\[text\], \[kind\], \[field\])]()



Returns: <code>[Text](/api/@dxos/react-client/classes/Text)</code>

Arguments: 

`text`: <code>string</code>

`kind`: <code>TextKind</code>

`field`: <code>string</code>


## Properties
### [[base]]()
Type: <code>[Text](/api/@dxos/react-client/classes/Text)</code>

Proxied object.

### [[db]]()
Type: <code>undefined | [EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Database reference if bound.

### [content]()
Type: <code>undefined | YText | YXmlFragment</code>

### [doc]()
Type: <code>undefined | Doc</code>

### [id]()
Type: <code>string</code>

ID accessor.

### [kind]()
Type: <code>undefined | TextKind</code>

### [model]()
Type: <code>undefined | [TextModel](/api/@dxos/react-client/classes/TextModel)</code>

### [text]()
Type: <code>string</code>

Returns the text content of the object.


## Methods
### [\[subscribe\](callback)]()



Returns: <code>function</code>

Arguments: 

`callback`: <code>function</code>

### [_afterBind()]()



Returns: <code>void</code>

Arguments: none

### [_itemUpdate()]()



Returns: <code>void</code>

Arguments: none

### [toJSON()]()



Returns: <code>object</code>

Arguments: none

### [toString()]()



Returns: <code>string</code>

Arguments: none
