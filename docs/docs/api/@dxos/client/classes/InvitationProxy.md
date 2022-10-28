# Class `InvitationProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/invitation-proxy.ts:37`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L37)




## Constructors
### constructor
```ts
() => [InvitationProxy](/api/@dxos/client/classes/InvitationProxy)
```

## Properties
### activeInvitations 
Type: [InvitationRequest](/api/@dxos/client/classes/InvitationRequest)[]
### invitationsUpdate 
Type: Event&lt;void&gt;

## Methods
### _removeInvitation
```ts
(invitation: [InvitationRequest](/api/@dxos/client/classes/InvitationRequest)) => void
```
### close
```ts
() => void
```
### createInvitationRequest
```ts
(__namedParameters: [CreateInvitationRequestOpts](/api/@dxos/client/interfaces/CreateInvitationRequestOpts)) => Promise&lt;[InvitationRequest](/api/@dxos/client/classes/InvitationRequest)&gt;
```
### handleInvitationRedemption
```ts
(__namedParameters: [HandleInvitationRedemptionOpts](/api/@dxos/client/interfaces/HandleInvitationRedemptionOpts)) => [HandleInvitationRedemptionResult](/api/@dxos/client/interfaces/HandleInvitationRedemptionResult)
```