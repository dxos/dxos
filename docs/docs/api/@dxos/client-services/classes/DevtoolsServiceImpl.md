# Class `DevtoolsServiceImpl`
<sub>Declared in [packages/sdk/client-services/src/packlets/devtools/devtools.ts:58](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L58)</sub>




## Constructors
### [constructor(params)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L59)


Returns: <code>[DevtoolsServiceImpl](/api/@dxos/client-services/classes/DevtoolsServiceImpl)</code>

Arguments: 

`params`: <code>[DevtoolsServiceParams](/api/@dxos/client-services/types/DevtoolsServiceParams)</code>

## Properties

## Methods
### [clearSnapshots(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L119)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>ClearSnapshotsRequest</code>
### [disableDebugLogging(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L81)


Returns: <code>Promise&lt;EnableDebugLoggingResponse&gt;</code>

Arguments: 

`request`: <code>EnableDebugLoggingRequest</code>
### [enableDebugLogging(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L77)


Returns: <code>Promise&lt;EnableDebugLoggingResponse&gt;</code>

Arguments: 

`request`: <code>EnableDebugLoggingRequest</code>
### [events(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L61)


Returns: <code>Stream&lt;Event&gt;</code>

Arguments: 

`request`: <code>void</code>
### [getConfig(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L69)


Returns: <code>Promise&lt;GetConfigResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [getNetworkPeers(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L123)


Returns: <code>Promise&lt;GetNetworkPeersResponse&gt;</code>

Arguments: 

`request`: <code>GetNetworkPeersRequest</code>
### [getSpaceSnapshot(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L111)


Returns: <code>Promise&lt;GetSpaceSnapshotResponse&gt;</code>

Arguments: 

`request`: <code>GetSpaceSnapshotRequest</code>
### [resetStorage(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L73)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>ResetStorageRequest</code>
### [saveSpaceSnapshot(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L115)


Returns: <code>Promise&lt;SaveSpaceSnapshotResponse&gt;</code>

Arguments: 

`request`: <code>SaveSpaceSnapshotRequest</code>
### [subscribeToCredentialMessages(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L89)


Returns: <code>Stream&lt;SubscribeToCredentialMessagesResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToCredentialMessagesRequest</code>
### [subscribeToFeedBlocks(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L107)


Returns: <code>Stream&lt;SubscribeToFeedBlocksResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToFeedBlocksRequest</code>
### [subscribeToFeeds(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L103)


Returns: <code>Stream&lt;SubscribeToFeedsResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToFeedsRequest</code>
### [subscribeToItems(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L99)


Returns: <code>Stream&lt;SubscribeToItemsResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToItemsRequest</code>
### [subscribeToKeyringKeys(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L85)


Returns: <code>Stream&lt;SubscribeToKeyringKeysResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToKeyringKeysRequest</code>
### [subscribeToNetworkTopics(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L127)


Returns: <code>Stream&lt;SubscribeToNetworkTopicsResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [subscribeToSignalStatus(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L131)


Returns: <code>Stream&lt;SubscribeToSignalStatusResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [subscribeToSignalTrace()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L135)


Returns: <code>Stream&lt;SubscribeToSignalTraceResponse&gt;</code>

Arguments: none
### [subscribeToSpaces(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L95)


Returns: <code>Stream&lt;SubscribeToSpacesResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToSpacesRequest</code>
### [subscribeToSwarmInfo()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L139)


Returns: <code>Stream&lt;SubscribeToSwarmInfoResponse&gt;</code>

Arguments: none