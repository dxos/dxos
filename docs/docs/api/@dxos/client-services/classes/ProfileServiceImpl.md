# Class `ProfileServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/deprecated/profile.ts:31`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L31)


Profile service implementation.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L34)


Returns: [`ProfileServiceImpl`](/api/@dxos/client-services/classes/ProfileServiceImpl)

Arguments: 

`context`: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

## Properties


## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L95)


Returns: `Stream<RedeemedInvitation>`

Arguments: 

`invitation`: `Invitation`
### [`authenticateInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L131)


Returns: `Promise<void>`

Arguments: 

`request`: `AuthenticateInvitationRequest`
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L69)


Returns: `Stream<InvitationRequest>`

Arguments: none
### [`createProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L52)


Returns: `Promise<Profile>`

Arguments: 

`request`: `CreateProfileRequest`
### [`recoverProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L57)


Returns: `Promise<Profile>`

Arguments: 

`request`: `RecoverProfileRequest`
### [`subscribeProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L36)


Returns: `Stream<SubscribeProfileResponse>`

Arguments: none