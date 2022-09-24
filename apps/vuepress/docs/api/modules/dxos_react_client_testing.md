# Module: @dxos/react-client-testing

## Table of contents

### Enumerations

- [ExportAction](../enums/dxos_react_client_testing.ExportAction.md)

### Interfaces

- [CreatePartyDialogProps](../interfaces/dxos_react_client_testing.CreatePartyDialogProps.md)
- [ImportIpfsDialogProps](../interfaces/dxos_react_client_testing.ImportIpfsDialogProps.md)
- [ImportMenuProps](../interfaces/dxos_react_client_testing.ImportMenuProps.md)
- [ItemAdapter](../interfaces/dxos_react_client_testing.ItemAdapter.md)

### Type Aliases

- [ItemMeta](dxos_react_client_testing.md#itemmeta)

### Variables

- [defaultSelectionText](dxos_react_client_testing.md#defaultselectiontext)
- [itemAdapter](dxos_react_client_testing.md#itemadapter)
- [typeMeta](dxos_react_client_testing.md#typemeta)

### Functions

- [CreatePartyDialog](dxos_react_client_testing.md#createpartydialog)
- [ExportMenu](dxos_react_client_testing.md#exportmenu)
- [ImportIpfsDialog](dxos_react_client_testing.md#importipfsdialog)
- [ImportMenu](dxos_react_client_testing.md#importmenu)
- [ProfileInitializer](dxos_react_client_testing.md#profileinitializer)
- [SelectionEditor](dxos_react_client_testing.md#selectioneditor)
- [execSelection](dxos_react_client_testing.md#execselection)
- [usePartyBootstrap](dxos_react_client_testing.md#usepartybootstrap)
- [usePartyBuilder](dxos_react_client_testing.md#usepartybuilder)
- [useSchemaBuilder](dxos_react_client_testing.md#useschemabuilder)
- [useTestParty](dxos_react_client_testing.md#usetestparty)

## Type Aliases

### ItemMeta

Ƭ **ItemMeta**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `childTypes?` | `string`[] |
| `color` | `any` |
| `icon` | `FC` |
| `label` | `string` |
| `plural` | `string` |

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/adapter.ts#L50)

## Variables

### defaultSelectionText

• `Const` **defaultSelectionText**: `string`

#### Defined in

[packages/sdk/react-client-testing/src/selection.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/selection.ts#L30)

___

### itemAdapter

• `Const` **itemAdapter**: [`ItemAdapter`](../interfaces/dxos_react_client_testing.ItemAdapter.md)

Get related data from items.

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:70](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/adapter.ts#L70)

___

### typeMeta

• `Const` **typeMeta**: `Object`

#### Index signature

▪ [i: `string`]: [`ItemMeta`](dxos_react_client_testing.md#itemmeta)

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/adapter.ts#L18)

## Functions

### CreatePartyDialog

▸ **CreatePartyDialog**(`__namedParameters`): `Element`

Dialog to create, join, or import party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`CreatePartyDialogProps`](../interfaces/dxos_react_client_testing.CreatePartyDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-client-testing/src/components/CreatePartyDialog.tsx:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/components/CreatePartyDialog.tsx#L26)

___

### ExportMenu

▸ **ExportMenu**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `ExportMenuProps` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-client-testing/src/components/ExportMenu.tsx:19](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/components/ExportMenu.tsx#L19)

___

### ImportIpfsDialog

▸ **ImportIpfsDialog**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ImportIpfsDialogProps`](../interfaces/dxos_react_client_testing.ImportIpfsDialogProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-client-testing/src/components/ImportIpfsDialog.tsx:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/components/ImportIpfsDialog.tsx#L17)

___

### ImportMenu

▸ **ImportMenu**(`__namedParameters`): `Element`

Dialog to create, join, or import party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ImportMenuProps`](../interfaces/dxos_react_client_testing.ImportMenuProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-client-testing/src/components/ImportMenu.tsx:28](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/components/ImportMenu.tsx#L28)

___

### ProfileInitializer

▸ **ProfileInitializer**(`__namedParameters`): ``null`` \| `Element`

Automatically creates a random DXOS profile.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.children` | `ReactNode` |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-client-testing/src/containers/ProfileInitializer.tsx:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/containers/ProfileInitializer.tsx#L14)

___

### SelectionEditor

▸ **SelectionEditor**(`__namedParameters`): `Element`

Simple editor that evaluates text as method calls against a party object.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `SelectionEditorProps` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-client-testing/src/components/SelectionEditor.tsx:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/components/SelectionEditor.tsx#L42)

___

### execSelection

▸ **execSelection**(`party`, `text`): `undefined` \| `Selection`<`any`, `void`\>

Eval method against a party object.
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | `Party` |
| `text` | `string` |

#### Returns

`undefined` \| `Selection`<`any`, `void`\>

#### Defined in

[packages/sdk/react-client-testing/src/selection.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/selection.ts#L15)

___

### usePartyBootstrap

▸ **usePartyBootstrap**(`peerCount?`): { `client`: `Client` ; `party`: `Party`  }[]

Hook which returns a set of peers joined in a shared party.

Useful for setting up examples or tests which display multiple peers in a single view.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `peerCount` | `number` | `2` |

#### Returns

{ `client`: `Client` ; `party`: `Party`  }[]

#### Defined in

[packages/sdk/react-client-testing/src/hooks/usePartyBootstrap.ts:14](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/hooks/usePartyBootstrap.ts#L14)

___

### usePartyBuilder

▸ **usePartyBuilder**(`party?`): `undefined` \| `PartyBuilder`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party?` | `Party` |

#### Returns

`undefined` \| `PartyBuilder`

#### Defined in

[packages/sdk/react-client-testing/src/hooks/useTestParty.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/hooks/useTestParty.ts#L45)

___

### useSchemaBuilder

▸ **useSchemaBuilder**(`party?`): `undefined` \| `SchemaBuilder`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party?` | `Party` |

#### Returns

`undefined` \| `SchemaBuilder`

#### Defined in

[packages/sdk/react-client-testing/src/hooks/useSchemaBuilder.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/hooks/useSchemaBuilder.ts#L13)

___

### useTestParty

▸ **useTestParty**(`callback?`): `undefined` \| `Party`

Generate test party.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `callback` | `TestPartyCallback` | `buildTestParty` |

#### Returns

`undefined` \| `Party`

#### Defined in

[packages/sdk/react-client-testing/src/hooks/useTestParty.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client-testing/src/hooks/useTestParty.ts#L17)
