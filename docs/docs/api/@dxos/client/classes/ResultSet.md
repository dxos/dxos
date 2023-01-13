# Class `ResultSet`
<sub>Declared in [packages/core/echo/echo-db/dist/types/src/packlets/api/result-set.d.ts:6]()</sub>


Reactive query results.

## Constructors
### [constructor(itemUpdate, getter)]()


Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;T&gt;</code>

Arguments: 

`itemUpdate`: <code>ReadOnlyEvent&lt;void&gt;</code>

`getter`: <code>function</code>

## Properties
### [update]()
Type: <code>ReadOnlyEvent&lt;T[]&gt;</code>

Triggered when  `value`  updates.
### [first]()
Type: <code>T</code>
### [value]()
Type: <code>T[]</code>

## Methods
### [subscribe(listener)]()


Subscribe for updates.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`listener`: <code>function</code>
### [waitFor(condition)]()


Waits for condition to be true and then returns the value that passed the condition first.

Current value is also checked.

Returns: <code>Promise&lt;T[]&gt;</code>

Arguments: 

`condition`: <code>function</code>