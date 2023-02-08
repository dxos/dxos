# Class `DatabaseRouter`
<sub>Declared in [packages/core/echo/echo-schema/dist/types/src/database-router.d.ts:8]()</sub>


Manages cross-space databases.

## Constructors
### [constructor()]()


Returns: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

Arguments: none

## Properties
### [schema]()
Type: <code>undefined | [EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>

## Methods
### [createAccessObserver()]()


Returns: <code>[AccessObserver](/api/@dxos/client/classes/AccessObserver)</code>

Arguments: none
### [createSubscription(onUpdate)]()


Subscribe to database updates.

Returns: <code>[SubscriptionHandle](/api/@dxos/client/interfaces/SubscriptionHandle)</code>

Arguments: 

`onUpdate`: <code>function</code>
### [register(spaceKey, database)]()


Returns: <code>void</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

`database`: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>
### [setSchema(schema)]()


Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>