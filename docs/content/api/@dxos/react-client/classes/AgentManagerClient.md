# Class `AgentManagerClient`
<sub>Declared in [packages/sdk/client/dist/types/src/services/agent-hosting-provider.d.ts:29]()</sub>




## Constructors
### [constructor(_clientConfig, _halo)]()




Returns: <code>[AgentManagerClient](/api/@dxos/react-client/classes/AgentManagerClient)</code>

Arguments: 

`_clientConfig`: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

`_halo`: <code>[Halo](/api/@dxos/react-client/interfaces/Halo)</code>



## Properties


## Methods
### [_agentManagerAuth(authDeviceCreds)]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authDeviceCreds`: <code>[Credential](/api/@dxos/client/interfaces/Credential)</code>


### [_checkAuthorization(authToken)]()


Check auth token from CF worker whether identity is allowed to create agent.

Note: This will prevent the client from making unnecessary requests to the AgentHostingProvider API.
The AgentHostingProvider will also validate the auth token on its own.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [_decodeComposerBetaJwt()]()




Returns: <code>ComposerBetaJwt</code>

Arguments: none




### [_ensureAuthenticated()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_getComposerBetaCookie()]()




Returns: <code>any</code>

Arguments: none




### [_openRpc()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [_queryCredentials(\[type\], \[predicate\])]()




Returns: <code>Promise&lt;[Credential](/api/@dxos/client/interfaces/Credential)[]&gt;</code>

Arguments: 

`type`: <code>string</code>

`predicate`: <code>function</code>


### [checkEligibility(authToken)]()




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`authToken`: <code>any</code>


### [createAgent(invitationCode, identityKey)]()




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`invitationCode`: <code>string</code>

`identityKey`: <code>string</code>


### [destroyAgent(agentID)]()




Returns: <code>Promise&lt;boolean&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [getAgent(agentID)]()




Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`agentID`: <code>string</code>


### [init(\[authToken\])]()


Initialize the client, potentially using the authToken to check authorization.

Returns: <code>boolean</code>

Arguments: 

`authToken`: <code>any</code>


### [requestInitWithAuthToken(req)]()




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


### [requestInitWithCredentials(req)]()




Returns: <code>RequestInit</code>

Arguments: 

`req`: <code>RequestInit</code>


