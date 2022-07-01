import { WithTypeUrl } from "@dxos/codec-protobuf";
import { PublicKey } from "@dxos/crypto";
import { failUndefined } from "@dxos/debug";
import assert from "assert";
import { Credential, DecodedAny, KnownAny, Proof, TYPES } from "./proto";

/**
 * A credential with it's signatures verified.
 */
export class VerifiedCredential<T extends { '@type': keyof TYPES } = KnownAny> {
  constructor(
    private readonly _credential: Credential,
    private readonly _feedKey?: PublicKey,
  ) {}

  get claim(): T {
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

  assertType<T extends keyof TYPES>(type: T): asserts this is VerifiedCredential<DecodedAny<T>> {
    assert(this.claim['@type'] === type);
  }
}
