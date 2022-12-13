# Class `SpaceSerializer`
<sub>Declared in [packages/sdk/client/src/packlets/client/serializer.ts:15](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L15)</sub>


Import/export space.

## Constructors
### [constructor(_echo)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L17)


Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: 

`_echo`: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

## Properties

## Methods
### [deserializeSpace(data)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L26)


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`data`: <code>Uint8Array</code>
### [serializeSpace(space)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L21)


Returns: <code>Promise&lt;Blob&gt;</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/client/interfaces/Space)</code>