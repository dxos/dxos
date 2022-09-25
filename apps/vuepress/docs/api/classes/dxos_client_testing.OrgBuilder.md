# Class: OrgBuilder

[@dxos/client-testing](../modules/dxos_client_testing.md).OrgBuilder

Org

## Constructors

### constructor

**new OrgBuilder**(`_builder`, `_org`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_builder` | [`PartyBuilder`](dxos_client_testing.PartyBuilder.md) |
| `_org` | `Item`<`ObjectModel`\> |

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:69](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client-testing/src/builders/partyBuilder.ts#L69)

## Accessors

### org

`get` **org**(): `Item`<`ObjectModel`\>

#### Returns

`Item`<`ObjectModel`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:74](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client-testing/src/builders/partyBuilder.ts#L74)

## Methods

### createPeople

**createPeople**(`n?`): `Promise`<`Item`<`ObjectModel`\>[]\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `n` | [`NumberRange`](../types/dxos_client_testing.NumberRange.md) | `1` |

#### Returns

`Promise`<`Item`<`ObjectModel`\>[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:78](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client-testing/src/builders/partyBuilder.ts#L78)

___

### createProjects

**createProjects**(`n?`, `callback?`): `Promise`<`Item`<`ObjectModel`\>[]\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `n` | [`NumberRange`](../types/dxos_client_testing.NumberRange.md) | `1` |
| `callback?` | (`buidler`: [`ProjectBuilder`](dxos_client_testing.ProjectBuilder.md)) => `Promise`<`void`\> | `undefined` |

#### Returns

`Promise`<`Item`<`ObjectModel`\>[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:84](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client-testing/src/builders/partyBuilder.ts#L84)
