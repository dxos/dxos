# Class `SpaceSerializer`
<sub>Declared in [packages/sdk/client/src/packlets/client/serializer.ts:16](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L16)</sub>


Import/export space.

## Constructors
### [constructor(_client)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L18)


Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: 

`_client`: <code>[Client](/api/@dxos/client/classes/Client)</code>

## Properties

## Methods
### [deserializeSpace(data)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L27)


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`data`: <code>Uint8Array</code>
### [serializeSpace(space)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L22)


Returns: <code>Promise&lt;Blob&gt;</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/client/interfaces/Space)</code>