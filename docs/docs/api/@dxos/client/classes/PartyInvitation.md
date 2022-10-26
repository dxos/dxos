# Class `PartyInvitation`
> Declared in [`packages/sdk/client/src/packlets/api/echo.ts:64`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L64)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### constructor
```ts
(_descriptor: InvitationDescriptor, _invitationPromise: Promise<Party>, _onAuthenticate: function) => PartyInvitation
```

## Properties
### _descriptor 
> Type: `InvitationDescriptor`
<br/>
### _invitationPromise 
> Type: `Promise<Party>`
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
### getParty
```ts
() => Promise<Party>
```
Wait for the invitation flow to complete and return the target party.
### toJSON
```ts
() => InvitationDescriptor
```
### wait
```ts
() => Promise<Party>
```
Wait for the invitation flow to complete.