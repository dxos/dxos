---
title: Functions
---
# Functions
### [ClientProvider(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L76)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: <code>Element</code>

Arguments: 

`options`: <code>[ClientProviderProps](/api/@dxos/react-client/interfaces/ClientProviderProps)</code>
### [useClient()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L32)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Client</code>

Arguments: none
### [useClientServices()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useClientServices.ts#L12)


Returns: <code>undefined | ClientServices</code>

Arguments: none
### [useConfig()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Config</code>

Arguments: none
### [useContacts()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useContacts.ts#L16)


Returns all known Contacts across all Spaces.
Contacts are known members of a common Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Contact[]</code>

Arguments: none
### [useDevices()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useDevices.ts#L12)


Returns: <code>DeviceInfo[]</code>

Arguments: none
### [useDevtools()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useDevtools.ts#L12)


Returns: <code>undefined | DevtoolsHost</code>

Arguments: none
### [useHaloInvitation(\[invitationId\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L25)


Returns: <code>object</code>

Arguments: 

`invitationId`: <code>string</code>
### [useHaloInvitations()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L12)


Returns: <code>CancellableInvitationObservable[]</code>

Arguments: none
### [useIdentity()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/halo/useIdentity.ts#L13)


Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | Profile</code>

Arguments: none
### [useInvitationStatus(\[initialObservable\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L62)


Returns: <code>object</code>

Arguments: 

`initialObservable`: <code>CancellableInvitationObservable</code>
### [useMembers(spaceKey)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useMembers.ts#L11)


Returns: <code>SpaceMember[]</code>

Arguments: 

`spaceKey`: <code>undefined | PublicKey</code>
### [useReducer(selection, value, deps)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L53)


Hook to process selection reducer.

Returns: <code>undefined | R</code>

Arguments: 

`selection`: <code>Falsy | Selection&lt;T, void&gt; | SelectionResult&lt;T, any&gt;</code>

`value`: <code>R</code>

`deps`: <code>readonly any[]</code>
### [useResultSet(resultSet)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/util/useResultSet.ts#L17)


A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

Returns: <code>T[]</code>

Arguments: 

`resultSet`: <code>ResultSet&lt;T&gt;</code>
### [useSelection(selection, deps)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L20)


Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result  must be passed to deps array
for updates to work correctly.

Returns: <code>undefined | T[]</code>

Arguments: 

`selection`: <code>Selection&lt;T, void&gt; | SelectionResult&lt;T, any&gt; | Falsy</code>

`deps`: <code>readonly any[]</code>
### [useSpace(\[spaceKey\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L16)


Get a specific Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | Space</code>

Arguments: 

`spaceKey`: <code>PublicKeyLike</code>
### [useSpaceInvitation(\[spaceKey\], \[invitationId\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L30)


Returns: <code>object</code>

Arguments: 

`spaceKey`: <code>PublicKey</code>

`invitationId`: <code>string</code>
### [useSpaceInvitations(\[spaceKey\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L13)


Returns: <code>CancellableInvitationObservable[]</code>

Arguments: 

`spaceKey`: <code>PublicKey</code>
### [useSpaces()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L25)


Get all Spaces available to current user.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Space[]</code>

Arguments: none
### [useStatus(polling)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/useStatus.ts#L12)


Returns: <code>boolean</code>

Arguments: 

`polling`: <code>number</code>
### [useStream(streamFactory, defaultValue, deps)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/util/useStream.ts#L13)


Subscribe to service API streams.

Returns: <code>T</code>

Arguments: 

`streamFactory`: <code>function</code>

`defaultValue`: <code>T</code>

`deps`: <code>DependencyList</code>