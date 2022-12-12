# Class `IdentityManager`
<sub>Declared in [packages/sdk/client-services/src/packlets/identity/identity-manager.ts:46](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L46)</sub>




## Constructors
### [constructor(_metadataStore, _feedStore, _keyring, _networkManager, _modelFactory)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L53)


Returns: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>

Arguments: 

`_metadataStore`: <code>MetadataStore</code>

`_feedStore`: <code>FeedStore&lt;FeedMessage&gt;</code>

`_keyring`: <code>Keyring</code>

`_networkManager`: <code>NetworkManager</code>

`_modelFactory`: <code>ModelFactory</code>

## Properties
### [stateUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L47)
Type: <code>Event&lt;void&gt;</code>
### [identity](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L61)
Type: <code>undefined | [Identity](/api/@dxos/client-services/classes/Identity)</code>

## Methods
### [acceptIdentity(params)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L149)


Accept an existing identity. Expects it's device key to be authorized (now or later).

Returns: <code>Promise&lt;[Identity](/api/@dxos/client-services/classes/Identity)&gt;</code>

Arguments: 

`params`: <code>[JoinIdentityParams](/api/@dxos/client-services/types/JoinIdentityParams)</code>
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L77)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createIdentity(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L81)


Returns: <code>Promise&lt;[Identity](/api/@dxos/client-services/classes/Identity)&gt;</code>

Arguments: 

`options`: <code>[CreateIdentityOptions](/api/@dxos/client-services/types/CreateIdentityOptions)</code>
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity-manager.ts#L65)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none