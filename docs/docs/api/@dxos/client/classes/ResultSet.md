# Class `ResultSet`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/result-set.d.ts:6`]()


Reactive query results.

## Constructors
### constructor
```ts
<T> (itemUpdate: ReadOnlyEvent&lt;void&gt;, getter: function) => [ResultSet](/api/@dxos/client/classes/ResultSet)&lt;T&gt;
```

## Properties
### update 
Type: ReadOnlyEvent&lt;T[]&gt;

Triggered when  `value`  updates.
### first
Type: T
### value
Type: T[]

## Methods
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.
### waitFor
```ts
(condition: function) => Promise&lt;T[]&gt;
```
Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.