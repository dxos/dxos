# Class `EchoProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L25)


Client proxy to local/remote ECHO service.

## Constructors
### constructor
```ts
(_serviceProvider: ClientServiceProvider, _modelFactory: ModelFactory, _haloProxy: [HaloProxy](/api/@dxos/client/classes/HaloProxy)) => [EchoProxy](/api/@dxos/client/classes/EchoProxy)
```

## Properties
### info
Type: object
### modelFactory
Type: ModelFactory
### networkManager
Type: any

## Methods
### acceptInvitation
```ts
(invitationDescriptor: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)) => [PartyInvitation](/api/@dxos/client/classes/PartyInvitation)
```
Joins an existing Party by invitation.

To be used with  `party.createInvitation`  on the inviter side.
### cloneParty
```ts
(snapshot: PartySnapshot) => Promise<[Party](/api/@dxos/client/interfaces/Party)>
```
Clones the party from a snapshot.
### createParty
```ts
() => Promise<[Party](/api/@dxos/client/interfaces/Party)>
```
Creates a new party.
### getParty
```ts
(partyKey: [PublicKey](/api/@dxos/client/classes/PublicKey)) => undefined | [Party](/api/@dxos/client/interfaces/Party)
```
Returns an individual party by its key.
### queryParties
```ts
() => [ResultSet](/api/@dxos/client/classes/ResultSet)<[Party](/api/@dxos/client/interfaces/Party)>
```
### registerModel
```ts
(constructor: ModelConstructor<any>) => [EchoProxy](/api/@dxos/client/classes/EchoProxy)
```
### toString
```ts
() => string
```