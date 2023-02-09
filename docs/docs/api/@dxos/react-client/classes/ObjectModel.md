# Class `ObjectModel`
<sub>Declared in [packages/core/echo/object-model/dist/types/src/object-model.d.ts:29]()</sub>


Object mutation model.

## Constructors
### [constructor(_meta, _itemId, _getState, \[_mutationWriter\])]()


Returns: <code>[ObjectModel](/api/@dxos/react-client/classes/ObjectModel)</code>

Arguments: 

`_meta`: <code>ModelMeta&lt;any, any, any&gt;</code>

`_itemId`: <code>string</code>

`_getState`: <code>function</code>

`_mutationWriter`: <code>MutationWriter&lt;ObjectMutationSet&gt;</code>

## Properties
### [_getState]()
Type: <code>function</code>
### [update]()
Type: <code>Event&lt;Model&lt;ObjectModelState, ObjectMutationSet&gt;&gt;</code>
### [meta]()
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [itemId]()
Type: <code>string</code>
### [modelMeta]()
Type: <code>ModelMeta&lt;any, any, any&gt;</code>
### [readOnly]()
Type: <code>boolean</code>

## Methods
### [addToSet(key, value)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [builder()]()


Returns: <code>MutationBuilder</code>

Arguments: none
### [get(key, \[defaultValue\])]()


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>unknown</code>
### [getProperty(key, \[defaultValue\])]()


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [pushToArray(key, value)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [removeFromSet(key, value)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [set(key, value)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>unknown</code>
### [setProperties(properties)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`properties`: <code>any</code>
### [setProperty(key, value)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [subscribe(listener)]()


Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>
### [toJSON()]()


Returns: <code>object</code>

Arguments: none
### [toObject()]()


Returns an immutable object.

Returns: <code>ObjectModelState</code>

Arguments: none
### [toString()]()


Returns: <code>string</code>

Arguments: none
### [write(mutation)]()


Writes the raw mutation to the output stream.

Returns: <code>Promise&lt;MutationWriteReceipt&gt;</code>

Arguments: 

`mutation`: <code>ObjectMutationSet</code>