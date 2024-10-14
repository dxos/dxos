# Class `AgentManagerClient`
<sub>Declared in [packages/sdk/client/src/services/agent-hosting-provider.ts:61](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L61)</sub>




## Constructors
### [constructor(_clientConfig, _halo)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L70)




Returns: <code>[AgentManagerClient](/api/@dxos/client/classes/AgentManagerClient)</code>

Arguments: 

`_clientConfig`: <code>[Config](/api/@dxos/client/classes/Config)</code>

`_halo`: <code>[Halo](/api/@dxos/client/interfaces/Halo)</code>



## Properties


## Methods
### [_agentManagerAuth(authDeviceCreds, \[agentAuthzCredential\])](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L238)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authDeviceCreds`: <code>[Credential](/api/@dxos/client/interfaces/Credential)</code>

`agentAuthzCredential`: <code>[Credential](/api/@dxos/client/interfaces/Credential)</code>


### [_checkAuthCookie(authToken)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L125)




Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [_checkAuthorization(\[authToken\])](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L108)


Check auth token/credential from CF worker whether identity is allowed to create agent.

Note: This will prevent the client from making unnecessary requests to the AgentHostingProvider API.
The AgentHostingProvider will also validate the auth token/credential on its own.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [_decodeComposerBetaJwt()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L144)




Returns: <code>ComposerBetaJwt</code>

Arguments: none




### [_ensureAuthenticated()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L189)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_getAuthorizationCredential()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L160)




Returns: <code>undefined | [Credential](/api/@dxos/client/interfaces/Credential)</code>

Arguments: none




### [_getComposerBetaCookie()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L149)




Returns: <code>any</code>

Arguments: none




### [_openRpc()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L206)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_queryCredentials(\[type\], \[predicate\])](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L299)




Returns: <code>Promise&lt;[Credential](/api/@dxos/client/interfaces/Credential)[]&gt;</code>

Arguments: 

`type`: <code>string</code>

`predicate`: <code>function</code>


### [_validAuthToken()](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L283)




Returns: <code>"null" | JwtPayload</code>

Arguments: none




### [createAgent(invitationCode, identityKey)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L314)




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L385)




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L343)




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(\[authToken\])](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L90)


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [requestInitWithAuthToken(req)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L178)




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


### [requestInitWithCredentials(req)](https://github.com/dxos/dxos/blob/664e23dbe/packages/sdk/client/src/services/agent-hosting-provider.ts#L168)




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


