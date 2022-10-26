# Class `OrderedList`
> Declared in [`packages/core/echo/object-model/dist/src/ordered-list.d.ts:7`]()


Utility class that wraps an  `ObjectModel`  and implements a linked list via key-values on a given property.

## Constructors
### constructor
```ts
(_model: ObjectModel, _property: string) => OrderedList
```

## Properties
### update 
> Type: `Event<string[]>`
<br/>
### id
> Type: `string`
<br/>
### values
> Type: `string[]`
<br/>

Get ordered values.

## Methods
### destroy
```ts
() => void
```
### init
```ts
(values: string[]) => Promise<string[]>
```
Clears the ordered set with the optional values.
### insert
```ts
(left: string, right: string) => Promise<string[]>
```
Links the ordered items, possibly linking them to existing items.
### refresh
```ts
() => OrderedList
```
Refresh list from properties.
### remove
```ts
(values: string[]) => Promise<string[]>
```
Removes the given element, possibly linked currently connected items.