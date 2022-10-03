# Function: verifyChain

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).verifyChain

**verifyChain**(`chain`, `authority`, `subject`): `Promise`<[`VerificationResult`](../types/dxos_halo_protocol.VerificationResult.md)\>

Verifies the the signer has the delegated authority to create credentials on the half of the issuer.

#### Parameters

| Name | Type |
| :------ | :------ |
| `chain` | `Chain` |
| `authority` | `PublicKey` |
| `subject` | `PublicKey` |

#### Returns

`Promise`<[`VerificationResult`](../types/dxos_halo_protocol.VerificationResult.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/verifier.ts:58](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/verifier.ts#L58)
