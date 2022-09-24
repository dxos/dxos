# Module: @dxos/react-registry-client

## Table of contents

### Interfaces

- [BotData](../interfaces/dxos_react_registry_client.BotData.md)
- [Result](../interfaces/dxos_react_registry_client.Result.md)

### Type Aliases

- [RegistryContext](dxos_react_registry_client.md#registrycontext)

### Variables

- [RegistryContext](dxos_react_registry_client.md#registrycontext-1)

### Functions

- [RegistryInitializer](dxos_react_registry_client.md#registryinitializer)
- [RegistryProvider](dxos_react_registry_client.md#registryprovider)
- [useAccountClient](dxos_react_registry_client.md#useaccountclient)
- [useAuthorities](dxos_react_registry_client.md#useauthorities)
- [useBots](dxos_react_registry_client.md#usebots)
- [useRecordTypes](dxos_react_registry_client.md#userecordtypes)
- [useRecords](dxos_react_registry_client.md#userecords)
- [useRegistry](dxos_react_registry_client.md#useregistry)
- [useResources](dxos_react_registry_client.md#useresources)

## Type Aliases

### RegistryContext

Ƭ **RegistryContext**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `accounts?` | `AccountsClient` |
| `registry` | `RegistryClient` |

#### Defined in

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L10)

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L16)

## Variables

### RegistryContext

• **RegistryContext**: `Context`<`undefined` \| [`RegistryContext`](dxos_react_registry_client.md#registrycontext-1)\>

#### Defined in

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L10)

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L16)

## Functions

### RegistryInitializer

▸ **RegistryInitializer**(`__namedParameters`): `Element`

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `RegistryProviderProps` |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-registry-client/src/containers/RegistryProvider.tsx:66](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/containers/RegistryProvider.tsx#L66)

___

### RegistryProvider

▸ **RegistryProvider**(`__namedParameters`): ``null`` \| `Element`

Initializes and provides a DXNS registry instance given a config object or config generator.
To be used with `useRegistry` hook.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `RegistryProviderProps` |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-registry-client/src/containers/RegistryProvider.tsx:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/containers/RegistryProvider.tsx#L26)

___

### useAccountClient

▸ **useAccountClient**(): `undefined` \| `AccountsClient`

Returns the AccountClient for interacting with DXNS developer accounts.

Requires `RegistryProvider` component wrapper.

#### Returns

`undefined` \| `AccountsClient`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L33)

___

### useAuthorities

▸ **useAuthorities**(): `Result`

Returns the set of authorities.

#### Returns

`Result`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/queries/useDomains.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/queries/useDomains.ts#L18)

___

### useBots

▸ **useBots**(): [`Result`](../interfaces/dxos_react_registry_client.Result.md)

Returns info about bot records.

#### Returns

[`Result`](../interfaces/dxos_react_registry_client.Result.md)

#### Defined in

[packages/sdk/react-registry-client/src/hooks/queries/useBots.ts:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/queries/useBots.ts#L48)

___

### useRecordTypes

▸ **useRecordTypes**(`filter?`): `Result`

Returns matching type records.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `Filter` |

#### Returns

`Result`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/queries/useRecordTypes.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/queries/useRecordTypes.ts#L18)

___

### useRecords

▸ **useRecords**(`filter?`): `Result`

Returns matching records.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `Filter` |

#### Returns

`Result`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/queries/useRecords.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/queries/useRecords.ts#L18)

___

### useRegistry

▸ **useRegistry**(): `RegistryClient`

Requires `RegistryProvider` component wrapper.

#### Returns

`RegistryClient`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/registry/useRegistry.ts#L21)

___

### useResources

▸ **useResources**(`filter?`): `Result`

Returns matching resources.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | `Filter` |

#### Returns

`Result`

#### Defined in

[packages/sdk/react-registry-client/src/hooks/queries/useResources.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-registry-client/src/hooks/queries/useResources.ts#L18)
