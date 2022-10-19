# Class `HaloInvitations`
> Declared in [`packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts`]()

Create and process Halo (space) invitations for device management.

## Constructors
```ts
new HaloInvitations (_networkManager: NetworkManager, _identityManager: IdentityManager, _onInitialize: function) => HaloInvitations
```

## Properties


## Functions
```ts
acceptInvitation (invitationDescriptor: InvitationDescriptor) => Promise<Identity>
```
Joins an existing identity HALO by invitation.
```ts
createInvitation (__namedParameters: object) => Promise<InvitationDescriptor>
```
Create an invitation to an exiting identity HALO.