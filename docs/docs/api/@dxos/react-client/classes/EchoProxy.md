# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/echo-proxy.d.ts:23]()</sub>


TODO(burdon): Public API (move comments here).

## Constructors
### [constructor(_serviceProvider, _modelFactory, _haloProxy)]()


Returns: <code>[EchoProxy](/api/@dxos/react-client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_haloProxy`: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

## Properties
### [dbRouter]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>
### [modelFactory]()
Type: <code>ModelFactory</code>
### [networkManager]()
Type: <code>any</code>
### [opened]()
Type: <code>boolean</code>

## Methods
### [\[custom\]()]()


Returns: <code>string</code>

Arguments: none
### [acceptInvitation(invitation, \[options\])]()


Initiates an interactive accept invitation flow.

Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/interfaces/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

`options`: <code>InvitationsOptions</code>
### [close()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createSpace(\[meta\])]()


Creates a new space.

Returns: <code>Promise&lt;[Space](/api/@dxos/react-client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesOptions](/api/@dxos/react-client/types/PropertiesOptions)</code>
### [getSpace(spaceKey)]()


Returns an individual space by its key.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [getSpaces()]()


Get list of all spaces.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)[]</code>

Arguments: none
### [open()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [subscribeSpaces(callback)]()


Subscribe to spaces changes.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()]()


Returns: <code>object</code>

Arguments: none