//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';

import { meta } from '#meta';
import { ChessComAccount, ChessComOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const accountActions = yield* AppGraphBuilder.createTypeExtension({
      id: 'chessComAccountActions',
      type: ChessComAccount.Account,
      actions: (account) =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: ChessComOperation.SyncGames.meta.key,
            data: () => Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) }),
            properties: {
              label: ['sync-games.button', { ns: meta.profile.key }],
              icon: ChessComOperation.SyncGames.meta.icon,
              disposition: 'toolbar',
              testId: 'chessComPlugin.syncGames',
            },
          }),
          AppGraphNode.makeAction({
            id: ChessComOperation.ClearSyncedGames.meta.key,
            data: () => Operation.invoke(ChessComOperation.ClearSyncedGames, { account: Ref.make(account) }),
            properties: {
              label: ['clear-synced-games.label', { ns: meta.profile.key }],
              icon: ChessComOperation.ClearSyncedGames.meta.icon,
              disposition: 'list-item',
              testId: 'chessComPlugin.clearSyncedGames',
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [accountActions]);
  }),
);
