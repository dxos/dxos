import { PublicKey, verify } from "@dxos/crypto";
import { failUndefined } from "@dxos/debug";
import { assert } from "console";
import { AuthChallenge, AuthResponse, Credential, Proof, SignedData } from "./proto";
import { isAdmittedMember } from "./state/members-state";
import { createPartyState, isPartyMemberIdentityOrDevice, isAdmittedMemberWithDevice, PartyState, processPartyCredential } from "./state/party-state";
import { VerifiedCredential } from "./verified-credential";
import debug from 'debug'
import { verifyProof } from "./crypto";
import { FeedInfo } from "./state/feed-state";

const log = debug('dxos:halo-protocol:party-state-manager')

export class PartyStateManager {
  private _state: PartyState;

  constructor(partyKey: PublicKey) {
    this._state = createPartyState(partyKey);
  }

  async processCredential(credential: Credential) {
    const verifiedCredential = await this._verifyCredential(credential);

    this._state = processPartyCredential(this._state, verifiedCredential);
  }

  async authenticate(challenge: AuthChallenge, response: AuthResponse) {
    // TODO(dmaretskyi): Verify signatures.
    const auth: VerifiedCredential = await this._verifyCredential(response.auth ?? failUndefined());
    auth.assertType('dxos.halo.credentials.AuthClaim');

    // Must be signed by the device
    const proof = auth.findProof(signer => signer.equals(auth.claim.device ?? failUndefined()))
    if(!proof) {
      return false
    }

    // Must have correct challenge
    if(!Buffer.from(proof?.nonce ?? failUndefined()).equals(challenge.nonce ?? failUndefined())) {
      return false
    }

    // Validate party membership.
    const state = await this._getDerivedState(response.supporting ?? [])
    if(!isAdmittedMemberWithDevice(state, auth.claim.identity ?? failUndefined(), auth.claim.device ?? failUndefined())) {
      return false
    }
    
    return true
  }

  isAdmittedMember(identity: PublicKey) {
    return isAdmittedMember(this._state.members, identity)
  }

  isAdmittedMemberWithDevice(identity: PublicKey, device: PublicKey) {
    return isAdmittedMemberWithDevice(this._state, identity, device)
  }

  getFeeds(): FeedInfo[] {
    return this._state.feeds.feeds
  }

  private async _verifyCredential(credential: Credential): Promise<VerifiedCredential> {
    const validProofs: Proof[] = []
    for(const proof of credential.proofs ?? []) {
      if(await verifyProof(credential, proof)) {
        validProofs.push(proof)
      } else {
        log(`Invalid proof by key: ${proof.signer}`)
      }
    }

    return new VerifiedCredential({
      ...credential,
      proofs: validProofs,
    });
  }

  /**
   * Calculates party state after processing a set of credentials.
   */
  private async _getDerivedState(credentials: Credential[]): Promise<PartyState> {
    let state = this._state;
    for(const credential of credentials) {
      const verifiedCredential = await this._verifyCredential(credential);
      state = processPartyCredential(state, verifiedCredential)
    }
    return state
  }
}
