---
title: Functions
---
# Functions
### [mountDevtoolsHooks(options)]()




Returns: <code>void</code>

Arguments: 

`options`: <code>[MountOptions](/api/@dxos/react-client/types/MountOptions)</code>


### [unmountDevtoolsHooks()]()




Returns: <code>void</code>

Arguments: none




### [useDevtools()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/devtools/useDevtools.ts#L13)




Returns: <code>[DevtoolsHost](/api/@dxos/react-client/interfaces/DevtoolsHost)</code>

Arguments: none




### [useStream(streamFactory, defaultValue, deps)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/devtools/useStream.ts#L13)


Subscribe to service API streams.

Returns: <code>T</code>

Arguments: 

`streamFactory`: <code>function</code>

`defaultValue`: <code>T</code>

`deps`: <code>DependencyList</code>


### [createDefaultModelFactory()]()




Returns: <code>ModelFactory</code>

Arguments: none




### [createDocAccessor(text)]()




Returns: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;T&gt;</code>

Arguments: 

`text`: <code>[TextObject](/api/@dxos/react-client/classes/TextObject) | EchoReactiveObject&lt;object&gt;</code>


### [createSubscription(onUpdate)]()


Subscribe to database updates.
Calls the callback when any object from the selection changes.
Calls the callback when the selection changes.
Always calls the callback on the first  `selection.update`  call.

Returns: <code>[SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`onUpdate`: <code>function</code>


### [fromCursor(object, cursor)]()




Returns: <code>number</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

`cursor`: <code>string</code>


### [getRawDoc(obj, \[path\])]()




Returns: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

Arguments: 

`obj`: <code>OpaqueEchoObject</code>

`path`: <code>KeyPath</code>


### [getSpaceForObject(object)]()




Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`object`: <code>OpaqueEchoObject</code>


### [getTextContent(object, defaultValue)]()




Returns: <code>string</code>

Arguments: 

`object`: <code>undefined | [TextObject](/api/@dxos/react-client/classes/TextObject) | EchoReactiveObject&lt;object&gt;</code>

`defaultValue`: <code>string</code>


### [getTextInRange(object, begin, end)]()


TODO(dima?): This API will change.

Returns: <code>string</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

`begin`: <code>string</code>

`end`: <code>string</code>


### [hasType(schema)]()




Returns: <code>function</code>

Arguments: 

`schema`: <code>[Schema](/api/@dxos/react-client/classes/Schema)</code>


### [isAutomergeObject(object)]()




Returns: <code>object is AutomergeObject</code>

Arguments: 

`object`: <code>unknown</code>


### [isTypedObject(object)]()




Returns: <code>object is [TypedObject](/api/@dxos/react-client/types/TypedObject)&lt;Record&lt;string, any&gt;&gt;</code>

Arguments: 

`object`: <code>unknown</code>


### [setTextContent(object, text)]()




Returns: <code>void</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

`text`: <code>string</code>


### [toCursor(object, pos)]()




Returns: <code>string</code>

Arguments: 

`object`: <code>[TextObject](/api/@dxos/react-client/classes/TextObject)</code>

`pos`: <code>number</code>


### [useMembers(spaceKey)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useMembers.ts#L12)




Returns: <code>[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]</code>

Arguments: 

`spaceKey`: <code>undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [useQuery(\[space\], \[filter\], \[options\], \[deps\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useQuery.ts#L17)


Create subscription.

Returns: <code>T[]</code>

Arguments: 

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[FilterSource](/api/@dxos/react-client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/interfaces/QueryOptions)</code>

`deps`: <code>any[]</code>


### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useSpaces.ts#L21)


Get a specific Space using its key.
The space is not guaranteed to be in the ready state.
Returns the default space if no key is provided.
Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKeyLike](/api/@dxos/react-client/types/PublicKeyLike)</code>


### [useSpaceInvitation(\[spaceKey\], \[invitationId\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L31)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`invitationId`: <code>string</code>


### [useSpaceInvitations(\[spaceKey\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L13)




Returns: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [useSpaces(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useSpaces.ts#L62)


Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.
By default, only ready spaces are returned.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>

Arguments: 

`options`: <code>[UseSpacesParams](/api/@dxos/react-client/types/UseSpacesParams)</code>


### [useSubscription(cb, selection)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/echo/useSubscription.ts#L14)


Create reactive selection.
Calls the callback when the selection changes and during the first render.

Returns: <code>undefined | [SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`cb`: <code>function</code>

`selection`: <code>[Selection](/api/@dxos/react-client/types/Selection)</code>


### [useContacts()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useContacts.ts#L16)


Returns all known Contacts across all Spaces.
Contacts are known members of a common Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Contact](/api/@dxos/react-client/interfaces/Contact)[]</code>

Arguments: none




### [useDevices()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useDevices.ts#L11)




Returns: <code>[Device](/api/@dxos/react-client/interfaces/Device)[]</code>

Arguments: none




### [useHaloInvitation(\[invitationId\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L24)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`invitationId`: <code>string</code>


### [useHaloInvitations()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L10)




Returns: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]</code>

Arguments: none




### [useIdentity()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useIdentity.ts#L14)


Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.

Returns: <code>"null" | [Identity](/api/@dxos/react-client/interfaces/Identity)</code>

Arguments: none




### [useKeyStore(defaultKeys)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/halo/useKeyStore.ts#L41)


Settings store.

Returns: <code>[Map&lt;string, string&gt;, function]</code>

Arguments: 

`defaultKeys`: <code>string[]</code>


### [ClientProvider(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/ClientContext.tsx#L97)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: <code>Element</code>

Arguments: 

`options`: <code>[ClientProviderProps](/api/@dxos/react-client/types/ClientProviderProps)</code>


### [Defaults(\[basePath\])]()


JSON config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Dynamics()]()


Provided dynamically by server.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Envs(\[basePath\])]()


ENV variable (key/value) map.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Local()]()


Development config.

Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: none




### [Remote(target)]()




Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>


### [Storage()]()


Load config from storage.

Returns: <code>Promise&lt;Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;&gt;</code>

Arguments: none




### [createClientServices(config, \[createWorker\])]()


Create services from config.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`createWorker`: <code>function</code>


### [fromAgent(\[options\])]()


Connects to locally running CLI daemon.

Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[FromAgentOptions](/api/@dxos/react-client/types/FromAgentOptions)</code>


### [fromHost(\[config\], \[params\])]()


Creates stand-alone services without rpc.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`params`: <code>ClientServicesHostParams</code>


### [fromIFrame(\[config\], \[options\])]()


Create services provider proxy connected via iFrame to host.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>


### [fromSocket(url)]()


Access to remote client via a socket.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`url`: <code>string</code>


### [fromWorker(config, options)]()


Creates services provider connected via worker.

Returns: <code>Promise&lt;[WorkerClientServices](/api/@dxos/react-client/classes/WorkerClientServices)&gt;</code>

Arguments: 

`config`: <code>undefined | [Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;WorkerClientServicesParams, "config"&gt;</code>


### [getUnixSocket(profile, \[protocol\])]()




Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>


### [useAgentHostingProviderClient(config)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/useAgentHostingProvider.ts#L17)




Returns: <code>"null" | [AgentHostingProviderClient](/api/@dxos/react-client/interfaces/AgentHostingProviderClient)</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>


### [useClient()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/ClientContext.tsx#L45)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: none




### [useClientServices()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/useClientServices.ts#L12)




Returns: <code>undefined | [ClientServices](/api/@dxos/react-client/types/ClientServices)</code>

Arguments: none




### [useConfig()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Arguments: none




### [useMulticastObservable(observable)]()


Subscribe to a MulticastObservable and return the latest value.

Returns: <code>T</code>

Arguments: 

`observable`: <code>MulticastObservable&lt;T&gt;</code>


### [useShell()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/useShell.ts#L12)


Helper hook to access the shell.

Returns: <code>[Shell](/api/@dxos/react-client/classes/Shell)</code>

Arguments: none




### [useStatus()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/client/useStatus.ts#L12)




Returns: <code>undefined | "null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)</code>

Arguments: none




### [useInvitationStatus(\[initialObservable\])](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L76)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`initialObservable`: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>


### [useNetworkStatus()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/react-client/src/mesh/useNetworkStatus.ts#L14)


Creates a network status subscription.

Returns: <code>[NetworkStatus](/api/@dxos/react-client/interfaces/NetworkStatus)</code>

Arguments: none




### [onconnect(event)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`event`: <code>MessageEvent&lt;any&gt;</code>


