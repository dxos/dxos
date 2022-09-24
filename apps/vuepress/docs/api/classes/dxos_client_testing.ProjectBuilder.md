# Class: ProjectBuilder

[@dxos/client-testing](../modules/dxos_client_testing.md).ProjectBuilder

Project

## Table of contents

### Constructors

- [constructor](dxos_client_testing.ProjectBuilder.md#constructor)

### Accessors

- [project](dxos_client_testing.ProjectBuilder.md#project)

### Methods

- [createTasks](dxos_client_testing.ProjectBuilder.md#createtasks)

## Constructors

### constructor

• **new ProjectBuilder**(`_builder`, `_org`, `_project`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_builder` | [`PartyBuilder`](dxos_client_testing.PartyBuilder.md) |
| `_org` | `Item`<`ObjectModel`\> |
| `_project` | `Item`<`ObjectModel`\> |

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L45)

## Accessors

### project

• `get` **project**(): `Item`<`ObjectModel`\>

#### Returns

`Item`<`ObjectModel`\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:51](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L51)

## Methods

### createTasks

▸ **createTasks**(`n?`, `people?`): `Promise`<`void`[]\>

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `n` | [`NumberRange`](../modules/dxos_client_testing.md#numberrange) | `1` |
| `people?` | `Item`<`ObjectModel`\>[] | `undefined` |

#### Returns

`Promise`<`void`[]\>

#### Defined in

[packages/sdk/client-testing/src/builders/partyBuilder.ts:55](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/client-testing/src/builders/partyBuilder.ts#L55)
