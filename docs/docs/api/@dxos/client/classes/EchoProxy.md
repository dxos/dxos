# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/echo-proxy.ts:40](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L40)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider, _modelFactory, _haloProxy)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L50)


Returns: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_haloProxy`: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

## Properties
### [modelFactory](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L70)
Type: <code>ModelFactory</code>
### [networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L77)
Type: <code>any</code>
### [opened](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L87)
Type: <code>boolean</code>

## Methods
### [\[custom\]()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L56)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L203)


Initiates an interactive accept invitation flow.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L135)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createSpace()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L151)


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: none
### [getSpace(spaceKey)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L189)


Returns an individual space by its key.

Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L91)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [querySpaces()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L196)


Query for all spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: none
### [toJSON()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L61)


Returns: <code>object</code>

Arguments: none