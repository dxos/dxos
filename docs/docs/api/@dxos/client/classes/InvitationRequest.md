# Class `InvitationRequest`
> Declared in [`packages/sdk/client/src/packlets/api/invitation-request.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L13)


Invitation created by sender.

## Constructors
### constructor
```ts
(_descriptor: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor), connected: Event<void>, finished: Event<void>, error: Event<Error>) => [InvitationRequest](/api/@dxos/client/classes/InvitationRequest)
```

## Properties
### canceled 
Type: Event<void>
### connected 
Type: Event<void>

Fired when the remote peer connects.
### error 
Type: Event<Error>

Fired when there's an error in the invitation process.
### finished 
Type: Event<void>

Fired when the invitation process completes successfully.
### descriptor
Type: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor)
### hasConnected
Type: boolean

True if the connected event has been fired.
### secret
Type: Uint8Array

## Methods
### cancel
```ts
() => void
```
Cancel the invitation.
### toString
```ts
() => string
```
### wait
```ts
(timeout: number) => Promise<void>
```
Wait until connected.