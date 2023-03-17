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

### [createDefaultModelFactory()]()



Returns: <code>ModelFactory</code>

Arguments: none

### [createDevtoolsRpcServer(client, clientServices)]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`client`: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

`clientServices`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

### [fromIFrame(\[config\], \[options\])]()



Create services provider proxy connected via iFrame to host.


Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>

### [generateSeedPhrase()]()



Generate bip39 seed phrase (aka mnemonic).


Returns: <code>string</code>

Arguments: none

### [isDocument(object)]()



Returns: <code>object is [Document](/api/@dxos/react-client/values#Document)&lt;object&gt;</code>

Arguments: 

`object`: <code>unknown</code>

### [isReferenceLike(value)]()



Returns: <code>value is object</code>

Arguments: 

`value`: <code>any</code>

### [observer(baseComponent)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/observer.tsx#L33)



HOC to provide reactivity based on changes to ECHO state.


Returns: <code>FunctionComponent&lt;P&gt;</code>

Arguments: 

`baseComponent`: <code>FunctionComponent&lt;P&gt;</code>

### [strip(obj)]()



Remove keys with undefined values.


Returns: <code>any</code>

Arguments: 

`obj`: <code>any</code>

### [useClient()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L32)



Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.


Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: none

### [useClientServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useClientServices.ts#L12)



Returns: <code>undefined | [ClientServices](/api/@dxos/react-client/types/ClientServices)</code>

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

### [useDevices()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useDevices.ts#L11)



Returns: <code>Device[]</code>

Arguments: none

### [useDevtools()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useDevtools.ts#L13)



Returns: <code>DevtoolsHost</code>

Arguments: none

### [useHaloInvitation(\[invitationId\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L21)



Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`invitationId`: <code>string</code>

### [useHaloInvitations()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L10)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>

Arguments: none

### [useIdentity(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/halo/useIdentity.ts#L13)



Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.


Returns: <code>undefined | [Identity](/api/@dxos/react-client/interfaces/Identity)</code>

Arguments: 

`options`: <code>object</code>

### [useInvitationStatus(\[initialObservable\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L76)



Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`initialObservable`: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

### [useKeyStore(defaultKeys)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/util/useKeyStore.ts#L13)



Settings store.


Returns: <code>[Map&lt;string, string&gt;, function]</code>

Arguments: 

`defaultKeys`: <code>string[]</code>

### [useMembers(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useMembers.ts#L11)



Returns: <code>[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]</code>

Arguments: 

`spaceKey`: <code>undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

### [useNetworkStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/network/useNetworkStatus.ts#L14)



Creates a network status subscription.


Returns: <code>NetworkStatus</code>

Arguments: none

### [useOrCreateFirstSpace()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L29)



Returns the first space in the current spaces array. If none exist,  `null` 
will be returned at first, then the hook will re-run and return a space once
it has been created. Requires a ClientProvider somewhere in the parent tree.


Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: none

### [useQuery(\[space\], \[filter\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useQuery.ts#L19)



Create subscription.


Returns: <code>[Document](/api/@dxos/react-client/values#Document)&lt;object&gt;[]</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)&lt;T&gt;</code>

### [useResultSet(resultSet)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/util/useResultSet.ts#L17)



A convenience hook used for subscribing to changing values of a result set.
Result sets are reactive query results from ECHO.


Returns: <code>T[]</code>

Arguments: 

`resultSet`: <code>[ResultSet](/api/@dxos/react-client/classes/ResultSet)&lt;T&gt;</code>

### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L18)



Get a specific Space using its key. Returns undefined when no spaceKey is
available. Requires a ClientProvider somewhere in the parent tree.


Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>PublicKeyLike</code>

### [useSpaceInvitation(\[spaceKey\], \[invitationId\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L24)



Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`invitationId`: <code>string</code>

### [useSpaceInvitations(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L13)



Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

### [useSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L60)



Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.


Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>

Arguments: none

### [useStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useStatus.ts#L12)



Returns: <code>undefined | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)</code>

Arguments: none

### [useStream(streamFactory, defaultValue, deps)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/util/useStream.ts#L13)



Subscribe to service API streams.


Returns: <code>T</code>

Arguments: 

`streamFactory`: <code>function</code>

`defaultValue`: <code>T</code>

`deps`: <code>DependencyList</code>

### [useSubscription(cb, selection)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSubscription.ts#L16)



Create reactive selection.
Calls the callback when any object from the selection changes.
Also calls the callback when the selection changes and during the first render.


Returns: <code>undefined | [SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`cb`: <code>function</code>

`selection`: <code>[Selection](/api/@dxos/react-client/types/Selection)</code>

### [wrapObservable(observable)]()



Testing util to wrap non-authenticating observable with promise.
Don't use this in production code.


Returns: <code>Promise&lt;[Invitation](/api/@dxos/react-client/interfaces/Invitation)&gt;</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>
