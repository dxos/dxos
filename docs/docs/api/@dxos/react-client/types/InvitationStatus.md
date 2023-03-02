# Type `InvitationStatus`
<sub>Declared in [packages/sdk/react-client/src/invitations/useInvitationStatus.ts:62](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L62)</sub>




## Properties
### [authMethod](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L66)
Type: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)["authMethod"]</code>

### [authenticationCode](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L65)
Type: <code>string</code>

### [error](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L70)
Type: <code>number</code>

### [haltedAt](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L68)
Type: <code>[Invitation.State](/api/@dxos/react-client/enums#State)</code>

### [id](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L63)
Type: <code>string</code>

### [invitationCode](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L64)
Type: <code>string</code>

### [result](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L69)
Type: <code>[InvitationResult](/api/@dxos/react-client/types/InvitationResult)</code>

### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L67)
Type: <code>[Invitation.State](/api/@dxos/react-client/enums#State)</code>

## Methods
### [authenticate(authenticationCode)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L73)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authenticationCode`: <code>string</code>

### [cancel()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L71)


Returns: <code>void</code>

Arguments: none

### [connect(observable)](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L72)


Returns: <code>void</code>

Arguments: 

`observable`: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>