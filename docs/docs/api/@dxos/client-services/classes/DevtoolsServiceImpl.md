# Class `DevtoolsServiceImpl`
<sub>Declared in [packages/sdk/client-services/src/packlets/devtools/devtools.ts:59](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L59)</sub>




## Constructors
### [constructor(params)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L60)


Returns: <code>[DevtoolsServiceImpl](/api/@dxos/client-services/classes/DevtoolsServiceImpl)</code>

Arguments: 

`params`: <code>[DevtoolsServiceParams](/api/@dxos/client-services/types/DevtoolsServiceParams)</code>

## Properties

## Methods
### [clearSnapshots(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L120)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>ClearSnapshotsRequest</code>
### [disableDebugLogging(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L82)


Returns: <code>Promise&lt;EnableDebugLoggingResponse&gt;</code>

Arguments: 

`request`: <code>EnableDebugLoggingRequest</code>
### [enableDebugLogging(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L78)


Returns: <code>Promise&lt;EnableDebugLoggingResponse&gt;</code>

Arguments: 

`request`: <code>EnableDebugLoggingRequest</code>
### [events(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L62)


Returns: <code>Stream&lt;Event&gt;</code>

Arguments: 

`request`: <code>void</code>
### [getConfig(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L70)


Returns: <code>Promise&lt;GetConfigResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [getNetworkPeers(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L124)


Returns: <code>Promise&lt;GetNetworkPeersResponse&gt;</code>

Arguments: 

`request`: <code>GetNetworkPeersRequest</code>
### [getSpaceSnapshot(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L112)


Returns: <code>Promise&lt;GetSpaceSnapshotResponse&gt;</code>

Arguments: 

`request`: <code>GetSpaceSnapshotRequest</code>
### [resetStorage(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L74)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`request`: <code>ResetStorageRequest</code>
### [saveSpaceSnapshot(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L116)


Returns: <code>Promise&lt;SaveSpaceSnapshotResponse&gt;</code>

Arguments: 

`request`: <code>SaveSpaceSnapshotRequest</code>
### [subscribeToCredentialMessages(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L90)


Returns: <code>Stream&lt;SubscribeToCredentialMessagesResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToCredentialMessagesRequest</code>
### [subscribeToFeedBlocks(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L108)


Returns: <code>Stream&lt;SubscribeToFeedBlocksResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToFeedBlocksRequest</code>
### [subscribeToFeeds(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L104)


Returns: <code>Stream&lt;SubscribeToFeedsResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToFeedsRequest</code>
### [subscribeToItems(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L100)


Returns: <code>Stream&lt;SubscribeToItemsResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToItemsRequest</code>
### [subscribeToKeyringKeys(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L86)


Returns: <code>Stream&lt;SubscribeToKeyringKeysResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToKeyringKeysRequest</code>
### [subscribeToNetworkTopics(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L128)


Returns: <code>Stream&lt;SubscribeToNetworkTopicsResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [subscribeToSignalStatus(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L132)


Returns: <code>Stream&lt;SubscribeToSignalStatusResponse&gt;</code>

Arguments: 

`request`: <code>void</code>
### [subscribeToSignalTrace()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L136)


Returns: <code>Stream&lt;SubscribeToSignalTraceResponse&gt;</code>

Arguments: none
### [subscribeToSpaces(request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L96)


Returns: <code>Stream&lt;SubscribeToSpacesResponse&gt;</code>

Arguments: 

`request`: <code>SubscribeToSpacesRequest</code>
### [subscribeToSwarmInfo()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/devtools.ts#L140)


Returns: <code>Stream&lt;SubscribeToSwarmInfoResponse&gt;</code>

Arguments: none