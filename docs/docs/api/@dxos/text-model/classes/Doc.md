# Class `Doc`
<sub>Declared in [node_modules/.pnpm/yjs@13.5.44/node_modules/yjs/dist/src/utils/Doc.d.ts:16]()</sub>


A Yjs instance handles the state of shared data.

## Constructors
### [constructor(\[opts\])]()


Returns: <code>[Doc](/api/@dxos/text-model/classes/Doc)</code>

Arguments: 

`opts`: <code>DocOpts</code>

## Properties
### [_item]()
Type: <code>"null" | Item</code>

If this document is a subdocument - a document integrated into another document - then _item is defined.
### [_observers]()
Type: <code>Map&lt;string, any&gt;</code>

Some desc.
### [_transaction]()
Type: <code>"null" | Transaction</code>
### [_transactionCleanups]()
Type: <code>Transaction[]</code>
### [autoLoad]()
Type: <code>boolean</code>
### [clientID]()
Type: <code>number</code>
### [collectionid]()
Type: <code>"null" | string</code>
### [gc]()
Type: <code>boolean</code>
### [gcFilter]()
Type: <code>function</code>
### [guid]()
Type: <code>string</code>
### [isLoaded]()
Type: <code>boolean</code>
### [meta]()
Type: <code>any</code>
### [share]()
Type: <code>Map&lt;string, AbstractType&lt;YEvent&lt;any&gt;&gt;&gt;</code>
### [shouldLoad]()
Type: <code>boolean</code>
### [store]()
Type: <code>StructStore</code>
### [subdocs]()
Type: <code>Set&lt;[Doc](/api/@dxos/text-model/classes/Doc)&gt;</code>
### [whenLoaded]()
Type: <code>Promise&lt;any&gt;</code>

## Methods
### [destroy()]()


Returns: <code>void</code>

Arguments: none
### [emit(name, args)]()


Emit a named event. All registered event listeners that listen to the
specified name will receive the event.

Returns: <code>void</code>

Arguments: 

`name`: <code>string</code>

`args`: <code>any[]</code>
### [get(name, \[TypeConstructor\])]()


Define a shared data type.

Multiple calls of  `y.get(name, TypeConstructor)`  yield the same result
and do not overwrite each other. I.e.
 `y.define(name, Y.Array) === y.define(name, Y.Array)` 

After this method is called, the type is also available on  `y.share.get(name)` .

*Best Practices:*
Define all types right after the Yjs instance is created and store them in a separate object.
Also use the typed methods  `getText(name)` ,  `getArray(name)` , ..

Returns: <code>AbstractType&lt;any&gt;</code>

Arguments: 

`name`: <code>string</code>

`TypeConstructor`: <code>Function</code>
### [getArray(\[name\])]()


Returns: <code>YArray&lt;T&gt;</code>

Arguments: 

`name`: <code>string</code>
### [getMap(\[name\])]()


Returns: <code>YMap&lt;T_1&gt;</code>

Arguments: 

`name`: <code>string</code>
### [getSubdocGuids()]()


Returns: <code>Set&lt;string&gt;</code>

Arguments: none
### [getSubdocs()]()


Returns: <code>Set&lt;[Doc](/api/@dxos/text-model/classes/Doc)&gt;</code>

Arguments: none
### [getText(\[name\])]()


Returns: <code>YText</code>

Arguments: 

`name`: <code>string</code>
### [getXmlFragment(\[name\])]()


Returns: <code>YXmlFragment</code>

Arguments: 

`name`: <code>string</code>
### [load()]()


Notify the parent document that you request to load data into this subdocument (if it is a subdocument).

 `load()`  might be used in the future to request any provider to load the most current data.

It is safe to call  `load()`  multiple times.

Returns: <code>void</code>

Arguments: none
### [off(name, f)]()


Returns: <code>void</code>

Arguments: 

`name`: <code>string</code>

`f`: <code>Function</code>
### [on(eventName, f)]()


Returns: <code>void</code>

Arguments: 

`eventName`: <code>string</code>

`f`: <code>function</code>
### [once(name, f)]()


Returns: <code>void</code>

Arguments: 

`name`: <code>string</code>

`f`: <code>Function</code>
### [toJSON()]()


Converts the entire document into a js object, recursively traversing each yjs type
Doesn't log types that have not been defined (using ydoc.getType(..)).

Returns: <code>object</code>

Arguments: none
### [transact(f, \[origin\])]()


Changes that happen inside of a transaction are bundled. This means that
the observer fires _after_ the transaction is finished and that all changes
that happened inside of the transaction are sent as one message to the
other peers.

Returns: <code>void</code>

Arguments: 

`f`: <code>function</code>

`origin`: <code>any</code>