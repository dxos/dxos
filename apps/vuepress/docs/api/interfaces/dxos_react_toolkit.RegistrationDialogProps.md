# Interface: RegistrationDialogProps

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).RegistrationDialogProps

## Table of contents

### Properties

- [debug](dxos_react_toolkit.RegistrationDialogProps.md#debug)
- [initialStage](dxos_react_toolkit.RegistrationDialogProps.md#initialstage)
- [modal](dxos_react_toolkit.RegistrationDialogProps.md#modal)
- [onComplete](dxos_react_toolkit.RegistrationDialogProps.md#oncomplete)
- [onJoinHalo](dxos_react_toolkit.RegistrationDialogProps.md#onjoinhalo)
- [onRestore](dxos_react_toolkit.RegistrationDialogProps.md#onrestore)
- [open](dxos_react_toolkit.RegistrationDialogProps.md#open)
- [skipSeedCheck](dxos_react_toolkit.RegistrationDialogProps.md#skipseedcheck)

## Properties

### debug

• `Optional` **debug**: `boolean`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:54](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L54)

___

### initialStage

• `Optional` **initialStage**: [`RegistrationStage`](../enums/dxos_react_toolkit.RegistrationStage.md)

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:51](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L51)

___

### modal

• `Optional` **modal**: `boolean`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:53](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L53)

___

### onComplete

• **onComplete**: (`seedPhrase`: `string`, `username`: `string`) => `void`

#### Type declaration

▸ (`seedPhrase`, `username`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |
| `username` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:56](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L56)

___

### onJoinHalo

• `Optional` **onJoinHalo**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:57](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L57)

___

### onRestore

• **onRestore**: (`seedPhrase`: `string`) => `void`

#### Type declaration

▸ (`seedPhrase`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:55](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L55)

___

### open

• **open**: `boolean`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:50](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L50)

___

### skipSeedCheck

• `Optional` **skipSeedCheck**: `boolean`

#### Defined in

[packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx:52](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-toolkit/src/components/RegistrationDialog.tsx#L52)
