# Module: @dxos/react-client

## Table of contents

### Interfaces

- [BotFactoryClientProviderProps](../interfaces/dxos_react_client.BotFactoryClientProviderProps.md)
- [ClientProviderProps](../interfaces/dxos_react_client.ClientProviderProps.md)
- [UseRegistryBotsProps](../interfaces/dxos_react_client.UseRegistryBotsProps.md)

### Type Aliases

- [ClientProvider](dxos_react_client.md#clientprovider)

### Variables

- [BotFactoryClientContext](dxos_react_client.md#botfactoryclientcontext)
- [ClientContext](dxos_react_client.md#clientcontext)

### Functions

- [BotFactoryClientProvider](dxos_react_client.md#botfactoryclientprovider)
- [ClientProvider](dxos_react_client.md#clientprovider-1)
- [createBotFactoryClient](dxos_react_client.md#createbotfactoryclient)
- [useBotFactoryClient](dxos_react_client.md#usebotfactoryclient)
- [useClient](dxos_react_client.md#useclient)
- [useConfig](dxos_react_client.md#useconfig)
- [useContacts](dxos_react_client.md#usecontacts)
- [useDevtools](dxos_react_client.md#usedevtools)
- [useHaloInvitations](dxos_react_client.md#usehaloinvitations)
- [useMembers](dxos_react_client.md#usemembers)
- [useParties](dxos_react_client.md#useparties)
- [useParty](dxos_react_client.md#useparty)
- [usePartyInvitations](dxos_react_client.md#usepartyinvitations)
- [useProfile](dxos_react_client.md#useprofile)
- [useReducer](dxos_react_client.md#usereducer)
- [useRegistryBotFactories](dxos_react_client.md#useregistrybotfactories)
- [useRegistryBots](dxos_react_client.md#useregistrybots)
- [useResultSet](dxos_react_client.md#useresultset)
- [useSearchSelection](dxos_react_client.md#usesearchselection)
- [useSecretProvider](dxos_react_client.md#usesecretprovider)
- [useSelection](dxos_react_client.md#useselection)
- [useStream](dxos_react_client.md#usestream)
- [useWNSRegistry](dxos_react_client.md#usewnsregistry)

## Type Aliases

### ClientProvider

Ƭ **ClientProvider**: `MaybeFunction`<`MaybePromise`<`Client`\>\>

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L18)

[packages/sdk/react-client/src/containers/ClientProvider.tsx:57](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L57)

## Variables

### BotFactoryClientContext

• `Const` **BotFactoryClientContext**: `Context`<`BotFactoryClient` \| `undefined`\>

#### Defined in

[packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts:12](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts#L12)

___

### ClientContext

• `Const` **ClientContext**: `Context`<`ClientContextProps` \| `undefined`\>

#### Defined in

[packages/sdk/react-client/src/hooks/client/context.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/client/context.ts#L13)

## Functions

### BotFactoryClientProvider

▸ **BotFactoryClientProvider**(`__namedParameters`): ``null`` \| `Element`

BotFactoryClientProvider

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`BotFactoryClientProviderProps`](../interfaces/dxos_react_client.BotFactoryClientProviderProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-client/src/containers/BotFactoryClientProvider.tsx:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/BotFactoryClientProvider.tsx#L21)

___

### ClientProvider

▸ **ClientProvider**(`__namedParameters`): ``null`` \| `Element`

Root component that provides the DXOS client instance to child components.
To be used with the `useClient` hook.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`ClientProviderProps`](../interfaces/dxos_react_client.ClientProviderProps.md) |

#### Returns

``null`` \| `Element`

#### Defined in

[packages/sdk/react-client/src/containers/ClientProvider.tsx:57](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/containers/ClientProvider.tsx#L57)

___

### createBotFactoryClient

▸ **createBotFactoryClient**(`config`): `Promise`<`BotFactoryClient`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `config` | `Config` |

#### Returns

`Promise`<`BotFactoryClient`\>

#### Defined in

[packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts:26](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts#L26)

___

### useBotFactoryClient

▸ **useBotFactoryClient**(`required?`): `undefined` \| `BotFactoryClient`

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `required` | `boolean` | `true` |

#### Returns

`undefined` \| `BotFactoryClient`

#### Defined in

[packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts#L15)

___

### useClient

▸ **useClient**(): `Client`

Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

#### Returns

`Client`

#### Defined in

[packages/sdk/react-client/src/hooks/client/useClient.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/client/useClient.ts#L15)

___

### useConfig

▸ **useConfig**(): `Config`

Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

#### Returns

`Config`

#### Defined in

[packages/sdk/react-client/src/hooks/client/useConfig.ts:15](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/client/useConfig.ts#L15)

___

### useContacts

▸ **useContacts**(): `PartyMember`[]

Returns all known Contacts across all Parties.
Contacts are known members of a common Party.
Requires ClientContext to be set via ClientProvider.

#### Returns

`PartyMember`[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-queries/useContacts.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-queries/useContacts.ts#L16)

___

### useDevtools

▸ **useDevtools**(): `DevtoolsHost`

#### Returns

`DevtoolsHost`

#### Defined in

[packages/sdk/react-client/src/hooks/client/useDevtools.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/client/useDevtools.ts#L9)

___

### useHaloInvitations

▸ **useHaloInvitations**(`client`): `InvitationRequest`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `Client` |

#### Returns

`InvitationRequest`[]

#### Defined in

[packages/sdk/react-client/src/hooks/invitations/useHaloInvitations.ts:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/invitations/useHaloInvitations.ts#L9)

___

### useMembers

▸ **useMembers**(`party`): `PartyMember`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | `undefined` \| `Party` |

#### Returns

`PartyMember`[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-queries/useMembers.tsx:9](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-queries/useMembers.tsx#L9)

___

### useParties

▸ **useParties**(): `Party`[]

Get all Parties available to current user.
Requires ClientContext to be set via ClientProvider.

#### Returns

`Party`[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-queries/useParties.ts:25](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-queries/useParties.ts#L25)

___

### useParty

▸ **useParty**(`partyKey?`): `undefined` \| `Party`

Get a specific Party.
Requires ClientContext to be set via ClientProvider.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey?` | `PublicKeyLike` |

#### Returns

`undefined` \| `Party`

#### Defined in

[packages/sdk/react-client/src/hooks/echo-queries/useParties.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-queries/useParties.ts#L16)

___

### usePartyInvitations

▸ **usePartyInvitations**(`partyKey?`): `InvitationRequest`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey?` | `PublicKey` |

#### Returns

`InvitationRequest`[]

#### Defined in

[packages/sdk/react-client/src/hooks/invitations/usePartyInvitations.ts:11](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/invitations/usePartyInvitations.ts#L11)

___

### useProfile

▸ **useProfile**(`disableHaloLogin?`): `undefined` \| `Profile`

Hook returning DXOS user profile object, renders HALO auth screen if no profile exists yet.
Requires ClientContext to be set via ClientProvider.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `disableHaloLogin` | `boolean` | `false` |

#### Returns

`undefined` \| `Profile`

#### Defined in

[packages/sdk/react-client/src/hooks/client/useProfile.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/client/useProfile.ts#L21)

___

### useReducer

▸ **useReducer**<`T`, `R`\>(`selection`, `value`, `deps?`): `undefined` \| `R`

Hook to process selection reducer.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Entity`<`any`, `T`\> |
| `R` | `R` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `selection` | `Falsy` \| `Selection`<`T`, `void`\> \| `SelectionResult`<`T`, `any`\> | `undefined` |
| `value` | `R` | `undefined` |
| `deps` | readonly `any`[] | `[]` |

#### Returns

`undefined` \| `R`

#### Defined in

[packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L54)

___

### useRegistryBotFactories

▸ **useRegistryBotFactories**(): `RegistryBotFactoryRecord`[]

#### Returns

`RegistryBotFactoryRecord`[]

#### Defined in

[packages/sdk/react-client/src/hooks/wns/registryBotFactories.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/wns/registryBotFactories.ts#L24)

___

### useRegistryBots

▸ **useRegistryBots**(`props?`): `RegistryBotRecord`[]

A hook returning all bots registered on the DXNS registry.
Bots can be spawned into Parties through bot factories.
See also: `useRegistryBotFactories` hook.

#### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`UseRegistryBotsProps`](../interfaces/dxos_react_client.UseRegistryBotsProps.md) |

#### Returns

`RegistryBotRecord`[]

an array of registered bots

#### Defined in

[packages/sdk/react-client/src/hooks/wns/registryBots.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/wns/registryBots.ts#L31)

___

### useResultSet

▸ **useResultSet**<`T`\>(`resultSet`): `T`[]

A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

**`Deprecated`**

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `resultSet` | `ResultSet`<`T`\> | The result set to subscribe to |

#### Returns

`T`[]

Always up-to-date value of the result set

#### Defined in

[packages/sdk/react-client/src/hooks/util/useResultSet.ts:17](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/util/useResultSet.ts#L17)

___

### useSearchSelection

▸ **useSearchSelection**(`party`, `search`): `undefined` \| `Item`<`any`\>[]

A Selector used for finding items based on a search pattern.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `party` | `Party` |  |
| `search` | `any` | Searched value. |

#### Returns

`undefined` \| `Item`<`any`\>[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-selections/search.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-selections/search.ts#L16)

___

### useSecretProvider

▸ **useSecretProvider**<`T`\>(): [`Provider`<`T`\>, `Resolver`<`T`\>, `Reset`]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Returns

[`Provider`<`T`\>, `Resolver`<`T`\>, `Reset`]

#### Defined in

[packages/sdk/react-client/src/hooks/invitations/useSecretProvider.ts:13](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/invitations/useSecretProvider.ts#L13)

___

### useSelection

▸ **useSelection**<`T`\>(`selection`, `deps?`): `undefined` \| `T`[]

Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result,
apart from changes in ECHO database itself, must be passed to deps array
for updates to work correctly.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Entity`<`any`, `T`\> |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `selection` | `Selection`<`T`, `void`\> \| `SelectionResult`<`T`, `any`\> \| `Falsy` | `undefined` | Selection from which to query data. Can be falsy - in that case the hook will return undefined. |
| `deps` | readonly `any`[] | `[]` | Array of values that trigger the selector when changed. |

#### Returns

`undefined` \| `T`[]

#### Defined in

[packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L21)

___

### useStream

▸ **useStream**<`T`\>(`streamFactory`, `defaultValue`, `deps?`): `T`

Subscribe to service API streams.

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `streamFactory` | () => `Stream`<`T`\> | `undefined` |
| `defaultValue` | `T` | `undefined` |
| `deps` | `DependencyList` | `[]` |

#### Returns

`T`

#### Defined in

[packages/sdk/react-client/src/hooks/util/useStream.ts:12](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/util/useStream.ts#L12)

___

### useWNSRegistry

▸ **useWNSRegistry**(): `any`

Low-level hook returning WNS registry object.
See `useRegistryBots` and `useBotFactories` for higher-level hooks.

**`Deprecated`**

Use DXNS registry.

#### Returns

`any`

#### Defined in

[packages/sdk/react-client/src/hooks/wns/registry.ts:10](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-client/src/hooks/wns/registry.ts#L10)
