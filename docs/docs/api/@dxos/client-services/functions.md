---
title: Functions
---
# Functions
### [`createDefaultModelFactory`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L32)


Returns: `ModelFactory`

Arguments: none
### [`createHaloAuthProvider`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/authenticator.ts#L12)


Returns: `AuthProvider`

Arguments: 

`signer`: `CredentialSigner`
### [`createHaloAuthVerifier`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/authenticator.ts#L26)


Returns: `AuthVerifier`

Arguments: 

`getDeviceSet`: `function`
### [`createStorageObjects`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/storage/storage.ts#L19)


Returns: `object`

Arguments: 

`config`: `Storage`
### [`getNetworkPeers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L74)


Returns: `GetNetworkPeersResponse`

Arguments: 

`__namedParameters`: `object`

`request`: `GetNetworkPeersRequest`
### [`invitationObservable`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L103)


Util to wrap observable with promise.

Returns: `Promise<Invitation>`

Arguments: 

`observable`: `Observable<`[`InvitationEvents`](/api/@dxos/client-services/interfaces/InvitationEvents)`>`
### [`subscribeToFeedBlocks`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/feeds.ts#L54)


Returns: `Stream<SubscribeToFeedBlocksResponse>`

Arguments: 

`__namedParameters`: `object`

`__namedParameters`: `SubscribeToFeedBlocksRequest`
### [`subscribeToFeeds`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/feeds.ts#L18)


Returns: `Stream<SubscribeToFeedsResponse>`

Arguments: 

`__namedParameters`: `object`

`__namedParameters`: `SubscribeToFeedsRequest`
### [`subscribeToNetworkStatus`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L18)


Returns: `Stream<SubscribeToSignalStatusResponse>`

Arguments: 

`__namedParameters`: `object`
### [`subscribeToNetworkTopics`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L43)


Returns: `Stream<SubscribeToNetworkTopicsResponse>`

Arguments: 

`__namedParameters`: `object`
### [`subscribeToSignalTrace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L33)


Returns: `Stream<SubscribeToSignalTraceResponse>`

Arguments: 

`__namedParameters`: `object`
### [`subscribeToSpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/spaces.ts#L12)


Returns: `Stream<SubscribeToSpacesResponse>`

Arguments: 

`context`: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

`__namedParameters`: `SubscribeToSpacesRequest`
### [`subscribeToSwarmInfo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L62)


Returns: `Stream<SubscribeToSwarmInfoResponse>`

Arguments: 

`__namedParameters`: `object`