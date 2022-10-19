# Class `ResultSet`
> Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/result-set.d.ts`]()

Reactive query results.

## Constructors
```ts
new ResultSet <T> (itemUpdate: ReadOnlyEvent<void>, getter: function) => ResultSet<T>
```

## Properties
### `update: ReadOnlyEvent<T[]>`
Triggered when  `value`  updates.

## Functions
```ts
subscribe (listener: function) => function
```
Subscribe for updates.
```ts
waitFor (condition: function) => Promise<T[]>
```
Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.