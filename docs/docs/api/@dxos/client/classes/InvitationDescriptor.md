# Class `InvitationDescriptor`
> Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:21`]()


Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
```ts
new InvitationDescriptor (type: Type, swarmKey: PublicKey, invitation: Uint8Array, identityKey: PublicKey, secret: Uint8Array) => InvitationDescriptor
```

## Properties
### `identityKey: PublicKey`
### `invitation: Uint8Array`
### `secret: Uint8Array`
### `swarmKey: PublicKey`
### `type: Type`
### `hash:  get string`

## Functions
```ts
encode () => string
```
```ts
toProto () => InvitationDescriptor
```
```ts
toQueryParameters () => InvitationQueryParameters
```
Exports an InvitationDescriptor to an object suitable for use as query parameters.
```ts
decode (code: string) => InvitationDescriptor
```
```ts
fromProto (invitation: InvitationDescriptor) => InvitationDescriptor
```
```ts
fromQueryParameters (queryParameters: InvitationQueryParameters) => InvitationDescriptor
```