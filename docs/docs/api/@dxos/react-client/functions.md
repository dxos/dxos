---
title: Functions
---
# Functions
### [ClientProvider(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L78)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: <code>Element</code>

Arguments: 

`options`: <code>[ClientProviderProps](/api/@dxos/react-client/interfaces/ClientProviderProps)</code>
### [createDevtoolsRpcServer(client, clientServices)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>
### [fromHost(\[config\])]()


Creates stand-alone services without rpc.

Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>
### [fromIFrame(\[config\], \[channel\])]()


Create services provider proxy connected via iFrame to host.

Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`channel`: <code>string</code>
### [generateSeedPhrase()]()


Generate bip39 seed phrase (aka mnemonic).

Returns: <code>string</code>

Arguments: none
### [strip(obj)]()


Remove keys with undefined values.

Returns: <code>any</code>

Arguments: 

`obj`: <code>any</code>
### [useClient()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L34)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: none
### [useClientServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useClientServices.ts#L12)


Returns: <code>undefined | ClientServices</code>

Arguments: none
### [useConfig()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Arguments: none
### [useContacts()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useContacts.ts#L16)


Returns all known Contacts across all Spaces.
Contacts are known members of a common Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Contact](/api/@dxos/react-client/interfaces/Contact)[]</code>

Arguments: none
### [useDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useDevices.ts#L12)


Returns: <code>DeviceInfo[]</code>

Arguments: none
### [useDevtools()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useDevtools.ts#L13)


Returns: <code>DevtoolsHost</code>

Arguments: none
### [useHaloInvitation(\[invitationId\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L25)


Returns: <code>object</code>

Arguments: 

`invitationId`: <code>string</code>
### [useHaloInvitations()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L12)


Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>

Arguments: none
### [useIdentity()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useIdentity.ts#L13)


Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | [Profile](/api/@dxos/react-client/interfaces/Profile)</code>

Arguments: none
### [useInvitationStatus(\[initialObservable\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L62)


Returns: <code>object</code>

Arguments: 

`initialObservable`: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>
### [useMembers(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useMembers.ts#L11)


Returns: <code>[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]</code>

Arguments: 

`spaceKey`: <code>undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [useNetworkStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/network/useNetworkStatus.ts#L14)


Creates a network status subscription.

Returns: <code>NetworkStatus</code>

Arguments: none
### [useQuery(space, \[filter\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useQuery.ts#L18)


Create subscription.

Returns: <code>T[]</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[TypeFilter](/api/@dxos/react-client/types/TypeFilter)&lt;T&gt;</code>
Create subscription.

Returns: <code>[Document](/api/@dxos/react-client/classes/Document)[]</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;T&gt;</code>
### [useReactor(\[opts\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useRector.tsx#L20)


Hook to update components that access the database when modified.

Returns: <code>[UseRector](/api/@dxos/react-client/types/UseRector)</code>

Arguments: 

`opts`: <code>[ReactorProps](/api/@dxos/react-client/types/ReactorProps)</code>
### [useReactorContext(\[opts\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useRector.tsx#L73)


Returns: <code>void</code>

Arguments: 

`opts`: <code>[ReactorProps](/api/@dxos/react-client/types/ReactorProps)</code>
### [useReducer(selection, value, deps)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L53)


Hook to process selection reducer.

Returns: <code>undefined | R</code>

Arguments: 

`selection`: <code>Falsy | [Selection](/api/@dxos/react-client/classes/Selection)&lt;T, void&gt; | [SelectionResult](/api/@dxos/react-client/classes/SelectionResult)&lt;T, any&gt;</code>

`value`: <code>R</code>

`deps`: <code>readonly any[]</code>
### [useResultSet(resultSet)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/util/useResultSet.ts#L17)


A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.

Returns: <code>T[]</code>

Arguments: 

`resultSet`: <code>[ResultSet](/api/@dxos/react-client/classes/ResultSet)&lt;T&gt;</code>
### [useSelection(selection, deps)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L20)


Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result  must be passed to deps array
for updates to work correctly.

Returns: <code>undefined | T[]</code>

Arguments: 

`selection`: <code>[Selection](/api/@dxos/react-client/classes/Selection)&lt;T, void&gt; | [SelectionResult](/api/@dxos/react-client/classes/SelectionResult)&lt;T, any&gt; | Falsy</code>

`deps`: <code>readonly any[]</code>
### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L16)


Get a specific Space via its key.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>PublicKeyLike</code>
### [useSpaceInvitation(\[spaceKey\], \[invitationId\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L30)


Returns: <code>object</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`invitationId`: <code>string</code>
### [useSpaceInvitations(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L13)


Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [useSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L25)


Get all Spaces available to current user.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>

Arguments: none
### [useStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useStatus.ts#L12)


Returns: <code>undefined | [Status](/api/@dxos/react-client/enums#Status)</code>

Arguments: none
### [useStream(streamFactory, defaultValue, deps)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/util/useStream.ts#L13)


Subscribe to service API streams.

Returns: <code>T</code>

Arguments: 

`streamFactory`: <code>function</code>

`defaultValue`: <code>T</code>

`deps`: <code>DependencyList</code>
### [useSubscription(selection)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSubscription.ts#L14)


Create reactive selection.

Returns: <code>[SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`selection`: <code>Selection</code>
### [withReactor(component)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useRector.tsx#L60)


Reactive HOC.

Returns: <code>FC&lt;P&gt;</code>

Arguments: 

`component`: <code>FC&lt;P&gt;</code>