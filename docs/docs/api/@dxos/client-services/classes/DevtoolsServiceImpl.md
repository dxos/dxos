# Class `DevtoolsServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/devtools/devtools.ts:56`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L56)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L57)


Returns: [`DevtoolsServiceImpl`](/api/@dxos/client-services/classes/DevtoolsServiceImpl)

Arguments: 

`params`: [`DevtoolsServiceParams`](/api/@dxos/client-services/types/DevtoolsServiceParams)

## Properties


## Methods
### [`clearSnapshots`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L117)


Returns: `Promise<void>`

Arguments: 

`request`: `ClearSnapshotsRequest`
### [`disableDebugLogging`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L79)


Returns: `Promise<EnableDebugLoggingResponse>`

Arguments: 

`request`: `EnableDebugLoggingRequest`
### [`enableDebugLogging`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L75)


Returns: `Promise<EnableDebugLoggingResponse>`

Arguments: 

`request`: `EnableDebugLoggingRequest`
### [`events`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L59)


Returns: `Stream<Event>`

Arguments: 

`request`: `void`
### [`getConfig`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L67)


Returns: `Promise<GetConfigResponse>`

Arguments: 

`request`: `void`
### [`getNetworkPeers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L121)


Returns: `Promise<GetNetworkPeersResponse>`

Arguments: 

`request`: `GetNetworkPeersRequest`
### [`getSpaceSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L109)


Returns: `Promise<GetSpaceSnapshotResponse>`

Arguments: 

`request`: `GetSpaceSnapshotRequest`
### [`resetStorage`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L71)


Returns: `Promise<void>`

Arguments: 

`request`: `ResetStorageRequest`
### [`saveSpaceSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L113)


Returns: `Promise<SaveSpaceSnapshotResponse>`

Arguments: 

`request`: `SaveSpaceSnapshotRequest`
### [`subscribeToCredentialMessages`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L87)


Returns: `Stream<SubscribeToCredentialMessagesResponse>`

Arguments: 

`request`: `SubscribeToCredentialMessagesRequest`
### [`subscribeToFeedBlocks`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L105)


Returns: `Stream<SubscribeToFeedBlocksResponse>`

Arguments: 

`request`: `SubscribeToFeedBlocksRequest`
### [`subscribeToFeeds`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L101)


Returns: `Stream<SubscribeToFeedsResponse>`

Arguments: 

`request`: `SubscribeToFeedsRequest`
### [`subscribeToItems`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L97)


Returns: `Stream<SubscribeToItemsResponse>`

Arguments: 

`request`: `SubscribeToItemsRequest`
### [`subscribeToKeyringKeys`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L83)


Returns: `Stream<SubscribeToKeyringKeysResponse>`

Arguments: 

`request`: `SubscribeToKeyringKeysRequest`
### [`subscribeToNetworkTopics`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L125)


Returns: `Stream<SubscribeToNetworkTopicsResponse>`

Arguments: 

`request`: `void`
### [`subscribeToSignalStatus`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L129)


Returns: `Stream<SubscribeToSignalStatusResponse>`

Arguments: 

`request`: `void`
### [`subscribeToSignalTrace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L133)


Returns: `Stream<SubscribeToSignalTraceResponse>`

Arguments: none
### [`subscribeToSpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L93)


Returns: `Stream<SubscribeToSpacesResponse>`

Arguments: 

`request`: `SubscribeToSpacesRequest`
### [`subscribeToSwarmInfo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L137)


Returns: `Stream<SubscribeToSwarmInfoResponse>`

Arguments: none