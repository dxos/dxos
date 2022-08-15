import { Keyring } from "@dxos/credentials";
import { PublicKey } from "@dxos/protocols";
import { Chain, Credential } from "./proto";
import { getSignData } from "./signing";

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult =
  | { kind: 'pass' }
  | { kind: 'fail', errors: string[] }

export async function verifyCredential(credential: Credential): Promise<VerificationResult> {
  if(!credential.issuer.equals(credential.proof.signer)) {
    return { kind: 'fail', errors: ['Chain credentials are not yet supported'] }
  }

  {
    const result = await verifySignature(credential)
    if(result.kind === 'fail') {
      return result;
    }
  }

  return { kind: 'pass' }
}

/**
 * Verifies that the signature is valid and was made by the signer.
 * Does not validate other semantics (e.g. chains).
 */
async function verifySignature(credential: Credential): Promise<VerificationResult> {
  if(credential.proof.type !== SIGNATURE_TYPE_ED25519) {
    return { kind: 'fail', errors: [`Invalid signature type: ${credential.proof.type}`] }
  }
  
  const signData = getSignData(credential);
  if(!Keyring.cryptoVerify(Buffer.from(signData), Buffer.from(credential.proof.value), credential.proof.signer.asBuffer())) {
    return { kind: 'fail', errors: [`Invalid signature`] }
  }

  return { kind: 'pass' }
}