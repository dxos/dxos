# Class `ProfileServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/deprecated/profile.ts:22`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L22)


Profile service implementation.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L25)


Returns: [`ProfileServiceImpl`](/api/@dxos/client-services/classes/ProfileServiceImpl)

Arguments: 

`context`: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

## Properties


## Methods
### [`createProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L43)


Returns: `Promise<Profile>`

Arguments: 

`request`: `CreateProfileRequest`
### [`recoverProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L48)


Returns: `Promise<Profile>`

Arguments: 

`request`: `RecoverProfileRequest`
### [`subscribeProfile`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/profile.ts#L27)


Returns: `Stream<SubscribeProfileResponse>`

Arguments: none