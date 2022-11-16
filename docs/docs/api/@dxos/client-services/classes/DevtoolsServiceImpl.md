# Class `DevtoolsServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/devtools/devtools.ts:58`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L58)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L59)


Returns: [`DevtoolsServiceImpl`](/api/@dxos/client-services/classes/DevtoolsServiceImpl)

Arguments: 

`params`: [`DevtoolsServiceParams`](/api/@dxos/client-services/types/DevtoolsServiceParams)

## Properties


## Methods
### [`clearSnapshots`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L119)


Returns: `Promise<void>`

Arguments: 

`request`: `ClearSnapshotsRequest`
### [`disableDebugLogging`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L81)


Returns: `Promise<EnableDebugLoggingResponse>`

Arguments: 

`request`: `EnableDebugLoggingRequest`
### [`enableDebugLogging`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L77)


Returns: `Promise<EnableDebugLoggingResponse>`

Arguments: 

`request`: `EnableDebugLoggingRequest`
### [`events`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L61)


Returns: `Stream<Event>`

Arguments: 

`request`: `void`
### [`getConfig`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L69)


Returns: `Promise<GetConfigResponse>`

Arguments: 

`request`: `void`
### [`getNetworkPeers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L123)


Returns: `Promise<GetNetworkPeersResponse>`

Arguments: 

`request`: `GetNetworkPeersRequest`
### [`getSpaceSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L111)


Returns: `Promise<GetSpaceSnapshotResponse>`

Arguments: 

`request`: `GetSpaceSnapshotRequest`
### [`resetStorage`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L73)


Returns: `Promise<void>`

Arguments: 

`request`: `ResetStorageRequest`
### [`saveSpaceSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L115)


Returns: `Promise<SaveSpaceSnapshotResponse>`

Arguments: 

`request`: `SaveSpaceSnapshotRequest`
### [`subscribeToCredentialMessages`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L89)


Returns: `Stream<SubscribeToCredentialMessagesResponse>`

Arguments: 

`request`: `SubscribeToCredentialMessagesRequest`
### [`subscribeToFeedBlocks`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L107)


Returns: `Stream<SubscribeToFeedBlocksResponse>`

Arguments: 

`request`: `SubscribeToFeedBlocksRequest`
### [`subscribeToFeeds`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L103)


Returns: `Stream<SubscribeToFeedsResponse>`

Arguments: 

`request`: `SubscribeToFeedsRequest`
### [`subscribeToItems`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L99)


Returns: `Stream<SubscribeToItemsResponse>`

Arguments: 

`request`: `SubscribeToItemsRequest`
### [`subscribeToKeyringKeys`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L85)


Returns: `Stream<SubscribeToKeyringKeysResponse>`

Arguments: 

`request`: `SubscribeToKeyringKeysRequest`
### [`subscribeToNetworkTopics`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L127)


Returns: `Stream<SubscribeToNetworkTopicsResponse>`

Arguments: 

`request`: `void`
### [`subscribeToSignalStatus`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L131)


Returns: `Stream<SubscribeToSignalStatusResponse>`

Arguments: 

`request`: `void`
### [`subscribeToSignalTrace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L135)


Returns: `Stream<SubscribeToSignalTraceResponse>`

Arguments: none
### [`subscribeToSpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L95)


Returns: `Stream<SubscribeToSpacesResponse>`

Arguments: 

`request`: `SubscribeToSpacesRequest`
### [`subscribeToSwarmInfo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L139)


Returns: `Stream<SubscribeToSwarmInfoResponse>`

Arguments: none