# Class `InvitationRequest`
> Declared in [`packages/sdk/client/src/packlets/api/invitation-request.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L13)


Invitation created by sender.

## Constructors
### constructor
```ts
(_descriptor: InvitationDescriptor, connected: Event<void>, finished: Event<void>, error: Event<Error>) => InvitationRequest
```

## Properties
### canceled 
> Type: `Event<void>`
<br/>
### connected 
> Type: `Event<void>`
<br/>

Fired when the remote peer connects.
### error 
> Type: `Event<Error>`
<br/>

Fired when there's an error in the invitation process.
### finished 
> Type: `Event<void>`
<br/>

Fired when the invitation process completes successfully.
### descriptor
> Type: `InvitationDescriptor`
<br/>
### hasConnected
> Type: `boolean`
<br/>

True if the connected event has been fired.
### secret
> Type: `Uint8Array`
<br/>

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