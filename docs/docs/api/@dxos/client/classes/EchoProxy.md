# Class `EchoProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L25)


Client proxy to local/remote ECHO service.

## Constructors
### constructor
```ts
(_serviceProvider: ClientServiceProvider, _modelFactory: ModelFactory, _haloProxy: HaloProxy) => EchoProxy
```

## Properties
### info
> Type: `object`
<br/>
### modelFactory
> Type: `ModelFactory`
<br/>
### networkManager
> Type: `any`
<br/>

## Methods
### acceptInvitation
```ts
(invitationDescriptor: InvitationDescriptor) => PartyInvitation
```
Joins an existing Party by invitation.

To be used with  `party.createInvitation`  on the inviter side.
### cloneParty
```ts
(snapshot: PartySnapshot) => Promise<Party>
```
Clones the party from a snapshot.
### createParty
```ts
() => Promise<Party>
```
Creates a new party.
### getParty
```ts
(partyKey: PublicKey) => undefined | Party
```
Returns an individual party by its key.
### queryParties
```ts
() => ResultSet<Party>
```
### registerModel
```ts
(constructor: ModelConstructor<any>) => EchoProxy
```
### toString
```ts
() => string
```