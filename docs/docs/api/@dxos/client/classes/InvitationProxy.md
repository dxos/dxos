# Class `InvitationProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/invitation-proxy.ts:37`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/invitation-proxy.ts#L37)




## Constructors
```ts
new InvitationProxy () => InvitationProxy
```

## Properties
### `activeInvitations: InvitationRequest[]`
### `invitationsUpdate: Event<void>`

## Functions
```ts
_removeInvitation (invitation: InvitationRequest) => void
```
```ts
close () => void
```
```ts
createInvitationRequest (__namedParameters: CreateInvitationRequestOpts) => Promise<InvitationRequest>
```
```ts
handleInvitationRedemption (__namedParameters: HandleInvitationRedemptionOpts) => HandleInvitationRedemptionResult
```