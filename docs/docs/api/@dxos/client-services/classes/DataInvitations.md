# Class `DataInvitations`
> Declared in [`packages/sdk/client-services/src/packlets/invitations/data-invitations.ts`]()

Create and manage data invitations for Data spaces.

## Constructors
```ts
new DataInvitations (_networkManager: NetworkManager, _signingContext: SigningContext, _spaceManager: SpaceManager) => DataInvitations
```

## Properties


## Functions
```ts
acceptInvitation (invitationDescriptor: InvitationDescriptor) => Promise<Space>
```
Joins an existing identity HALO by invitation.
```ts
createInvitation (space: Space, __namedParameters: object) => Promise<InvitationDescriptor>
```
Create an invitation to an exiting identity HALO.