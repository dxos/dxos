# Class `PartyInvitation`
> Declared in [`packages/sdk/client/src/packlets/api/echo.ts:64`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L64)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### constructor
```ts
(_descriptor: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor), _invitationPromise: Promise&lt;[Party](/api/@dxos/client/interfaces/Party)&gt;, _onAuthenticate: function) => [PartyInvitation](/api/@dxos/client/classes/PartyInvitation)
```

## Properties
### _descriptor 
Type: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
### _invitationPromise 
Type: Promise&lt;[Party](/api/@dxos/client/interfaces/Party)&gt;
### _onAuthenticate 
Type: function
### descriptor
Type: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)

## Methods
### authenticate
```ts
(secret: Uint8Array) => void
```
### getParty
```ts
() => Promise&lt;[Party](/api/@dxos/client/interfaces/Party)&gt;
```
Wait for the invitation flow to complete and return the target party.
### toJSON
```ts
() => InvitationDescriptor
```
### wait
```ts
() => Promise&lt;[Party](/api/@dxos/client/interfaces/Party)&gt;
```
Wait for the invitation flow to complete.