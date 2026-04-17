//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { log } from '@dxos/log';

/**
 * Placeholder startup module for Trello polling sync.
 * TODO(trello): Implement reactive subscription to TrelloBoard objects to auto-start polling.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    log('trello poll-sync module loaded');
  }),
);
