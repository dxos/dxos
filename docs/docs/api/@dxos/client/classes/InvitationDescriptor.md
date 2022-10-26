# Class `InvitationDescriptor`
> Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:21`]()


Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
### constructor
```ts
(type: Type, swarmKey: PublicKey, invitation: Uint8Array, identityKey: PublicKey, secret: Uint8Array) => InvitationDescriptor
```

## Properties
### identityKey 
> Type: `PublicKey`
<br/>
### invitation 
> Type: `Uint8Array`
<br/>
### secret 
> Type: `Uint8Array`
<br/>
### swarmKey 
> Type: `PublicKey`
<br/>
### type 
> Type: `Type`
<br/>
### hash
> Type: `string`
<br/>

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
(code: string) => InvitationDescriptor
```
### fromProto
```ts
(invitation: InvitationDescriptor) => InvitationDescriptor
```
### fromQueryParameters
```ts
(queryParameters: InvitationQueryParameters) => InvitationDescriptor
```