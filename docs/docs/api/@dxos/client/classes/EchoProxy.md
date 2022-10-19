# Class `EchoProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L25)


Client proxy to local/remote ECHO service.

## Constructors
```ts
new EchoProxy (_serviceProvider: ClientServiceProvider, _modelFactory: ModelFactory, _haloProxy: HaloProxy) => EchoProxy
```

## Properties
### `info:  get object`
### `modelFactory:  get ModelFactory`
### `networkManager:  get any`

## Functions
```ts
acceptInvitation (invitationDescriptor: InvitationDescriptor) => PartyInvitation
```
Joins an existing Party by invitation.

To be used with  `party.createInvitation`  on the inviter side.
```ts
cloneParty (snapshot: PartySnapshot) => Promise<Party>
```
Clones the party from a snapshot.
```ts
createParty () => Promise<Party>
```
Creates a new party.
```ts
getParty (partyKey: PublicKey) => undefined | Party
```
Returns an individual party by its key.
```ts
queryParties () => ResultSet<Party>
```
```ts
registerModel (constructor: ModelConstructor<any>) => EchoProxy
```
```ts
toString () => string
```