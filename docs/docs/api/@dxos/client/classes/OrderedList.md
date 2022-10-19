# Class `OrderedList`
> Declared in [`packages/core/echo/object-model/dist/src/ordered-list.d.ts:7`]()


Utility class that wraps an  `ObjectModel`  and implements a linked list via key-values on a given property.

## Constructors
```ts
new OrderedList (_model: ObjectModel, _property: string) => OrderedList
```

## Properties
### `update: Event<string[]>`
### `id:  get string`
### `values:  get string[]`
Get ordered values.

## Functions
```ts
destroy () => void
```
```ts
init (values: string[]) => Promise<string[]>
```
Clears the ordered set with the optional values.
```ts
insert (left: string, right: string) => Promise<string[]>
```
Links the ordered items, possibly linking them to existing items.
```ts
refresh () => OrderedList
```
Refresh list from properties.
```ts
remove (values: string[]) => Promise<string[]>
```
Removes the given element, possibly linked currently connected items.