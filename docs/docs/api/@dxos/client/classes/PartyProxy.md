# Class `PartyProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/party-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L25)


Main public Party API.
Proxies requests to local/remove services.

## Constructors


## Properties
### `database:  get Database`
### `invitationProxy:  get InvitationProxy`
### `isActive:  get boolean`
### `isOpen:  get boolean`
### `key:  get PublicKey`
### `properties:  get ObjectProperties`
TODO: Currently broken.
### `reduce:  get function`
Returns a selection context, which can be used to traverse the object graph.
### `select:  get function`
Returns a selection context, which can be used to traverse the object graph.

## Functions
```ts
_setOpen (open: boolean) => Promise<void>
```
```ts
close () => Promise<void>
```
```ts
createInvitation (inviteeKey: CreationInvitationOptions) => Promise<InvitationRequest>
```
Creates an invitation to a given party.
The Invitation flow requires the inviter and invitee to be online at the same time.
If the invitee is known ahead of time,  `invitee_key`  can be provide to not require the secret exchange.
The invitation flow is protected by a generated pin code.

To be used with  `client.echo.acceptInvitation`  on the invitee side.
```ts
createSnapshot () => Promise<PartySnapshot>
```
Implementation method.
```ts
destroy () => Promise<void>
```
Called by EchoProxy close.
```ts
getDetails () => Promise<PartyDetails>
```
```ts
getProperty (key: string, defaultValue: any) => any
```
```ts
getTitle () => never
```
```ts
initialize () => Promise<void>
```
Called by EchoProxy open.
```ts
open () => Promise<void>
```
```ts
queryMembers () => ResultSet<PartyMember>
```
Return set of party members.
```ts
setActive (active: boolean, options: any) => Promise<void>
```
```ts
setProperty (key: string, value: any) => Promise<void>
```
```ts
setTitle (title: string) => Promise<void>
```