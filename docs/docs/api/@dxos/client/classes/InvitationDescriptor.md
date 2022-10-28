# Class `InvitationDescriptor`
> Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:21`]()


Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
### constructor
```ts
(type: Type, swarmKey: [PublicKey](/api/@dxos/client/classes/PublicKey), invitation: Uint8Array, identityKey: [PublicKey](/api/@dxos/client/classes/PublicKey), secret: Uint8Array) => [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
```

## Properties
### identityKey 
Type: [PublicKey](/api/@dxos/client/classes/PublicKey)
### invitation 
Type: Uint8Array
### secret 
Type: Uint8Array
### swarmKey 
Type: [PublicKey](/api/@dxos/client/classes/PublicKey)
### type 
Type: Type
### hash
Type: string

## Methods
### encode
```ts
() => string
```
### toProto
```ts
() => InvitationDescriptor
```
### toQueryParameters
```ts
() => InvitationQueryParameters
```
Exports an InvitationDescriptor to an object suitable for use as query parameters.
### decode
```ts
(code: string) => [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
```
### fromProto
```ts
(invitation: InvitationDescriptor) => [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
```
### fromQueryParameters
```ts
(queryParameters: InvitationQueryParameters) => [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
```