# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/echo-proxy.ts:38](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L38)</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider, _modelFactory, _haloProxy)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L45)


Returns: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_haloProxy`: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

## Properties
### [modelFactory](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L65)
Type: <code>ModelFactory</code>
### [networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L72)
Type: <code>any</code>

## Methods
### [\[custom\]()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L51)


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L208)


Initiates an interactive accept invitation flow.

Returns: <code>Promise&lt;[AuthenticatingInvitationObservable](/api/@dxos/client/interfaces/AuthenticatingInvitationObservable)&gt;</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [cloneSpace(snapshot)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L173)


Clones the space from a snapshot.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`snapshot`: <code>SpaceSnapshot</code>
### [createSpace()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L152)


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: none
### [getSpace(spaceKey)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L194)


Returns an individual space by its key.

Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [querySpaces()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L201)


Query for all spaces.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: none
### [toJSON()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L56)


Returns: <code>object</code>

Arguments: none