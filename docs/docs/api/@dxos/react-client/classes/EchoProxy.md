# Class `EchoProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/echo-proxy.d.ts:11]()</sub>


TODO(burdon): Public API (move comments here).


## Constructors
### [constructor(_serviceProvider, _modelFactory)]()



Returns: <code>[EchoProxy](/api/@dxos/react-client/classes/EchoProxy)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>


## Properties
### [dbRouter]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

### [modelFactory]()
Type: <code>ModelFactory</code>

### [networkManager]()
Type: <code>NetworkManager</code>

### [opened]()
Type: <code>boolean</code>

### [spaces]()
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/react-client/interfaces/Space)[]&gt;</code>


## Methods
### [\[custom\]()]()



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)]()



Initiates an interactive accept invitation flow.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [addSchema(schema)]()



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/react-client/classes/EchoSchema)</code>

### [close()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createSpace(\[meta\])]()



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/react-client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/react-client/types/PropertiesProps)</code>

### [getSpace(spaceKey)]()



Returns an individual space by its key.


Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

### [open()]()



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()]()



Returns: <code>object</code>

Arguments: none
