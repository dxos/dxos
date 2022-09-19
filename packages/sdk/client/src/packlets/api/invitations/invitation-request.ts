//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, until } from '@dxos/async';
import { raise } from '@dxos/debug';
import { InvitationDescriptor } from '@dxos/echo-db';

/**
 * Invitation created by sender.
 */
export class InvitationRequest {
  private _hasConnected = false;

  private _isCanceled = false;

  // TODO(burdon): Merge events and provide single status Event.

  /**
   * Fired when the remote peer connects.
   */
  readonly connected: Event;

  /**
   * Fired when the invitation process completes successfully.
   */
  readonly finished: Event;

  /**
   * Fired when there's an error in the invitation process.
   */
  // TODO(dmaretskyi): Is the error fatal? Does it terminate the invitation process?
  readonly error: Event<Error>;

  readonly canceled = new Event();

  constructor (
    private readonly _descriptor: InvitationDescriptor,
    connected: Event,
    finished: Event,
    error: Event<Error>
  ) {
    this.connected = connected;
    this.finished = finished;
    this.error = error;

    this.connected.on(() => {
      this._hasConnected = true;
    });
  }

  get descriptor (): InvitationDescriptor {
    return this._descriptor;
  }

  get secret (): Uint8Array {
    return this._descriptor.secret ?? raise(new Error('Invitation secret is not set.'));
  }

  /**
   * True if the connected event has been fired.
   */
  get hasConnected (): boolean {
    return this._hasConnected;
  }

  /**
   * Wait until connected.
   */
  async wait (timeout?: number) {
    await until((resolve, reject) => {
      this.canceled.on(resolve);
      this.finished.on(resolve);
      this.error.on(reject);
    }, timeout ? timeout * 1_000 : 0);
  }

  /**
   * Cancel the invitation.
   */
  cancel () {
    assert(!this._isCanceled, new Error('Invitation is already canceled'));
    this._isCanceled = true;
    this.canceled.emit();
  }

  toString () {
    return `InvitationRequest(${JSON.stringify(this._descriptor.toQueryParameters())})`;
  }
}
