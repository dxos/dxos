# Class `OrderedList`
<sub>Declared in [packages/core/echo/document-model/dist/types/src/ordered-list.d.ts:7]()</sub>


Utility class that wraps an  `DocumentModel`  and implements a linked list via key-values on a given property.

## Constructors
### [constructor(_model, \[_property\])]()


Returns: <code>[OrderedList](/api/@dxos/client/classes/OrderedList)</code>

Arguments: 

`_model`: <code>[DocumentModel](/api/@dxos/client/classes/DocumentModel)</code>

`_property`: <code>string</code>

## Properties
### [update]()
Type: <code>Event&lt;string[]&gt;</code>
### [id]()
Type: <code>string</code>
### [values]()
Type: <code>string[]</code>

Get ordered values.

## Methods
### [destroy()]()


Returns: <code>void</code>

Arguments: none
### [init(\[values\])]()


Clears the ordered set with the optional values.

Returns: <code>Promise&lt;string[]&gt;</code>

Arguments: 

`values`: <code>string[]</code>
### [insert(left, right)]()


Links the ordered items, possibly linking them to existing items.

Returns: <code>Promise&lt;string[]&gt;</code>

Arguments: 

`left`: <code>string</code>

`right`: <code>string</code>
### [refresh()]()


Refresh list from properties.

Returns: <code>[OrderedList](/api/@dxos/client/classes/OrderedList)</code>

Arguments: none
### [remove(values)]()


Removes the given element, possibly linked currently connected items.

Returns: <code>Promise&lt;string[]&gt;</code>

Arguments: 

`values`: <code>string[]</code>