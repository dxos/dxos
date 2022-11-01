//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event, until } from '@dxos/async';
import { InvitationWrapper } from '@dxos/client-services';

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

  constructor(private readonly _descriptor: InvitationWrapper, connected: Event, finished: Event, error: Event<Error>) {
    this.connected = connected;
    this.finished = finished;
    this.error = error;

    this.connected.on(() => {
      this._hasConnected = true;
    });
  }

  get descriptor(): InvitationWrapper {
    return this._descriptor;
  }

  get secret(): Uint8Array {
    return this._descriptor.secret ?? Buffer.from('todo');
  }

  /**
   * True if the connected event has been fired.
   */
  get hasConnected(): boolean {
    return this._hasConnected;
  }

  encode() {
    return InvitationWrapper.encode(this._descriptor);
  }

  /**
   * Wait until connected.
   */
  async wait(timeout?: number) {
    await until(
      (resolve, reject) => {
        this.canceled.on(resolve);
        this.finished.on(resolve);
        this.error.on(reject);
      },
      timeout ? timeout * 1_000 : 0
    );
  }

  /**
   * Cancel the invitation.
   */
  cancel() {
    assert(!this._isCanceled, new Error('Invitation is already canceled'));
    this._isCanceled = true;
    this.canceled.emit();
  }

  toString() {
    return `InvitationRequest(${JSON.stringify(this._descriptor.toQueryParameters())})`;
  }
}
