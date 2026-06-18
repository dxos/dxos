// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, NotFound } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Database, EID } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';

import { layoutStateAccess } from './state-access';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      log('LayoutOperation.Open handler start');
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const { updateState } = yield* layoutStateAccess;
      const id = input.subject[0];

      // Validate navigation target, redirecting to 404 if not found.
      const capabilities = yield* Capability.Service;
      const pathResolvers = capabilities.getAll(AppCapabilities.NavigationPathResolver);
      const client = yield* Capability.get(ClientCapabilities.Client).pipe(
        Effect.catchAll(() => Effect.succeed(undefined)),
      );
      // Existence checkers for the resolved EID: local (load + catchTag) first, then remote (edge).
      const checkLocalExistence = client
        ? (uri: EID.EID) => {
            const spaceId = EID.getSpaceId(uri);
            const space = spaceId ? client.spaces.get(spaceId) : undefined;
            if (!space) {
              return Effect.succeed(false);
            }
            return Database.load(space.db.makeRef(uri)).pipe(
              Effect.as(true),
              Effect.catchTag('EntityNotFoundError', () => Effect.succeed(false)),
              Effect.catchAll(() => Effect.succeed(false)),
            );
          }
        : undefined;
      const checkRemoteExistence = client
        ? NotFound.createEdgeExistenceChecker((spaceId, body) =>
            client.edge.http.execQuery(new Context(), spaceId, body),
          )
        : undefined;

      const validatedId =
        input.navigation === 'immediate'
          ? id
          : yield* NotFound.validateNavigationTarget({
              graph,
              subjectId: id,
              pathResolvers,
              checkLocalExistence,
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
