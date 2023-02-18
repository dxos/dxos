# Class `TextModel`
<sub>Declared in [packages/core/echo/text-model/src/text-model.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L44)</sub>




## Constructors
### [constructor(meta, itemId, getState, \[writeStream\])](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L53)


Returns: <code>[TextModel](/api/@dxos/text-model/classes/TextModel)</code>

Arguments: 

`meta`: <code>ModelMeta&lt;any, any, any&gt;</code>

`itemId`: <code>string</code>

`getState`: <code>function</code>

`writeStream`: <code>MutationWriter&lt;Mutation&gt;</code>

## Properties
### [_getState]()
Type: <code>function</code>
### [update]()
Type: <code>Event&lt;Model&lt;[Doc](/api/@dxos/text-model/classes/Doc), Mutation&gt;&gt;</code>
### [meta](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L45)
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [content](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L71)
Type: <code>YXmlFragment</code>
### [doc](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L67)
Type: <code>[Doc](/api/@dxos/text-model/classes/Doc)</code>
### [itemId]()
Type: <code>string</code>
### [modelMeta]()
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [readOnly]()
Type: <code>boolean</code>
### [textContent](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L76)
Type: <code>string</code>

## Methods
### [insert(text, index)](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L157)


Returns: <code>void</code>

Arguments: 

`text`: <code>string</code>

`index`: <code>number</code>
### [insertTextNode(text, index)](https://github.com/dxos/dxos/blob/main/packages/core/echo/text-model/src/text-model.ts#L161)


Returns: <code>void</code>

Arguments: 

`text`: <code>string</code>

`index`: <code>number</code>
### [subscribe(listener)]()


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>
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

`mutation`: <code>Mutation</code>