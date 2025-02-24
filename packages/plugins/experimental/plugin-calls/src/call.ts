//
// Copyright 2025 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';

// Template for call manager. Useless for now.
export class CallManager {
  private _space?: Space = undefined;

  get space() {
    return this._space;
  }

  setSpace(space: Space) {
    log.info('CallManager.set', space);
    this._space = space;
  }
}
