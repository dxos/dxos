//
// Copyright 2025 DXOS.org
//

import { type PublicKey } from '@dxos/keys';
import { create } from '@dxos/live-object';

/**
 * Manages the call state for the current call.
 * Stores it inside live object to ensure state is reactive.
 */
export class CallManager {
  private readonly _state = create<{ spaceKey: PublicKey | undefined }>({ spaceKey: undefined });

  /**
   * @reactive
   */
  get spaceKey(): PublicKey | undefined {
    return this._state.spaceKey;
  }

  set spaceKey(spaceKey: PublicKey) {
    this._state.spaceKey = spaceKey;
  }
}
