# Function: verifyCredentialSignature

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).verifyCredentialSignature

**verifyCredentialSignature**(`credential`): `Promise`<[`VerificationResult`](../types/dxos_halo_protocol.VerificationResult.md)\>

Verifies that the signature is valid and was made by the signer.
Does not validate other semantics (e.g. chains).

#### Parameters

| Name | Type |
| :------ | :------ |
| `credential` | `Credential` |

#### Returns

`Promise`<[`VerificationResult`](../types/dxos_halo_protocol.VerificationResult.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/verifier.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/verifier.ts#L42)
