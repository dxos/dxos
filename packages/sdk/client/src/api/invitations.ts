//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { InvitationDescriptor } from '@dxos/echo-db';

import { PartyProxy } from './party-proxy';

/**
 * Invitation created by sender.
 */
export class InvitationRequest {
  /**
   * Fired when the remote peer connects.
   */
  connected: Event;

  /**
   * Fired when the invitation process completes successfully.
   */
  finished: Event;

  /**
   * Fired when there's an error in the invitation process.
   */
  // TODO(dmaretskyi): Is the error fatal? Does it terminate the invitation process?
  error: Event<Error>;

  constructor (
    private readonly _descriptor: InvitationDescriptor,
    connected: Event,
    finished: Event,
    error: Event<Error>
  ) {
    this.connected = connected;
    this.finished = finished;
    this.error = error;
  }

  get descriptor (): InvitationDescriptor {
    return this._descriptor;
  }

  get secret (): Uint8Array {
    return this._descriptor.secret ?? raise(new Error('Invitation secret is not set'));
  }

  toString () {
    return `InvitationRequest(${JSON.stringify(this._descriptor.toQueryParameters())})`;
  }
}

/**
 * Invitation that is being redeemed.
 */
export class Invitation {
  constructor (
    private readonly _partyPromise: Promise<PartyProxy>,
    private readonly _onAuthenticate: (secret: Uint8Array) => void
  ) {}

  /**
   * Wait for the invitation flow to complete and return the target party.
   */
  wait (): Promise<PartyProxy> {
    return this._partyPromise;
  }

  authenticate (secret: Uint8Array) {
    this._onAuthenticate(secret);
  }
}
