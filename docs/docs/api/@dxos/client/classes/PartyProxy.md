# Class `PartyProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/party-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L25)


Main public Party API.
Proxies requests to local/remove services.

## Constructors


## Properties
### database
Type: [Database](/api/@dxos/client/classes/Database)
### invitationProxy
Type: [InvitationProxy](/api/@dxos/client/classes/InvitationProxy)
### isActive
Type: boolean
### isOpen
Type: boolean
### key
Type: [PublicKey](/api/@dxos/client/classes/PublicKey)
### properties
Type: ObjectProperties

TODO: Currently broken.
### reduce
Type: function

Returns a selection context, which can be used to traverse the object graph.
### select
Type: function

Returns a selection context, which can be used to traverse the object graph.

## Methods
### _setOpen
```ts
(open: boolean) => Promise<void>
```
### close
```ts
() => Promise<void>
```
### createInvitation
```ts
(inviteeKey: [CreationInvitationOptions](/api/@dxos/client/interfaces/CreationInvitationOptions)) => Promise<[InvitationRequest](/api/@dxos/client/classes/InvitationRequest)>
```
Creates an invitation to a given party.
The Invitation flow requires the inviter and invitee to be online at the same time.
If the invitee is known ahead of time,  `invitee_key`  can be provide to not require the secret exchange.
The invitation flow is protected by a generated pin code.

To be used with  `client.echo.acceptInvitation`  on the invitee side.
### createSnapshot
```ts
() => Promise<PartySnapshot>
```
Implementation method.
### destroy
```ts
() => Promise<void>
```
Called by EchoProxy close.
### getDetails
```ts
() => Promise<PartyDetails>
```
### getProperty
```ts
(key: string, defaultValue: any) => any
```
### getTitle
```ts
() => never
```
### initialize
```ts
() => Promise<void>
```
Called by EchoProxy open.
### open
```ts
() => Promise<void>
```
### queryMembers
```ts
() => [ResultSet](/api/@dxos/client/classes/ResultSet)<PartyMember>
```
Return set of party members.
### setActive
```ts
(active: boolean, options: any) => Promise<void>
```
### setProperty
```ts
(key: string, value: any) => Promise<void>
```
### setTitle
```ts
(title: string) => Promise<void>
```