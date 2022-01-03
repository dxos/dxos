import { PartyProxy } from "./PartyProxy";

/**
 * Represents an invitation that is beeing redeemed.
 */
export class RedeemingInvitation {
  constructor(
    private readonly _partPromise: Promise<PartyProxy>,
    private readonly _onAuthenticate: (secret: Buffer) => void,
  ) {}

  /**
   * Wait for the invitation flow to complete and return the target party.
   */
  wait(): Promise<PartyProxy> {
    throw new Error('Not implemented');
  }

  authenticate(secret: Buffer) {

  }
}

