# Class `InvitationRequest`
> Declared in [`packages/sdk/client/src/packlets/api/invitation-request.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L13)


Invitation created by sender.

## Constructors
### constructor
```ts
(_descriptor: [InvitationDescriptor](/api/@dxos/client/classes/InvitationDescriptor), connected: Event&lt;void&gt;, finished: Event&lt;void&gt;, error: Event&lt;Error&gt;) => [InvitationRequest](/api/@dxos/client/classes/InvitationRequest)
```

## Properties
### canceled 
Type: Event&lt;void&gt;
### connected 
Type: Event&lt;void&gt;

Fired when the remote peer connects.
### error 
Type: Event&lt;Error&gt;

Fired when there's an error in the invitation process.
### finished 
Type: Event&lt;void&gt;

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
(timeout: number) => Promise&lt;void&gt;
```
Wait until connected.