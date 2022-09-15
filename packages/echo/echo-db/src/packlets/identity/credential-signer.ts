import { TypedMessage } from "@dxos/echo-protocol"
import { Chain, createCredential, Credential } from "@dxos/halo-protocol"
import { Signer } from "@dxos/keyring"
import { PublicKey } from "@dxos/protocols"

export type CredentialSignerParams = {
  subject: PublicKey
  assertion: TypedMessage
  nonce?: Uint8Array
}

export type CredentialSigner = (params: CredentialSignerParams) => Promise<Credential>

/**
 * Issue credentials directly signed by the issuer.
 */
export const createKeyCredentialSigner = (signer: Signer, key: PublicKey): CredentialSigner => params => createCredential({
  issuer: key,
  keyring: signer,

  assertion: params.assertion as any,
  subject: params.subject
});

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createChainCredentialSigner = (signer: Signer, chain: Chain, signingKey: PublicKey): CredentialSigner => params => createCredential({
  issuer: signingKey,
  keyring: signer,
  signingKey,
  chain,

  assertion: params.assertion as any,
  subject: params.subject
});