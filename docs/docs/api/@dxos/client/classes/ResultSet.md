# Class `ResultSet`
Declared in [`packages/core/echo/echo-db/dist/src/packlets/api/result-set.d.ts:6`]()


Reactive query results.

## Constructors
### [`constructor`]()


Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<T>`

Arguments: 

`itemUpdate`: `ReadOnlyEvent<void>`

`getter`: `function`

## Properties
### [`update`]()
Type: `ReadOnlyEvent<T[]>`

Triggered when  `value`  updates.
### [`first`]()
Type: `T`
### [`value`]()
Type: `T[]`

## Methods
### [`subscribe`]()


Subscribe for updates.

Returns: `UnsubscribeCallback`

Arguments: 

`listener`: `function`
### [`waitFor`]()


Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.

Returns: `Promise<T[]>`

Arguments: 

`condition`: `function`