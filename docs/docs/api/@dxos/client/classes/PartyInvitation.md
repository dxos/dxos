# Class `PartyInvitation`
> Declared in [`packages/sdk/client/src/packlets/api/echo.ts:64`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L64)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
```ts
new PartyInvitation (_descriptor: InvitationDescriptor, _invitationPromise: Promise<Party>, _onAuthenticate: function) => PartyInvitation
```

## Properties
### `_descriptor: InvitationDescriptor`
### `_invitationPromise: Promise<Party>`
### `_onAuthenticate: function`
### `descriptor:  get InvitationDescriptor`

## Functions
```ts
authenticate (secret: Uint8Array) => void
```
```ts
getParty () => Promise<Party>
```
Wait for the invitation flow to complete and return the target party.
```ts
toJSON () => InvitationDescriptor
```
```ts
wait () => Promise<Party>
```
Wait for the invitation flow to complete.