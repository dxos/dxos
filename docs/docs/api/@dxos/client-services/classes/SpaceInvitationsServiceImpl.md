# Class `SpaceInvitationsServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts:21`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L21)


Adapts invitation service observable to client/service stream.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L26)


Returns: [`SpaceInvitationsServiceImpl`](/api/@dxos/client-services/classes/SpaceInvitationsServiceImpl)

Arguments: 

`_identityManager`: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)

`_getSpaceManager`: `Provider<SpaceManager>`

`_getSpaceInvitations`: `Provider<`[`SpaceInvitationsHandler`](/api/@dxos/client-services/classes/SpaceInvitationsHandler)`>`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L105)


Returns: `Stream<Invitation>`

Arguments: 

`invitation`: `Invitation`
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L174)


Returns: `Promise<void>`

Arguments: 

`__namedParameters`: `AuthenticationRequest`
### [`cancelInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L185)


Returns: `Promise<void>`

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/space-invitations-service.ts#L32)


Returns: `Stream<Invitation>`

Arguments: 

`invitation`: `Invitation`