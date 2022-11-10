# Class `PartyServiceImpl`
Declared in [`packages/sdk/client-services/src/packlets/deprecated/party.ts:34`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L34)


Party service implementation.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L37)


Returns: [`PartyServiceImpl`](/api/@dxos/client-services/classes/PartyServiceImpl)

Arguments: 

`serviceContext`: [`ServiceContext`](/api/@dxos/client-services/classes/ServiceContext)

## Properties


## Methods
### [`authenticateInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L199)


Returns: `Promise<void>`

Arguments: 

`request`: `AuthenticateInvitationRequest`
### [`cloneParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L158)


Returns: `Promise<Party>`

Arguments: 

`snapshot`: `PartySnapshot`
### [`createParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L148)


Returns: `Promise<Party>`

Arguments: none
### [`createSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L239)


Returns: `Promise<PartySnapshot>`

Arguments: 

`request`: `CreateSnapshotRequest`
### [`getPartyDetails`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L140)


Returns: `Promise<PartyDetails>`

Arguments: 

`request`: `GetPartyDetailsRequest`
### [`setPartyState`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L168)


Returns: `Promise<never>`

Arguments: 

`request`: `SetPartyStateRequest`
### [`subscribeMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L210)


Returns: `Stream<SubscribeMembersResponse>`

Arguments: 

`request`: `SubscribeMembersRequest`
### [`subscribeParties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L94)


Returns: `Stream<SubscribePartiesResponse>`

Arguments: none
### [`subscribeToParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/deprecated/party.ts#L39)


Returns: `Stream<SubscribePartyResponse>`

Arguments: 

`request`: `SubscribePartyRequest`