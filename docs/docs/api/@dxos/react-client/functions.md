---
title: Functions
---
# Functions
### [ClientProvider(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L96)


Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.

Returns: <code>Element</code>

Arguments: 

`options`: <code>[ClientProviderProps](/api/@dxos/react-client/interfaces/ClientProviderProps)</code>


### [Defaults(\[basePath\])]()


JSON config.

Returns: <code>Partial&lt;Config&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Dynamics()]()


Provided dynamically by server.

Returns: <code>Partial&lt;Config&gt;</code>

Arguments: none




### [Envs(\[basePath\])]()


ENV variable (key/value) map.

Returns: <code>Partial&lt;Config&gt;</code>

Arguments: 

`basePath`: <code>string</code>


### [Local()]()


Development config.

Returns: <code>Partial&lt;Config&gt;</code>

Arguments: none




### [Remote(target)]()




Returns: <code>Partial&lt;Config&gt;</code>

Arguments: 

`target`: <code>undefined | string</code>


### [createClientServices(config)]()


Create services from config.

Returns: <code>Promise&lt;[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)&gt;</code>

Arguments: 

`config`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>


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


### [getUnixSocket(profile, \[protocol\])]()




Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>


### [useClient()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L45)


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




### [useMulticastObservable(observable)]()


Subscribe to a MulticastObservable and return the latest value.

Returns: <code>T</code>

Arguments: 

`observable`: <code>MulticastObservable&lt;T&gt;</code>


### [useShell()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useShell.ts#L12)


Helper hook to access the shell.

Returns: <code>[Shell](/api/@dxos/react-client/classes/Shell)</code>

Arguments: none




### [useStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useStatus.ts#L12)




Returns: <code>undefined | "null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)</code>

Arguments: none




