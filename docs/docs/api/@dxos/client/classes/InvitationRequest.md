# Class `InvitationRequest`
Declared in [`packages/sdk/client/src/packlets/api/invitation-request.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L13)


Invitation created by sender.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L38)


Returns: [`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)

Arguments: 

`_descriptor`: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

`connected`: `Event<void>`

`finished`: `Event<void>`

`error`: `Event<Error>`

## Properties
### [`canceled`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L36)
Type: `Event<void>`
### [`connected`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L23)
Type: `Event<void>`

Fired when the remote peer connects.
### [`error`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L34)
Type: `Event<Error>`

Fired when there's an error in the invitation process.
### [`finished`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L28)
Type: `Event<void>`

Fired when the invitation process completes successfully.
### [`descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L53)
Type: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)
### [`hasConnected`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L64)
Type: `boolean`

True if the connected event has been fired.
### [`secret`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L57)
Type: `Uint8Array`

## Methods
### [`cancel`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L82)


Cancel the invitation.

Returns: `void`

Arguments: none
### [`toString`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L88)


Returns: `string`

Arguments: none
### [`wait`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-request.ts#L71)


Wait until connected.

Returns: `Promise<void>`

Arguments: 

`timeout`: `number`