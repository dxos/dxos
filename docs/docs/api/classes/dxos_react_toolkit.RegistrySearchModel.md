# Class: RegistrySearchModel

[@dxos/react-toolkit](../modules/dxos_react_toolkit.md).RegistrySearchModel

Filterable resource search model.

## Implements

- `SearchModel`<`ResourceSet`\>

## Constructors

### constructor

**new RegistrySearchModel**(`_registry`, `_filters?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_registry` | `RegistryClient` | `undefined` |
| `_filters` | [`SearchFilter`](../types/dxos_react_toolkit.SearchFilter.md)[] | `[]` |

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:46](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L46)

## Properties

### \_results

 `Private` **\_results**: `SearchResult`<`ResourceSet`\>[] = `[]`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:42](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L42)

___

### \_text

 `Private` `Optional` **\_text**: `string` = `undefined`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L43)

___

### \_types

 `Private` **\_types**: `RegistryType`[] = `[]`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L44)

___

### \_update

 `Private` `Readonly` **\_update**: `Event`<`SearchResult`<`ResourceSet`\>[]\>

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L41)

## Accessors

### results

`get` **results**(): `SearchResult`<`ResourceSet`\>[]

#### Returns

`SearchResult`<`ResourceSet`\>[]

#### Implementation of

SearchModel.results

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:55](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L55)

___

### types

`get` **types**(): `RegistryType`[]

#### Returns

`RegistryType`[]

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:51](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L51)

## Methods

### doUpdate

**doUpdate**(): `void`

#### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L78)

___

### initialize

**initialize**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:63](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L63)

___

### setFilters

**setFilters**(`filters`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `filters` | [`SearchFilter`](../types/dxos_react_toolkit.SearchFilter.md)[] |

#### Returns

`void`

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:73](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L73)

___

### setText

**setText**(`text?`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text?` | `string` |

#### Returns

`void`

#### Implementation of

SearchModel.setText

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:68](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L68)

___

### subscribe

**subscribe**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`results`: `SearchResult`<`ResourceSet`\>[]) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Implementation of

SearchModel.subscribe

#### Defined in

[packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts:59](https://github.com/dxos/dxos/blob/main/packages/sdk/react-toolkit/src/containers/RegistrySearch/RegistrySearchModel.ts#L59)
