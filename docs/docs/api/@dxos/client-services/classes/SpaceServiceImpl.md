# Class `SpaceServiceImpl`
<sub>Declared in [packages/sdk/client-services/src/packlets/deprecated/space.ts:34](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L34)</sub>


Space service implementation.

## Constructors
### [constructor(serviceContext)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L37)


Returns: <code>[SpaceServiceImpl](/api/@dxos/client-services/classes/SpaceServiceImpl)</code>

Arguments: 

`serviceContext`: <code>[ServiceContext](/api/@dxos/client-services/classes/ServiceContext)</code>

## Properties

## Methods
### [authenticateInvitation(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L199)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>AuthenticateInvitationRequest</code>
### [cloneSpace(snapshot)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L158)


Returns: <code>Promise&lt;Space&gt;</code>

Arguments: 

`snapshot`: <code>SpaceSnapshot</code>
### [createSnapshot(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L239)


Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: 

`request`: <code>CreateSnapshotRequest</code>
### [createSpace()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L148)


Returns: <code>Promise&lt;Space&gt;</code>

Arguments: none
### [getSpaceDetails(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L140)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: 

`request`: <code>GetSpaceDetailsRequest</code>
### [setSpaceState(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L168)


Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`request`: <code>SetSpaceStateRequest</code>
### [subscribeMembers(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L210)


Returns: <code>Stream&lt;SubscribeMembersResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeMembersRequest</code>
### [subscribeSpaces()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L94)


Returns: <code>Stream&lt;SubscribeSpacesResponse&gt;</code>

Arguments: none
### [subscribeToSpace(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/space.ts#L39)


Returns: <code>Stream&lt;SubscribeSpaceResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeSpaceRequest</code>