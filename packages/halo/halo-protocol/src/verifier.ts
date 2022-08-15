import { Credential } from "./proto";

export const SIGNATURE_TYPE_ED25519 = 'ED25519Signature';

export type VerificationResult =
  | { kind: 'pass' }
  | { kind: 'fail', errors: string[] }

export async function verifyCredential(credential: Credential): Promise<VerificationResult> {

  return { kind: 'pass' }
}
