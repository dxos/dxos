# Class `Invitation`
> Declared in [`packages/sdk/client/src/packlets/api/invitation.ts`]()

Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
```ts
new Invitation <T> (_descriptor: InvitationDescriptor, _invitationPromise: Promise<T>, _onAuthenticate: function) => Invitation<T>
```

## Properties
### `_descriptor: InvitationDescriptor`
### `_invitationPromise: Promise<T>`
### `_onAuthenticate: function`

## Functions
```ts
authenticate (secret: Uint8Array) => void
```
```ts
toJSON () => InvitationDescriptor
```
```ts
wait () => Promise<T>
```
Wait for the invitation flow to complete.