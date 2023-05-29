# Class `TextModel`
<sub>Declared in [packages/core/echo/text-model/dist/types/src/text-model.d.ts:10]()</sub>





## Constructors
### [constructor(meta, itemId, getState, \[writeStream\])]()



Returns: <code>[TextModel](/api/@dxos/client/classes/TextModel)</code>

Arguments: 

`meta`: <code>ModelMeta</code>

`itemId`: <code>string</code>

`getState`: <code>function</code>

`writeStream`: <code>MutationWriter&lt;TextMutation&gt;</code>


## Properties
### [_getState]()
Type: <code>function</code>

### [meta]()
Type: <code>ModelMeta</code>

### [content]()
Type: <code>YText | YXmlFragment</code>

### [doc]()
Type: <code>Doc</code>

### [field]()
Type: <code>string</code>

### [itemId]()
Type: <code>string</code>

### [kind]()
Type: <code>TextKind</code>

### [modelMeta]()
Type: <code>ModelMeta</code>

### [readOnly]()
Type: <code>boolean</code>

### [textContent]()
Type: <code>string</code>


## Methods
### [initialize()]()



Returns: <code>void</code>

Arguments: none

### [insert(text, index)]()



Returns: <code>void</code>

Arguments: 

`text`: <code>string</code>

`index`: <code>number</code>

### [insertTextNode(text, \[index\])]()



Creates a new  `&lt;paragraph&gt;`  element with the given text content and inserts it at the given index.

Throws if the  `Text`  instance is plain text.


Returns: <code>void</code>

Arguments: 

`text`: <code>string</code>

`index`: <code>number</code>

### [toJSON()]()



Returns: <code>object</code>

Arguments: none

### [toString()]()



Returns: <code>string</code>

Arguments: none

### [write(mutation)]()



Writes the raw mutation to the output stream.


Returns: <code>Promise&lt;MutationWriteReceipt&gt;</code>

Arguments: 

`mutation`: <code>TextMutation</code>
