# Class `InvitationProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/invitation-proxy.ts:37`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L37)




## Constructors
### constructor
```ts
() => InvitationProxy
```

## Properties
### activeInvitations 
> Type: `InvitationRequest[]`
<br/>
### invitationsUpdate 
> Type: `Event<void>`
<br/>

## Methods
### _removeInvitation
```ts
(invitation: InvitationRequest) => void
```
### close
```ts
() => void
```
### createInvitationRequest
```ts
(__namedParameters: CreateInvitationRequestOpts) => Promise<InvitationRequest>
```
### handleInvitationRedemption
```ts
(__namedParameters: HandleInvitationRedemptionOpts) => HandleInvitationRedemptionResult
```