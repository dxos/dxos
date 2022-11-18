# Class `SpaceServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/deprecated/space.ts:34`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L34)


Space service implementation.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L37)


Returns: [`SpaceServiceImpl`](/api/@dxos/client-services/classes/SpaceServiceImpl)

Arguments: 

`serviceContext`: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

## Properties


## Methods
### [`authenticateInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L199)


Returns: `Promise<void>`

Arguments: 

`request`: `AuthenticateInvitationRequest`
### [`cloneSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L158)


Returns: `Promise<Space>`

Arguments: 

`snapshot`: `SpaceSnapshot`
### [`createSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L239)


Returns: `Promise<SpaceSnapshot>`

Arguments: 

`request`: `CreateSnapshotRequest`
### [`createSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L148)


Returns: `Promise<Space>`

Arguments: none
### [`getSpaceDetails`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L140)


Returns: `Promise<SpaceDetails>`

Arguments: 

`request`: `GetSpaceDetailsRequest`
### [`setSpaceState`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L168)


Returns: `Promise<never>`

Arguments: 

`request`: `SetSpaceStateRequest`
### [`subscribeMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L210)


Returns: `Stream<SubscribeMembersResponse>`

Arguments: 

`request`: `SubscribeMembersRequest`
### [`subscribeSpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L94)


Returns: `Stream<SubscribeSpacesResponse>`

Arguments: none
### [`subscribeToSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L39)


Returns: `Stream<SubscribeSpaceResponse>`

Arguments: 

`request`: `SubscribeSpaceRequest`