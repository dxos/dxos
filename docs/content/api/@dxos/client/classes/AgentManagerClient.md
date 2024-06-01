# Class `AgentManagerClient`
<sub>Declared in [packages/sdk/client/src/services/agent-hosting-provider.ts:59](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L59)</sub>




## Constructors
### [constructor(_clientConfig, _halo)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L68)




Returns: <code>[AgentManagerClient](/api/@dxos/client/classes/AgentManagerClient)</code>

Arguments: 

`_clientConfig`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`_halo`: <code>[Halo](/api/@dxos/client/interfaces/Halo)</code>



## Properties


## Methods
### [_agentManagerAuth(authDeviceCreds)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L213)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authDeviceCreds`: <code>[Credential](/api/@dxos/client/interfaces/Credential)</code>


### [_checkAuthorization(authToken)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L106)


Check auth token from CF worker whether identity is allowed to create agent.

Note: This will prevent the client from making unnecessary requests to the AgentHostingProvider API.
The AgentHostingProvider will also validate the auth token on its own.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [_decodeComposerBetaJwt()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L125)




Returns: <code>ComposerBetaJwt</code>

Arguments: none




### [_ensureAuthenticated()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L167)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_getComposerBetaCookie()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L130)




Returns: <code>any</code>

Arguments: none




### [_openRpc()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L182)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_queryCredentials(\[type\], \[predicate\])](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L251)




Returns: <code>Promise&lt;[Credential](/api/@dxos/client/interfaces/Credential)[]&gt;</code>

Arguments: 

`type`: <code>string</code>

`predicate`: <code>function</code>


### [checkEligibility(authToken)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L161)




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`authToken`: <code>any</code>


### [createAgent(invitationCode, identityKey)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L266)




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L337)




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L295)




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(\[authToken\])](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L88)


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [requestInitWithAuthToken(req)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L151)




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


### [requestInitWithCredentials(req)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/services/agent-hosting-provider.ts#L141)




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


