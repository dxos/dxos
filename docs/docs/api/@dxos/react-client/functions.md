---
title: Functions
---
# Functions
### [ClientProvider(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L94)



Root component that provides the DXOS client instance to child components.
To be used with the  `useClient`  hook.


Returns: <code>Element</code>

Arguments: 

`options`: <code>[ClientProviderProps](/api/@dxos/react-client/interfaces/ClientProviderProps)</code>

### [Defaults(\[basePath\])]()



JSON config.


Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>

### [Dynamics()]()



Provided dynamically by server.


Returns: <code>T</code>

Arguments: none

### [Envs(\[basePath\])]()



ENV variable (key/value) map


Returns: <code>T</code>

Arguments: 

`basePath`: <code>string</code>

### [Local()]()



Development config.


Returns: <code>T</code>

Arguments: none

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


Returns: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Arguments: 

`url`: <code>string</code>

### [getUnixSocket(profile, \[protocol\])]()



Returns: <code>string</code>

Arguments: 

`profile`: <code>string</code>

`protocol`: <code>string</code>

### [useClient()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L43)



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

### [useShellProvider(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useShellProvider.ts#L29)



Use this hook to fully integrate an app with the shell.


Returns: <code>void</code>

Arguments: 

`options`: <code>[UseShellProviderOptions](/api/@dxos/react-client/types/UseShellProviderOptions)</code>

### [useStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/useStatus.ts#L12)



Returns: <code>undefined | "null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)</code>

Arguments: none
