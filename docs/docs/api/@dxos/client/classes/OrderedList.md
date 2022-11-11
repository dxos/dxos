# Class `OrderedList`
Declared in [`packages/core/echo/object-model/dist/src/ordered-list.d.ts:7`]()


Utility class that wraps an  `ObjectModel`  and implements a linked list via key-values on a given property.

## Constructors
### [`constructor`]()


Returns: [`OrderedList`](/api/@dxos/client/classes/OrderedList)

Arguments: 

`_model`: [`ObjectModel`](/api/@dxos/client/classes/ObjectModel)

`_property`: `string`

## Properties
### [`update`]()
Type: `Event<string[]>`
### [`id`]()
Type: `string`
### [`values`]()
Type: `string[]`

Get ordered values.

## Methods
### [`destroy`]()


Returns: `void`

Arguments: none
### [`init`]()


Clears the ordered set with the optional values.

Returns: `Promise<string[]>`

Arguments: 

`values`: `string[]`
### [`insert`]()


Links the ordered items, possibly linking them to existing items.

Returns: `Promise<string[]>`

Arguments: 

`left`: `string`

`right`: `string`
### [`refresh`]()


Refresh list from properties.

Returns: [`OrderedList`](/api/@dxos/client/classes/OrderedList)

Arguments: none
### [`remove`]()


Removes the given element, possibly linked currently connected items.

Returns: `Promise<string[]>`

Arguments: 

`values`: `string[]`