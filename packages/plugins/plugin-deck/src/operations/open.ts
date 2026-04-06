//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  LayoutOperation,
  createEdgeExistenceChecker,
  validateNavigationTarget,
} from '@dxos/app-toolkit';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention/types';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Graph } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { updateActiveDeck } from './helpers';
import { openEntry } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

      // Validate navigation targets, redirecting to 404 if not found.
      const capabilities = yield* Capability.Service;
      const pathResolvers = capabilities.getAll(AppCapabilities.NavigationPathResolver);
      const checkRemoteExistence = yield* Capability.get(ClientCapabilities.Client).pipe(
        Effect.map((client) =>
          createEdgeExistenceChecker((spaceId, body) => client.edge.http.execQuery(new Context(), spaceId, body)),
        ),
        Effect.catchAll(() => Effect.succeed(undefined)),
      );

      const validatedSubjects = yield* Effect.all(
        input.subject.map((subjectId) =>
          input.navigation === 'immediate'
            ? Effect.succeed(subjectId)
            : validateNavigationTarget({ graph, subjectId, pathResolvers, checkRemoteExistence }),
        ),
      );
      input = { ...input, subject: validatedSubjects };

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        if (input.workspace && state.activeDeck !== input.workspace) {
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: input.workspace });
        }
      }

      let previouslyOpenIds: Set<string>;
      {
        const deck = yield* DeckCapabilities.getDeck();
        previouslyOpenIds = new Set<string>(deck.solo ? [deck.solo] : deck.active);
        const next =
          deck.solo || !deck.initialized
            ? [...input.subject]
            : input.subject.reduce(
                (acc, entryId) =>
                  openEntry(acc, entryId, {
                    key: input.key,
                    positioning: input.positioning ?? settings?.newPlankPositioning,
                    pivotId: input.pivotId,
                  }),
                deck.active,
              );

        const { deckUpdates, toAttend: _toAttend } = computeActiveUpdates({ next, deck, attention });
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      }

      {
        const deck = yield* DeckCapabilities.getDeck();
        const ids = deck.solo ? [deck.solo] : deck.active;
        const newlyOpen = ids.filter((i: string) => !previouslyOpenIds.has(i));

        if (input.scrollIntoView !== false && (newlyOpen[0] ?? input.subject[0])) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, {
            subject: newlyOpen[0] ?? input.subject[0],
          });
        }

        if (newlyOpen[0] ?? input.subject[0]) {
          yield* Operation.schedule(LayoutOperation.Expose, { subject: newlyOpen[0] ?? input.subject[0] });
        }

        for (const subjectId of newlyOpen) {
          const typename = Option.match(Graph.getNode(graph, subjectId), {
            onNone: () => undefined,
            onSome: (node) => {
              const active = node.data;
              return Obj.isObject(active) ? Obj.getTypename(active) : undefined;
            },
          });
          yield* Operation.schedule(ObservabilityOperation.SendEvent, {
            name: 'navigation.activate',
            properties: { subjectId, typename },
          });
        }
      }

      return validatedSubjects;
    }),
  ),
);

export default handler;
