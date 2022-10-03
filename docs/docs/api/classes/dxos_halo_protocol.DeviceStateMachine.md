# Class: DeviceStateMachine

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).DeviceStateMachine

Processes device invitation credentials.

## Constructors

### constructor

**new DeviceStateMachine**(`_identityKey`, `_deviceKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_identityKey` | `PublicKey` |
| `_deviceKey` | `PublicKey` |

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts:21](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts#L21)

## Properties

### authorizedDeviceKeys

 `Readonly` **authorizedDeviceKeys**: `ComplexSet`<`PublicKey`\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts#L17)

___

### deviceChainReady

 `Readonly` **deviceChainReady**: `Trigger`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts:18](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts#L18)

___

### deviceCredentialChain

 `Optional` **deviceCredentialChain**: `Chain`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts:19](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts#L19)

## Methods

### process

**process**(`credential`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `credential` | `Credential` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/device-state-machine.ts#L26)
