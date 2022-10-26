# Class `ResultSet`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/result-set.d.ts:6`]()


Reactive query results.

## Constructors
### constructor
```ts
<T> (itemUpdate: ReadOnlyEvent<void>, getter: function) => ResultSet<T>
```

## Properties
### update 
> Type: `ReadOnlyEvent<T[]>`
<br/>

Triggered when  `value`  updates.
### first
> Type: `T`
<br/>
### value
> Type: `T[]`
<br/>

## Methods
### subscribe
```ts
(listener: function) => function
```
Subscribe for updates.
### waitFor
```ts
(condition: function) => Promise<T[]>
```
Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.