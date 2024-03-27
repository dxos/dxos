# Type `InvitationStatus`
<sub>Declared in [packages/sdk/react-client/src/invitations/useInvitationStatus.ts:60](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L60)</sub>




## Properties
### [authCode](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L63)
Type: <code>string</code>




### [authMethod](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L64)
Type: <code>[Invitation.AuthMethod](/api/@dxos/react-client/enums#AuthMethod)</code>




### [error](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L69)
Type: <code>number</code>




### [haltedAt](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L67)
Type: <code>[Invitation.State](/api/@dxos/react-client/enums#State)</code>




### [id](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L61)
Type: <code>string</code>




### [invitationCode](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L62)
Type: <code>string</code>




### [result](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L68)
Type: <code>[InvitationResult](/api/@dxos/react-client/types/InvitationResult)</code>




### [status](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L66)
Type: <code>[Invitation.State](/api/@dxos/react-client/enums#State)</code>




### [type](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L65)
Type: <code>[Invitation.Type](/api/@dxos/react-client/enums#Type)</code>





## Methods
### [authenticate(authCode)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L73)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`authCode`: <code>string</code>



### [cancel()](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L70)




Returns: <code>void</code>

Arguments: none





### [connect(observable)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/invitations/useInvitationStatus.ts#L72)




Returns: <code>void</code>

Arguments: 

`observable`: <code>[CancellableInvitation](/api/@dxos/react-client/classes/CancellableInvitationObservable)</code>




