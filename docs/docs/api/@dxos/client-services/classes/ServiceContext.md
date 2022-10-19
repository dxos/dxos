# Class `ServiceContext`
> Declared in [`packages/sdk/client-services/src/packlets/services/service-context.ts`]()



## Constructors
```ts
new ServiceContext (storage: Storage, networkManager: NetworkManager, modelFactory: ModelFactory) => ServiceContext
```

## Properties
### `dataInvitations: DataInvitations`
### `dataService: DataService`
### `feedStore: FeedStore`
### `haloInvitations: HaloInvitations`
### `identityManager: IdentityManager`
### `initialized: Trigger`
### `keyring: Keyring`
### `metadataStore: MetadataStore`
### `modelFactory: ModelFactory`
### `networkManager: NetworkManager`
### `spaceManager: SpaceManager`
### `storage: Storage`

## Functions
```ts
close () => Promise<void>
```
```ts
createIdentity () => Promise<Identity>
```
```ts
createInvitation (spaceKey: PublicKey, onFinish: function) => Promise<InvitationDescriptor>
```
```ts
joinSpace (invitationDescriptor: InvitationDescriptor) => Promise<Space>
```
```ts
open () => Promise<void>
```