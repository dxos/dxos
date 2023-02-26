# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/echo-proxy.ts:46](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L46)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider, _modelFactory, _haloProxy)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L60)


Returns: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_haloProxy`: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

## Properties
### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L53)
Type: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>
### [modelFactory](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L80)
Type: <code>ModelFactory</code>
### [networkManager](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L87)
Type: <code>any</code>
### [opened](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L97)
Type: <code>boolean</code>

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L66)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L223)


Initiates an interactive accept invitation flow.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L144)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L161)


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesOptions](/api/@dxos/client/types/PropertiesOptions)</code>
### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L202)


Returns an individual space by its key.

Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [getSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L209)


Get list of all spaces.

Returns: <code>[Space](/api/@dxos/client/interfaces/Space)[]</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L101)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [subscribeSpaces(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L216)


Subscribe to spaces changes.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L71)


Returns: <code>object</code>

Arguments: none