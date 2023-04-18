# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/echo-proxy.ts:43](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L43)</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider, _modelFactory)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L62)



Returns: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>


## Properties
### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L52)
Type: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

### [modelFactory](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L80)
Type: <code>ModelFactory</code>

### [networkManager](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L87)
Type: <code>NetworkManager</code>

### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L97)
Type: <code>boolean</code>

### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L101)
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L67)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L237)



Initiates an interactive accept invitation flow.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [addSchema(schema)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L173)



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>

### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L158)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L188)



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/client/types/PropertiesProps)</code>

### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L230)



Returns an individual space by its key.


Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L105)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L71)



Returns: <code>object</code>

Arguments: none
