# Class `InvitationChallenge`
Declared in [`packages/sdk/client/src/packlets/api/invitation-challenge.ts:11`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L11)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L12)


Returns: [`InvitationChallenge`](/api/@dxos/client/classes/InvitationChallenge)`<T>`

Arguments: 

`_descriptor`: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

`_invitationPromise`: `Promise<T>`

`_onAuthenticate`: `function`

## Properties
### [`_descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L13)
Type: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)
### [`_invitationPromise`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L14)
Type: `Promise<T>`
### [`_onAuthenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L15)
Type: `function`
### [`descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L22)
Type: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

## Methods
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L27)


Returns: `void`

Arguments: 

`secret`: `Uint8Array`
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L18)


Returns: `any`

Arguments: none
### [`wait`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L34)


Wait for the invitation flow to complete.

Returns: `Promise<T>`

Arguments: none