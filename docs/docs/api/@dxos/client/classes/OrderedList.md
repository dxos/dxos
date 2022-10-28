# Class `OrderedList`
> Declared in [`packages/core/echo/object-model/dist/src/ordered-list.d.ts:7`]()


Utility class that wraps an  `ObjectModel`  and implements a linked list via key-values on a given property.

## Constructors
### constructor
```ts
(_model: [ObjectModel](/api/@dxos/client/classes/ObjectModel), _property: string) => [OrderedList](/api/@dxos/client/classes/OrderedList)
```

## Properties
### update 
Type: Event&lt;string[]&gt;
### id
Type: string
### values
Type: string[]

Get ordered values.

## Methods
### destroy
```ts
() => void
```
### init
```ts
(values: string[]) => Promise&lt;string[]&gt;
```
Clears the ordered set with the optional values.
### insert
```ts
(left: string, right: string) => Promise&lt;string[]&gt;
```
Links the ordered items, possibly linking them to existing items.
### refresh
```ts
() => [OrderedList](/api/@dxos/client/classes/OrderedList)
```
Refresh list from properties.
### remove
```ts
(values: string[]) => Promise&lt;string[]&gt;
```
Removes the given element, possibly linked currently connected items.