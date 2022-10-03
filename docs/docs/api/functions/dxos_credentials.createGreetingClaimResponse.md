# Function: createGreetingClaimResponse

[@dxos/credentials](../modules/dxos_credentials.md).createGreetingClaimResponse

**createGreetingClaimResponse**(`id`, `rendezvousKey`): `WithTypeUrl`<`ClaimResponse`\>

Crate a Greeting ClaimResponse message.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `id` | `Buffer` | The ID of the new invitation. |
| `rendezvousKey` | `Buffer` | The swarm key to use for Greeting. |

#### Returns

`WithTypeUrl`<`ClaimResponse`\>

#### Defined in

[packages/halo/credentials/src/greet/greeting-message.ts:91](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/greet/greeting-message.ts#L91)
