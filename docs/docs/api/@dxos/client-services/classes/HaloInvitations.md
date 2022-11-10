# Class `HaloInvitations`
Declared in [`packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts:22`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L22)


Creates and processes Halo invitations between devices.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L23)


Returns: [`HaloInvitations`](/api/@dxos/client-services/classes/HaloInvitations)

Arguments: 

`_identityManager`: [`IdentityManager`](/api/@dxos/client-services/classes/IdentityManager)

`_networkManager`: `NetworkManager`

`_onInitialize`: `function`

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L103)


Joins an existing identity HALO by invitation.

Returns: `Promise<`[`Identity`](/api/@dxos/client-services/classes/Identity)`>`

Arguments: 

`invitation`: `Invitation`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L32)


Sends a HALO admission offer and waits for guest to accept.

Returns: `Promise<Invitation>`

Arguments: 

`__namedParameters`: `object`