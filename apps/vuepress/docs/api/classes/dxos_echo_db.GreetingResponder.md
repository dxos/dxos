# Class: GreetingResponder

[@dxos/echo-db](../modules/dxos_echo_db.md).GreetingResponder

Listens for greeting connections from invitees for a specific invitation specified by an invitation descriptor.
Upon successful greeting, the peer is admitted into the Party specified in the invitation descriptor.

## Constructors

### constructor

**new GreetingResponder**(`_networkManager`, `_partyProcessor`, `_genesisFeedKey`, `_credentialsSigner`, `_credentialsWriter`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_partyProcessor` | [`PartyStateProvider`](../interfaces/dxos_echo_db.PartyStateProvider.md) |
| `_genesisFeedKey` | `PublicKey` |
| `_credentialsSigner` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |
| `_credentialsWriter` | `FeedWriter`<`Message`\> |

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:59](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L59)

## Properties

### \_greeter

 `Private` `Readonly` **\_greeter**: `Greeter`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:50](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L50)

___

### \_greeterPlugin

 `Private` `Readonly` **\_greeterPlugin**: `GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:48](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L48)

___

### \_state

 `Private` **\_state**: [`GreetingState`](../enums/dxos_echo_db.GreetingState.md) = `GreetingState.INITIALIZED`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:52](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L52)

___

### \_swarmKey

 `Private` `Readonly` **\_swarmKey**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:49](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L49)

___

### connected

 `Readonly` **connected**: `Event`<`any`\>

Param: Invitation id

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:57](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L57)

## Accessors

### state

`get` **state**(): [`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

Accessor for UI to display status to the user.
Return the current state for this Greeting Responder (waiting, peer connected, successful auth, auth failed, etc.)

#### Returns

[`GreetingState`](../enums/dxos_echo_db.GreetingState.md)

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:80](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L80)

## Methods

### \_writeCredentialsToParty

`Private` **_writeCredentialsToParty**(`messages`): `Promise`<`Message`[]\>

Callback which writes the Invitee's messages to the Party, signed by our key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `messages` | `any`[] |

#### Returns

`Promise`<`Message`[]\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:197](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L197)

___

### destroy

**destroy**(): `Promise`<`void`\>

Call to clean up. Subsequent calls to any method have undefined results.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:184](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L184)

___

### invite

**invite**(`secretValidator`, `secretProvider?`, `onFinish?`, `expiration?`): `Promise`<`Buffer`\>

Listen for connections from invitee peers.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `secretValidator` | `SecretValidator` |  |
| `secretProvider?` | `SecretProvider` |  |
| `onFinish?` | (`__namedParameters`: { `expired?`: `boolean`  }) => `void` | A function to be called when the invitation is closed (successfully or not). |
| `expiration?` | `number` | Date.now()-style timestamp of when this invitation should expire. |

#### Returns

`Promise`<`Buffer`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:92](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L92)

___

### start

**start**(): `Promise`<`Uint8Array`\>

Start listening for connections.

#### Returns

`Promise`<`Uint8Array`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:147](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L147)

___

### stop

**stop**(): `Promise`<`void`\>

Stop listening for connections. Until destroy() is called, getState() continues to work.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-responder.ts:171](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-responder.ts#L171)
