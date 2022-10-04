# Class: SpaceProtocol

[@dxos/echo-db](../modules/dxos_echo_db.md).SpaceProtocol

## Constructors

### constructor

**new SpaceProtocol**(`_networkManager`, `topic`, `_swarmIdentity`, `_plugins`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `topic` | `PublicKey` |
| `_swarmIdentity` | [`SwarmIdentity`](../interfaces/dxos_echo_db.SwarmIdentity.md) |
| `_plugins` | `Plugin`[] |

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:30](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L30)

## Properties

### \_authenticator

 `Private` `Readonly` **\_authenticator**: `AuthPlugin`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:24](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L24)

___

### \_discoveryKey

 `Private` `Readonly` **\_discoveryKey**: `PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:25](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L25)

___

### \_peerId

 `Private` `Readonly` **\_peerId**: `PublicKey`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L26)

___

### \_presence

 `Private` `Readonly` **\_presence**: `PresencePlugin`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:23](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L23)

___

### authenticationFailed

 `Readonly` **authenticationFailed**: `Event`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L28)

## Accessors

### peers

`get` **peers**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:112](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L112)

## Methods

### \_createProtocol

`Private` **_createProtocol**(`credentials`, `__namedParameters`): `Protocol`

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentials` | `undefined` \| `Uint8Array` |
| `__namedParameters` | `Object` |
| `__namedParameters.channel` | `Buffer` |
| `__namedParameters.initiator` | `boolean` |

#### Returns

`Protocol`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:67](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L67)

___

### start

**start**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:43](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L43)

___

### stop

**stop**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-protocol.ts:63](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-protocol.ts#L63)
