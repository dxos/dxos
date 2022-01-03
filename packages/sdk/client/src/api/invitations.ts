import { InvitationDescriptor } from "@dxos/echo-db";
import { PartyProxy } from "./PartyProxy";

/**
 * Represents an invitation that was created.
 */
export class InvitationRequest {
  constructor(
    private readonly _descriptor: InvitationDescriptor,
  ) {}

  get descriptor(): InvitationDescriptor {
    return this._descriptor;
  }
}

/**
 * Represents an invitation that is beeing redeemed.
 */
export class RedeemingInvitation {
  constructor(
    private readonly _partyPromise: Promise<PartyProxy>,
    private readonly _onAuthenticate: (secret: Buffer) => void,
  ) {}

  /**
   * Wait for the invitation flow to complete and return the target party.
   */
  wait(): Promise<PartyProxy> {
    return this._partyPromise;
  }

  authenticate(secret: Buffer) {
    this._onAuthenticate(secret);
  }
}

