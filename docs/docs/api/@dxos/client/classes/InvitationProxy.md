# Class `InvitationProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/invitation-proxy.ts:37`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L37)




## Constructors
### [`constructor`]()


Returns: [`InvitationProxy`](/api/@dxos/client/classes/InvitationProxy)

Arguments: none

## Properties
### [`activeInvitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L38)
Type: [`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)`[]`
### [`invitationsUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L39)
Type: `Event<void>`

## Methods
### [`_removeInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L97)


Returns: `void`

Arguments: 

`invitation`: [`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L43)


Returns: `void`

Arguments: none
### [`createInvitationRequest`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L47)


Returns: `Promise<`[`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)`>`

Arguments: 

`__namedParameters`: [`CreateInvitationRequestOpts`](/api/@dxos/client/interfaces/CreateInvitationRequestOpts)
### [`handleInvitationRedemption`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L103)


Returns: [`HandleInvitationRedemptionResult`](/api/@dxos/client/interfaces/HandleInvitationRedemptionResult)

Arguments: 

`__namedParameters`: [`HandleInvitationRedemptionOpts`](/api/@dxos/client/interfaces/HandleInvitationRedemptionOpts)