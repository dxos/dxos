# Class `Invitation`
> Declared in [`packages/sdk/client/src/packlets/api/invitation.ts:12`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L12)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### constructor
```ts
<T> (_descriptor: InvitationDescriptor, _invitationPromise: Promise<T>, _onAuthenticate: function) => Invitation<T>
```

## Properties
### _descriptor 
> Type: `InvitationDescriptor`
<br/>
### _invitationPromise 
> Type: `Promise<T>`
<br/>
### _onAuthenticate 
> Type: `function`
<br/>
### descriptor
> Type: `InvitationDescriptor`
<br/>

## Methods
### authenticate
```ts
(secret: Uint8Array) => void
```
### toJSON
```ts
() => InvitationDescriptor
```
### wait
```ts
() => Promise<T>
```
Wait for the invitation flow to complete.