# Class `AbstractInvitationsService`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/invitations-service.ts:20](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L20)</sub>


Adapts invitation service observable to client/service stream.

## Constructors
### [constructor(_identityManager, _getInvitationsHandler)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L25)


Returns: <code>[AbstractInvitationsService](/api/@dxos/client-services/classes/AbstractInvitationsService)&lt;T&gt;</code>

Arguments: 

`_identityManager`: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>

`_getInvitationsHandler`: <code>Provider&lt;[InvitationsHandler](/api/@dxos/client-services/interfaces/InvitationsHandler)&lt;T&gt;&gt;</code>

## Properties

## Methods
### [acceptInvitation(invitation, \[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L102)


Returns: <code>Stream&lt;Invitation&gt;</code>

Arguments: 

`invitation`: <code>Invitation</code>

`options`: <code>[InvitationsOptions](/api/@dxos/client-services/types/InvitationsOptions)</code>
### [authenticate(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L162)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`options`: <code>AuthenticationRequest</code>
### [cancelInvitation(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L173)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [createInvitation(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L39)


Returns: <code>Stream&lt;Invitation&gt;</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [getContext(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L37)


Returns: <code>T</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [getLoggingContext()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L31)


Returns: <code>object</code>

Arguments: none