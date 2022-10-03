# Class: InvitationRequest

[@dxos/client](../modules/dxos_client.md).InvitationRequest

Invitation created by sender.

## Constructors

### constructor

**new InvitationRequest**(`_descriptor`, `connected`, `finished`, `error`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_descriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |
| `connected` | `Event`<`void`\> |
| `finished` | `Event`<`void`\> |
| `error` | `Event`<`Error`\> |

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:38](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L38)

## Properties

### \_hasConnected

 `Private` **\_hasConnected**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:14](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L14)

___

### \_isCanceled

 `Private` **\_isCanceled**: `boolean` = `false`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:16](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L16)

___

### canceled

 `Readonly` **canceled**: `Event`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:36](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L36)

___

### connected

 `Readonly` **connected**: `Event`<`void`\>

Fired when the remote peer connects.

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:23](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L23)

___

### error

 `Readonly` **error**: `Event`<`Error`\>

Fired when there's an error in the invitation process.

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:34](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L34)

___

### finished

 `Readonly` **finished**: `Event`<`void`\>

Fired when the invitation process completes successfully.

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L28)

## Accessors

### descriptor

`get` **descriptor**(): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:53](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L53)

___

### hasConnected

`get` **hasConnected**(): `boolean`

True if the connected event has been fired.

#### Returns

`boolean`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:64](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L64)

___

### secret

`get` **secret**(): `Uint8Array`

#### Returns

`Uint8Array`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:57](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L57)

## Methods

### cancel

**cancel**(): `void`

Cancel the invitation.

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:82](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L82)

___

### toString

**toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:88](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L88)

___

### wait

**wait**(`timeout?`): `Promise`<`void`\>

Wait until connected.

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeout?` | `number` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitation-request.ts:71](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L71)
