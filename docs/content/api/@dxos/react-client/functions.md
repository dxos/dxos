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




### [useDevtools()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/devtools/useDevtools.ts#L13)




Returns: <code>[DevtoolsHost](/api/@dxos/react-client/interfaces/DevtoolsHost)</code>

Arguments: none




### [useStream(streamFactory, defaultValue, deps)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/devtools/useStream.ts#L13)


Subscribe to service API streams.

Returns: <code>T</code>

Arguments: 

`streamFactory`: <code>function</code>

`defaultValue`: <code>T</code>

`deps`: <code>DependencyList</code>


### [create(schema, obj)]()




Returns: <code>[ReactiveObject](/api/@dxos/react-client/types/ReactiveObject)&lt;T&gt;</code>

Arguments: 

`schema`: <code>Schema&lt;T, T, never&gt;</code>

`obj`: <code>Simplify&lt;Omit&lt;T, "id"&gt;&gt;</code>


### [createDocAccessor(obj, path)]()




Returns: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

Arguments: 

`obj`: <code>[EchoReactiveObject](/api/@dxos/react-client/types/EchoReactiveObject)&lt;T&gt;</code>

`path`: <code>KeyPath</code>


### [createEchoObject(init)]()




Returns: <code>[EchoReactiveObject](/api/@dxos/react-client/types/EchoReactiveObject)&lt;T&gt;</code>

Arguments: 

`init`: <code>T</code>


### [createSubscription(onUpdate)]()


Subscribe to database updates.
Calls the callback when any object from the selection changes.
Calls the callback when the selection changes.
Always calls the callback on the first  `selection.update`  call.

Returns: <code>[SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`onUpdate`: <code>function</code>


### [fromCursor(accessor, cursor)]()




Returns: <code>number</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

`cursor`: <code>string</code>


### [getAutomergeObjectCore(obj)]()




Returns: <code>AutomergeObjectCore</code>

Arguments: 

`obj`: <code>[EchoReactiveObject](/api/@dxos/react-client/types/EchoReactiveObject)&lt;T&gt;</code>


### [getMeta(obj)]()




Returns: <code>[ObjectMeta](/api/@dxos/react-client/types/ObjectMeta)</code>

Arguments: 

`obj`: <code>T</code>


### [getRangeFromCursor(accessor, cursor)]()




Returns: <code>undefined | object</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

`cursor`: <code>string</code>


### [getSchema(obj)]()


Returns the schema for the given object if one is defined.

Returns: <code>undefined | Schema&lt;any, any, never&gt;</code>

Arguments: 

`obj`: <code>undefined | T</code>


### [getSpace(object)]()




Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`object`: <code>[ReactiveObject](/api/@dxos/react-client/types/ReactiveObject)&lt;any&gt;</code>


### [getTextInRange(accessor, start, end)]()




Returns: <code>string</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

`start`: <code>string</code>

`end`: <code>string</code>


### [getType(obj)]()




Returns: <code>undefined | Reference</code>

Arguments: 

`obj`: <code>undefined | T</code>


### [getTypeRef(\[type\])]()




Returns: <code>undefined | Reference</code>

Arguments: 

`type`: <code>string | EncodedReferenceObject</code>


### [hasType(type)]()




Returns: <code>function</code>

Arguments: 

`type`: <code>function</code>


### [isEchoObject(value)]()




Returns: <code>value is [EchoReactiveObject](/api/@dxos/react-client/types/EchoReactiveObject)&lt;any&gt;</code>

Arguments: 

`value`: <code>unknown</code>


### [isSpace(object)]()




Returns: <code>object is [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`object`: <code>unknown</code>


### [toCursor(accessor, pos)]()




Returns: <code>string</code>

Arguments: 

`accessor`: <code>[DocAccessor](/api/@dxos/react-client/interfaces/DocAccessor)&lt;any&gt;</code>

`pos`: <code>number</code>


### [useMembers(spaceKey)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useMembers.ts#L12)




Returns: <code>[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]</code>

Arguments: 

`spaceKey`: <code>undefined | [PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [useQuery(\[spaceOrEcho\], \[filter\], \[options\], \[deps\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useQuery.ts#L30)


Create subscription.

Returns: <code>T[]</code>

Arguments: 

`spaceOrEcho`: <code>[Space](/api/@dxos/react-client/interfaces/Space) | [Echo](/api/@dxos/react-client/interfaces/Echo)</code>

`filter`: <code>[FilterSource](/api/@dxos/react-client/types/FilterSource)&lt;T&gt;</code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/interfaces/QueryOptions)</code>

`deps`: <code>any[]</code>


### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useSpaces.ts#L21)


Get a specific Space using its key.
The space is not guaranteed to be in the ready state.
Returns the default space if no key is provided.
Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKeyLike](/api/@dxos/react-client/types/PublicKeyLike)</code>


### [useSpaceInvitation(\[spaceKey\], \[invitationId\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L19)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

`invitationId`: <code>string</code>


### [useSpaceInvitations(\[spaceKey\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useSpaceInvitations.ts#L14)




Returns: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


### [useSpaces(options)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useSpaces.ts#L62)


Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.
By default, only ready spaces are returned.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>

Arguments: 

`options`: <code>[UseSpacesParams](/api/@dxos/react-client/types/UseSpacesParams)</code>


### [useSubscription(cb, selection)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/echo/useSubscription.ts#L14)


Create reactive selection.
Calls the callback when the selection changes and during the first render.

Returns: <code>undefined | [SubscriptionHandle](/api/@dxos/react-client/interfaces/SubscriptionHandle)</code>

Arguments: 

`cb`: <code>function</code>

`selection`: <code>[Selection](/api/@dxos/react-client/types/Selection)</code>


### [useContacts()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useContacts.ts#L15)


Returns all known Contacts across all Spaces.
Contacts are known members of a common Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Contact](/api/@dxos/react-client/interfaces/Contact)[]</code>

Arguments: none




### [useDevices()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useDevices.ts#L10)




Returns: <code>[Device](/api/@dxos/react-client/interfaces/Device)[]</code>

Arguments: none




### [useHaloInvitation(\[invitationId\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L17)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`invitationId`: <code>string</code>


### [useHaloInvitations()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useHaloInvitations.ts#L12)




Returns: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)[]</code>

Arguments: none




### [useIdentity()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useIdentity.ts#L14)


Hook returning DXOS identity object.
Requires ClientContext to be set via ClientProvider.

Returns: <code>"null" | [Identity](/api/@dxos/react-client/interfaces/Identity)</code>

Arguments: none




### [useKeyStore(defaultKeys)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/halo/useKeyStore.ts#L41)


Settings store.

Returns: <code>[Map&lt;string, string&gt;, function]</code>

Arguments: 

`defaultKeys`: <code>string[]</code>


### [AgentHostingProvider(props)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/AgentHostingProvider.tsx#L23)




Returns: <code>Element</code>

Arguments: 

`props`: <code>object</code>


### [ClientProvider(options)](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/ClientContext.tsx#L97)


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




### [Remote(target, \[authenticationToken\])]()




Returns: <code>Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>

`authenticationToken`: <code>string</code>


### [Storage()]()


Load config from storage.

Returns: <code>Promise&lt;Partial&lt;[Config](/api/@dxos/config/interfaces/Config)&gt;&gt;</code>

Arguments: none




### [createClientServices(config, \[createWorker\], \[observabilityGroup\], \[signalTelemetryEnabled\])]()


Create services from config.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`createWorker`: <code>function</code>

`observabilityGroup`: <code>string</code>

`signalTelemetryEnabled`: <code>boolean</code>


### [fromAgent(\[options\])]()


Connects to locally running CLI daemon.

Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`options`: <code>[FromAgentOptions](/api/@dxos/react-client/types/FromAgentOptions)</code>


### [fromHost(\[config\], \[params\], \[observabilityGroup\], \[signalTelemetryEnabled\])]()


Creates stand-alone services without rpc.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`params`: <code>ClientServicesHostParams</code>

`observabilityGroup`: <code>string</code>

`signalTelemetryEnabled`: <code>boolean</code>


### [fromIFrame(\[config\], \[options\])]()


Create services provider proxy connected via iFrame to host.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`options`: <code>Omit&lt;Partial&lt;[IFrameClientServicesProxyOptions](/api/@dxos/react-client/types/IFrameClientServicesProxyOptions)&gt;, "source"&gt;</code>


### [fromSocket(url, \[authenticationToken\])]()


Access to remote client via a socket.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`url`: <code>string</code>

`authenticationToken`: <code>string</code>


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


### [useAgentHostingClient()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/AgentHostingProvider.tsx#L31)




Returns: <code>"null" | [AgentHostingProviderClient](/api/@dxos/react-client/interfaces/AgentHostingProviderClient)</code>

Arguments: none




### [useClient()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/ClientContext.tsx#L45)


Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: none




### [useClientServices()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/useClientServices.ts#L12)




Returns: <code>undefined | [ClientServices](/api/@dxos/react-client/types/ClientServices)</code>

Arguments: none




### [useConfig()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/useConfig.ts#L15)


Hook returning config object used to initialize the DXOS client instance.
Requires ClientContext to be set via ClientProvider.

Returns: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Arguments: none




### [useMulticastObservable(observable)]()


Subscribe to a MulticastObservable and return the latest value.

Returns: <code>T</code>

Arguments: 

`observable`: <code>MulticastObservable&lt;T&gt;</code>


### [useShell()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/useShell.ts#L12)


Helper hook to access the shell.

Returns: <code>[Shell](/api/@dxos/react-client/classes/Shell)</code>

Arguments: none




### [useStatus()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/client/useStatus.ts#L12)




Returns: <code>undefined | "null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)</code>

Arguments: none




### [useInvitationStatus(\[initialObservable\])](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L78)




Returns: <code>[InvitationStatus](/api/@dxos/react-client/types/InvitationStatus)</code>

Arguments: 

`initialObservable`: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>


### [useNetworkStatus()](https://github.com/dxos/dxos/blob/061d3392e/packages/sdk/react-client/src/mesh/useNetworkStatus.ts#L13)


Creates a network status subscription.

Returns: <code>[NetworkStatus](/api/@dxos/react-client/interfaces/NetworkStatus)</code>

Arguments: none




### [onconnect(event)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`event`: <code>MessageEvent&lt;any&gt;</code>


