# Class `InvitationDescriptor`
> Declared in [`packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L38)

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors
```ts
new InvitationDescriptor(
type: Type,
swarmKey: PublicKey,
invitation: Uint8Array,
identityKey: PublicKey,
secret: Uint8Array
)
```

---
- InvitationDescriptor : Class
- constructor : Constructor
- new InvitationDescriptor : Constructor signature
- type : Parameter
- swarmKey : Parameter
- invitation : Parameter
- identityKey : Parameter
- secret : Parameter
- identityKey : Property
- invitation : Property
- secret : Property
- swarmKey : Property
- type : Property
- hash : Accessor
- hash : Get signature
- encode : Method
- encode : Call signature
- toProto : Method
- toProto : Call signature
- toQueryParameters : Method
- toQueryParameters : Call signature
- decode : Method
- decode : Call signature
- code : Parameter
- fromProto : Method
- fromProto : Call signature
- invitation : Parameter
- fromQueryParameters : Method
- fromQueryParameters : Call signature
- queryParameters : Parameter
