# Class `HaloInvitationsServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts:14`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L14)


Adapts invitation service observable to client/service stream.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L16)


Returns: [`HaloInvitationsServiceImpl`](/api/@dxos/client-services/classes/HaloInvitationsServiceImpl)

Arguments: 

`identityManager`: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)

`invitationsHandler`: [`InvitationsHandler`](/api/@dxos/client-services/interfaces/InvitationsHandler)`<void>`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L102)


Returns: `Stream<Invitation>`

Arguments: 

`invitation`: `Invitation`

`options`: [`InvitationsOptions`](/api/@dxos/client-services/types/InvitationsOptions)
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L162)


Returns: `Promise<void>`

Arguments: 

`__namedParameters`: `AuthenticationRequest`
### [`cancelInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L173)


Returns: `Promise<void>`

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L39)


Returns: `Stream<Invitation>`

Arguments: 

`invitation`: `Invitation`
### [`getContext`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations-service.ts#L23)


Returns: `void`

Arguments: 

`invitation`: `Invitation`
### [`getLoggingContext`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitations-service.ts#L31)


Returns: `object`

Arguments: none