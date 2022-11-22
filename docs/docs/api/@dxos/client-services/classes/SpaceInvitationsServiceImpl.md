# Class `SpaceInvitationsServiceImpl`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts:18](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L18)</sub>


Adapts invitation service observable to client/service stream.

## Constructors
### [constructor(identityManager, invitationsHandler, _getSpaceManager)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L20)


Returns: <code>[SpaceInvitationsServiceImpl](/api/@dxos/client-services/classes/SpaceInvitationsServiceImpl)</code>

Arguments: 

`identityManager`: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>

`invitationsHandler`: <code>Provider&lt;[InvitationsHandler](/api/@dxos/client-services/interfaces/InvitationsHandler)&lt;Space&gt;&gt;</code>

`_getSpaceManager`: <code>Provider&lt;SpaceManager&gt;</code>

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
### [getContext(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L28)


Returns: <code>Space</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [getLoggingContext()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L31)


Returns: <code>object</code>

Arguments: none