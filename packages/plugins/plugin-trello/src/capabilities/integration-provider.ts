//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { IntegrationProvider as IntegrationProviderCapability } from '@dxos/plugin-integration/capabilities';

import { TRELLO_SOURCE } from '../constants';
import { GetTrelloBoards, SyncTrelloBoard } from '../operations';

/**
 * Contributes a single `IntegrationProvider` entry that wires Trello's two operations
 * to the `'trello.com'` source. plugin-integration looks up providers by source string.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProviderCapability, [
      {
        source: TRELLO_SOURCE,
        getSyncTargets: GetTrelloBoards.meta.key,
        sync: SyncTrelloBoard.meta.key,
      },
    ]);
  }),
);
