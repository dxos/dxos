# Class `InvitationDescriptor`
Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:21`]()


Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
### [`constructor`]()


Returns: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

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
### [`encode`]()


Returns: `string`

Arguments: none
### [`toProto`]()


Returns: `InvitationDescriptor`

Arguments: none
### [`toQueryParameters`]()


Exports an InvitationDescriptor to an object suitable for use as query parameters.

Returns: `InvitationQueryParameters`

Arguments: none
### [`decode`]()


Returns: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

Arguments: 

`code`: `string`
### [`fromProto`]()


Returns: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

Arguments: 

`invitation`: `InvitationDescriptor`
### [`fromQueryParameters`]()


Returns: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

Arguments: 

`queryParameters`: `InvitationQueryParameters`