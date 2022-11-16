# Class `InvitationWrapper`
Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-wrapper.d.ts:21`]()


Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
### [`constructor`]()


Returns: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

Arguments: 

`type`: `Type`

`swarmKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

`invitation`: `Uint8Array`

`identityKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

`secret`: `Uint8Array`

## Properties
### [`identityKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`invitation`]()
Type: `Uint8Array`
### [`secret`]()
Type: `Uint8Array`
### [`swarmKey`]()
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`type`]()
Type: `Type`
### [`hash`]()
Type: `string`

## Methods
### [`toProto`]()


Returns: `InvitationDescriptor`

Arguments: none
### [`toQueryParameters`]()


Returns: `InvitationQueryParameters`

Arguments: none
### [`decode`]()


Returns: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

Arguments: 

`code`: `string`
### [`encode`]()


Returns: `string`

Arguments: 

`invitation`: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)
### [`fromProto`]()


Returns: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

Arguments: 

`invitation`: `InvitationDescriptor`
### [`fromQueryParameters`]()


Returns: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

Arguments: 

`queryParameters`: `InvitationQueryParameters`