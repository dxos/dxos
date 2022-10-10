# Class `InvitationDescriptor`
> Declared in [`packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts`](undefined)

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
```ts
const newInvitationDescriptor = new InvitationDescriptor(
type: Type,
swarmKey: PublicKey,
invitation: Uint8Array,
identityKey: PublicKey,
secret: Uint8Array
)
```

## Properties

## Functions
