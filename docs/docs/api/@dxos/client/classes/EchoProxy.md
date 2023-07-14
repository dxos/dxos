# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/echo-proxy.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L28)</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider, _modelFactory)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L47)



Returns: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>


## Properties
### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L37)
Type: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

### [modelFactory](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L65)
Type: <code>ModelFactory</code>

### [networkManager](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L72)
Type: <code>NetworkManager</code>

### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L82)
Type: <code>boolean</code>

### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L86)
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L52)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L229)



Initiates an interactive accept invitation flow.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [addSchema(schema)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L162)



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>

### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L148)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L177)



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/client/types/PropertiesProps)</code>

### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L222)



Returns an individual space by its key.


Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L90)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L56)



Returns: <code>object</code>

Arguments: none
