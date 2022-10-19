# Class `IdentityManager`
> Declared in [`packages/sdk/client-services/src/packlets/identity/identity-manager.ts`]()



## Constructors
```ts
new IdentityManager (_metadataStore: MetadataStore, _feedStore: FeedStore, _keyring: Keyring, _networkManager: NetworkManager, _modelFactory: ModelFactory) => IdentityManager
```

## Properties
### `stateUpdate: Event<void>`

## Functions
```ts
acceptIdentity (params: JoinIdentityParams) => Promise<Identity>
```
Accept an existing identity. Expects it's device key to be authorized.
```ts
close () => Promise<void>
```
```ts
createIdentity () => Promise<Identity>
```
```ts
open () => Promise<void>
```