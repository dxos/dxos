---
title: Functions
---
# Functions
### [createDefaultModelFactory()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/services/service-host.ts#L26)


Returns: <code>ModelFactory</code>

Arguments: none
### [createHaloAuthProvider(signer)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/authenticator.ts#L12)


Returns: <code>AuthProvider</code>

Arguments: 

`signer`: <code>CredentialSigner</code>
### [createHaloAuthVerifier(getDeviceSet)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/authenticator.ts#L26)


Returns: <code>AuthVerifier</code>

Arguments: 

`getDeviceSet`: <code>function</code>
### [createStorageObjects(config)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/storage/storage.ts#L19)


Returns: <code>object</code>

Arguments: 

`config`: <code>Storage</code>
### [getNetworkPeers(options, request)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L74)


Returns: <code>GetNetworkPeersResponse</code>

Arguments: 

`options`: <code>object</code>

`request`: <code>GetNetworkPeersRequest</code>
### [subscribeToFeedBlocks(options, options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/feeds.ts#L54)


Returns: <code>Stream&lt;SubscribeToFeedBlocksResponse&gt;</code>

Arguments: 

`options`: <code>object</code>

`options`: <code>SubscribeToFeedBlocksRequest</code>
### [subscribeToFeeds(options, options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/feeds.ts#L18)


Returns: <code>Stream&lt;SubscribeToFeedsResponse&gt;</code>

Arguments: 

`options`: <code>object</code>

`options`: <code>SubscribeToFeedsRequest</code>
### [subscribeToNetworkStatus(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L18)


Returns: <code>Stream&lt;SubscribeToSignalStatusResponse&gt;</code>

Arguments: 

`options`: <code>object</code>
### [subscribeToNetworkTopics(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L43)


Returns: <code>Stream&lt;SubscribeToNetworkTopicsResponse&gt;</code>

Arguments: 

`options`: <code>object</code>
### [subscribeToSignalTrace(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L33)


Returns: <code>Stream&lt;SubscribeToSignalTraceResponse&gt;</code>

Arguments: 

`options`: <code>object</code>
### [subscribeToSpaces(context, options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/spaces.ts#L12)


Returns: <code>Stream&lt;SubscribeToSpacesResponse&gt;</code>

Arguments: 

`context`: <code>[ServiceContext](/api/@dxos/client-services/classes/ServiceContext)</code>

`options`: <code>SubscribeToSpacesRequest</code>
### [subscribeToSwarmInfo(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/devtools/network.ts#L62)


Returns: <code>Stream&lt;SubscribeToSwarmInfoResponse&gt;</code>

Arguments: 

`options`: <code>object</code>
### [wrapObservable(observable)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations.ts#L98)


Testing util to wrap non-authenticating observable with promise.
Don't use this in production code.

Returns: <code>Promise&lt;Invitation&gt;</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/client-services/interfaces/CancellableInvitationObservable)</code>