# Class `ServiceContext`
Declared in [`packages/sdk/client-services/src/packlets/services/service-context.ts:31`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L31)


Shared backend for all client services.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L45)


Returns: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

Arguments: 

`storage`: `Storage`

`networkManager`: `NetworkManager`

`modelFactory`: `ModelFactory`

## Properties
### [`dataServiceSubscriptions`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L33)
Type: `DataServiceSubscriptions`
### [`feedStore`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L35)
Type: `FeedStore<FeedMessage>`
### [`haloInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L38)
Type: [`HaloInvitations`](/api/@dxos/client-services/classes/HaloInvitations)
### [`identityManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L37)
Type: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)
### [`initialized`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L32)
Type: `Trigger<void>`
### [`keyring`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L36)
Type: `Keyring`
### [`metadataStore`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L34)
Type: `MetadataStore`
### [`modelFactory`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L48)
Type: `ModelFactory`
### [`networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L47)
Type: `NetworkManager`
### [`spaceInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L42)
Type: [`SpaceInvitationsHandler`](/api/@dxos/client-services/classes/SpaceInvitationsHandler)
### [`spaceManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L41)
Type: `SpaceManager`
### [`storage`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L46)
Type: `Storage`

## Methods
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L86)


Returns: `Promise<void>`

Arguments: none
### [`createIdentity`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L96)


Returns: `Promise<`[`Identity`](/api/@dxos/client-services/classes/Identity)`>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-context.ts#L77)


Returns: `Promise<void>`

Arguments: none