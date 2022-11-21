# Class `HaloInvitationsServiceImpl`
<sub>Declared in [packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts:14](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L14)</sub>


Adapts invitation service observable to client/service stream.

## Constructors
### [constructor(identityManager, invitationsHandler)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L16)


Returns: <code>[HaloInvitationsServiceImpl](/api/@dxos/client-services/classes/HaloInvitationsServiceImpl)</code>

Arguments: 

`identityManager`: <code>[IdentityManager](/api/@dxos/client-services/classes/IdentityManager)</code>

`invitationsHandler`: <code>[InvitationsHandler](/api/@dxos/client-services/interfaces/InvitationsHandler)&lt;void&gt;</code>

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
### [getContext(invitation)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L23)


Returns: <code>void</code>

Arguments: 

`invitation`: <code>Invitation</code>
### [getLoggingContext()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L31)


Returns: <code>object</code>

Arguments: none