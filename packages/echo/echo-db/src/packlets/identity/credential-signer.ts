import { TypedMessage } from "@dxos/echo-protocol"
import { Chain, createCredential, Credential, MessageType } from "@dxos/halo-protocol"
import { Signer } from "@dxos/keyring"
import { PublicKey } from "@dxos/protocols"

export type CredentialSignerParams = {
  subject: PublicKey
  assertion: MessageType
  nonce?: Uint8Array
}

export interface CredentialSigner {
  getIssuer(): PublicKey
  createCredential: (params: CredentialSignerParams) => Promise<Credential>
}

/**
 * Issue credentials directly signed by the issuer.
 */
export const createKeyCredentialSigner = (signer: Signer, key: PublicKey): CredentialSigner => ({
  getIssuer: () => key,
  createCredential: params => createCredential({
    issuer: key,
    keyring: signer,

    subject: params.subject,
    assertion: params.assertion as any,
    
    nonce: params.nonce,
  }),
})

/**
 * Issue credentials with transitive proof via a chain.
 */
export const createChainCredentialSigner = (signer: Signer, chain: Chain, signingKey: PublicKey): CredentialSigner => ({
  getIssuer: () => chain.credential.issuer,
  createCredential: params => createCredential({
    issuer: chain.credential.issuer,
    keyring: signer,
    signingKey,
    chain,

    subject: params.subject,
    assertion: params.assertion as any,

    nonce: params.nonce,
  })
})