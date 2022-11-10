---
title: Functions
---
# Functions
### [`ClientProvider`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L29)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: `Element`

Arguments: 

`__namedParameters`: [`ClientProviderProps`](/api/@dxos/react-client/interfaces/ClientProviderProps)
### [`useClient`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L35)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: `Client`

Arguments: none
### [`useClientServices`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useClientServices.ts#L12)


Returns: `undefined | ClientServices`

Arguments: none
### [`useConfig`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: `Config`

Arguments: none
### [`useContacts`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useContacts.ts#L16)


Returns all known Contacts across all Spaces.
Contacts are known members of a common Space.
Requires ClientContext to be set via ClientProvider.

Returns: `Contact[]`

Arguments: none
### [`useDevices`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useDevices.ts#L12)


Returns: `DeviceInfo[]`

Arguments: none
### [`useDevtools`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useDevtools.ts#L12)


Returns: `undefined | DevtoolsHost`

Arguments: none
### [`useHaloInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L26)


Returns: `object`

Arguments: 

`invitationId`: `string`
### [`useHaloInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L13)


Returns: `InvitationObservable[]`

Arguments: none
### [`useIdentity`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useIdentity.ts#L13)


Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.

Returns: `undefined | Profile`

Arguments: none
### [`useInvitationStatus`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L62)


Returns: `object`

Arguments: 

`initialObservable`: `InvitationObservable`
### [`useMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useMembers.ts#L11)


Returns: `PartyMember[]`

Arguments: 

`spaceKey`: `undefined | PublicKey`
### [`useReducer`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L54)


Hook to process selection reducer.

Returns: `undefined | R`

Arguments: 

`selection`: `Falsy | Selection<T, void> | SelectionResult<T, any>`

`value`: `R`

`deps`: `readonly any[]`
### [`useResultSet`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/util/useResultSet.ts#L17)


A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

Returns: `T[]`

Arguments: 

`resultSet`: `ResultSet<T>`
### [`useSelection`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L21)


Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result,
apart from changes in ECHO database itself, must be passed to deps array
for updates to work correctly.

Returns: `undefined | T[]`

Arguments: 

`selection`: `Selection<T, void> | SelectionResult<T, any> | Falsy`

`deps`: `readonly any[]`
### [`useSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L16)


Get a specific Space.
Requires ClientContext to be set via ClientProvider.

Returns: `undefined | Party`

Arguments: 

`spaceKey`: `PublicKeyLike`
### [`useSpaceInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L30)


Returns: `object`

Arguments: 

`spaceKey`: `PublicKey`

`invitationId`: `string`
### [`useSpaceInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L13)


Returns: `InvitationObservable[]`

Arguments: 

`spaceKey`: `PublicKey`
### [`useSpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L25)


Get all Spaces available to current user.
Requires ClientContext to be set via ClientProvider.

Returns: `Party[]`

Arguments: none
### [`useStream`](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/util/useStream.ts#L12)


Subscribe to service API streams.

Returns: `T`

Arguments: 

`streamFactory`: `function`

`defaultValue`: `T`

`deps`: `DependencyList`