# Class `InvitationRequest`
> Declared in [`packages/sdk/client/src/packlets/api/invitation-request.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L13)


Invitation created by sender.

## Constructors
```ts
new InvitationRequest (_descriptor: InvitationDescriptor, connected: Event<void>, finished: Event<void>, error: Event<Error>) => InvitationRequest
```

## Properties
### `canceled: Event<void>`
### `connected: Event<void>`
Fired when the remote peer connects.
### `error: Event<Error>`
Fired when there's an error in the invitation process.
### `finished: Event<void>`
Fired when the invitation process completes successfully.
### `descriptor:  get InvitationDescriptor`
### `hasConnected:  get boolean`
True if the connected event has been fired.
### `secret:  get Uint8Array`

## Functions
```ts
cancel () => void
```
Cancel the invitation.
```ts
toString () => string
```
```ts
wait (timeout: number) => Promise<void>
```
Wait until connected.