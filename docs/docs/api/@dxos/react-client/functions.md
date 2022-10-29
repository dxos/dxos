---
title: Functions
---
# Functions
### [`BotFactoryClientProvider`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/BotFactoryClientProvider.tsx#L21)


BotFactoryClientProvider

Returns: `"null" | Element`

Arguments: 

`__namedParameters`: [`BotFactoryClientProviderProps`](/api/@dxos/react-client/interfaces/BotFactoryClientProviderProps)
### [`ClientProvider`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/containers/ClientProvider.tsx#L18)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: `Element`

Arguments: 

`__namedParameters`: [`ClientProviderProps`](/api/@dxos/react-client/interfaces/ClientProviderProps)
### [`createBotFactoryClient`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts#L26)


Returns: `Promise<BotFactoryClient>`

Arguments: 

`config`: `Config`
### [`useBotFactoryClient`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/bot-factory/useBotFactoryClient.ts#L15)


Returns: `undefined | BotFactoryClient`

Arguments: 

`required`: `boolean`
### [`useClient`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/client/useClient.ts#L15)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: `Client`

Arguments: none
### [`useConfig`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: `Config`

Arguments: none
### [`useContacts`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-queries/useContacts.ts#L16)


Returns all known Contacts across all Parties.
Contacts are known members of a common Party.
Requires ClientContext to be set via ClientProvider.

Returns: `any[]`

Arguments: none
### [`useDevtools`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/client/useDevtools.ts#L9)


Returns: `DevtoolsHost`

Arguments: none
### [`useHaloInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/invitations/useHaloInvitations.ts#L9)


Returns: `InvitationRequest[]`

Arguments: 

`client`: `Client`
### [`useMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-queries/useMembers.tsx#L9)


Returns: `any[]`

Arguments: 

`party`: `undefined | Party`
### [`useParties`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-queries/useParties.ts#L25)


Get all Parties available to current user.
Requires ClientContext to be set via ClientProvider.

Returns: `Party[]`

Arguments: none
### [`useParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-queries/useParties.ts#L16)


Get a specific Party.
Requires ClientContext to be set via ClientProvider.

Returns: `undefined | Party`

Arguments: 

`partyKey`: `PublicKeyLike`
### [`usePartyInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/invitations/usePartyInvitations.ts#L11)


Returns: `InvitationRequest[]`

Arguments: 

`partyKey`: `PublicKey`
### [`useProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/client/useProfile.ts#L13)


Hook returning DXOS user profile object, renders HALO auth screen if no profile exists yet.
Requires ClientContext to be set via ClientProvider.

Returns: `undefined | Profile`

Arguments: none
### [`useReducer`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L54)


Hook to process selection reducer.

Returns: `undefined | R`

Arguments: 

`selection`: `Falsy | Selection<T, void> | SelectionResult<T, any>`

`value`: `R`

`deps`: `readonly any[]`
### [`useRegistryBotFactories`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/wns/registryBotFactories.ts#L24)


Returns: `RegistryBotFactoryRecord[]`

Arguments: none
### [`useRegistryBots`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/wns/registryBots.ts#L31)


A hook returning all bots registered on the DXNS registry.
Bots can be spawned into Parties through bot factories.
See also:  `useRegistryBotFactories`  hook.

Returns: `RegistryBotRecord[]`

Arguments: 

`props`: [`UseRegistryBotsProps`](/api/@dxos/react-client/interfaces/UseRegistryBotsProps)
### [`useResultSet`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/util/useResultSet.ts#L17)


A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

Returns: `T[]`

Arguments: 

`resultSet`: `ResultSet<T>`
### [`useSearchSelection`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-selections/search.ts#L16)


A Selector used for finding items based on a search pattern.

Returns: `undefined | Item<any>[]`

Arguments: 

`party`: `Party`

`search`: `any`
### [`useSecretProvider`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/invitations/useSecretProvider.ts#L13)


Returns: `[Provider<T>, Resolver<T>, Reset]`

Arguments: none
### [`useSelection`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/echo-selections/useSelection.ts#L21)


Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result,
apart from changes in ECHO database itself, must be passed to deps array
for updates to work correctly.

Returns: `undefined | T[]`

Arguments: 

`selection`: `Selection<T, void> | SelectionResult<T, any> | Falsy`

`deps`: `readonly any[]`
### [`useStream`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/util/useStream.ts#L12)


Subscribe to service API streams.

Returns: `T`

Arguments: 

`streamFactory`: `function`

`defaultValue`: `T`

`deps`: `DependencyList`
### [`useWNSRegistry`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/hooks/wns/registry.ts#L10)


Low-level hook returning WNS registry object.
See  `useRegistryBots`  and  `useBotFactories`  for higher-level hooks.

Returns: `any`

Arguments: none