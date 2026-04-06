// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  LayoutOperation,
  createEdgeExistenceChecker,
  validateNavigationTarget,
} from '@dxos/app-toolkit';
import { Context } from '@dxos/context';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const { updateState } = yield* layoutStateAccess;
      const id = input.subject[0];

      // Validate navigation target, redirecting to 404 if not found.
      const capabilities = yield* Capability.Service;
      const pathResolvers = capabilities.getAll(AppCapabilities.NavigationPathResolver);
      const checkRemoteExistence = yield* Capability.get(ClientCapabilities.Client).pipe(
        Effect.map((client) =>
          createEdgeExistenceChecker((spaceId, body) => client.edge.http.execQuery(new Context(), spaceId, body)),
        ),
        Effect.catchAll(() => Effect.succeed(undefined)),
      );

      const validatedId =
        input.navigation === 'immediate'
          ? id
          : yield* validateNavigationTarget({
              graph,
              subjectId: id,
              pathResolvers,
              checkRemoteExistence,
            });

      updateState((state) => {
        const newHistory = state.active ? [...state.history, state.active] : state.history;
        const trimmedHistory =
          newHistory.length > MAX_HISTORY_LENGTH ? newHistory.slice(-MAX_HISTORY_LENGTH) : newHistory;
        return {
          ...state,
          active: validatedId,
          history: trimmedHistory,
        };
      });

      return [validatedId];
    }),
  ),
);

export default handler;

const MAX_HISTORY_LENGTH = 50;
