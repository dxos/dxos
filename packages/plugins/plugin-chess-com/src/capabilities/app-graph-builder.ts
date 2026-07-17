//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { ChessComAccount, ChessComOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const accountActions = yield* GraphBuilder.createTypeExtension({
      id: 'chessComAccountActions',
      type: ChessComAccount.Account,
      actions: (account) =>
        Effect.succeed([
          Node.makeAction({
            id: ChessComOperation.SyncGames.meta.key,
            data: () => Operation.invoke(ChessComOperation.SyncGames, { account: Ref.make(account) }),
            properties: {
              label: ['sync-games.button', { ns: meta.profile.key }],
              icon: ChessComOperation.SyncGames.meta.icon,
              disposition: 'toolbar',
              testId: 'chessComPlugin.syncGames',
            },
          }),
          Node.makeAction({
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

    return [Capability.provide(AppCapabilities.AppGraphBuilder, [accountActions])];
  }),
);
