import { WithTypeUrl } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { failUndefined } from "@dxos/debug";
import { Credential, KnownAny, Proof, TYPES } from "./proto";

/**
 * A credential with it's signatures verified.
 */
export class VerifiedCredential {
  constructor(
    private readonly _credential: Credential,
    private readonly _feedKey?: PublicKey,
  ) {}

  get claim(): KnownAny {
    return this._credential.claim;
  }

  /**
   * Feed where this credential was written to.
   */
  get feedKey(): PublicKey | undefined {
    return this._feedKey;
  }

  findProof(matches: (signer: PublicKey) => boolean): Proof | undefined {
    return this._credential.proofs?.find(proof => matches(proof.signer ?? failUndefined()))
  }
}
