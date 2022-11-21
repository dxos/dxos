# Class `ServiceContext`
<sub>Declared in [packages/sdk/client-services/src/packlets/services/service-context.ts:31](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L31)</sub>


Shared backend for all client services.

## Constructors
### [constructor(storage, networkManager, modelFactory)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L45)


Returns: <code>[ServiceContext](/api/@dxos/client-services/classes/ServiceContext)</code>

Arguments: 

`storage`: <code>Storage</code>

`networkManager`: <code>NetworkManager</code>

`modelFactory`: <code>ModelFactory</code>

## Properties
### [dataServiceSubscriptions](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L33)
Type: <code>DataServiceSubscriptions</code>
### [feedStore](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L35)
Type: <code>FeedStore&lt;FeedMessage&gt;</code>
### [haloInvitations](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L38)
Type: <code>[HaloInvitationsHandler](/api/@dxos/client-services/classes/HaloInvitationsHandler)</code>
### [identityManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L37)
Type: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>
### [initialized](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L32)
Type: <code>Trigger&lt;void&gt;</code>
### [keyring](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L36)
Type: <code>Keyring</code>
### [metadataStore](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L34)
Type: <code>MetadataStore</code>
### [modelFactory](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L48)
Type: <code>ModelFactory</code>
### [networkManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L47)
Type: <code>NetworkManager</code>
### [spaceInvitations](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L42)
Type: <code>[SpaceInvitationsHandler](/api/@dxos/client-services/classes/SpaceInvitationsHandler)</code>
### [spaceManager](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L41)
Type: <code>SpaceManager</code>
### [storage](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L46)
Type: <code>Storage</code>

## Methods
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L85)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createIdentity()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L95)


Returns: <code>Promise&lt;[Identity](/api/@dxos/client-services/classes/Identity)&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L76)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none