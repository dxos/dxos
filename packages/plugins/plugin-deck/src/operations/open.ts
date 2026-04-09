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
  expandPath,
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
import { openSubjectsOnActiveDeck } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      // Validate navigation targets, redirecting to 404 if not found.
      const capabilities = yield* Capability.Service;
      const pathResolvers = capabilities.getAll(AppCapabilities.NavigationPathResolver);
      const checkRemoteExistence = yield* Capability.get(ClientCapabilities.Client).pipe(
        Effect.map((client) =>
          createEdgeExistenceChecker((spaceId, body) => client.edge.http.execQuery(new Context(), spaceId, body)),
        ),
        Effect.catchAll(() => Effect.succeed(undefined)),
      );

      // Immediate: skip 404 / resolver checks but still expand the path (same as validate’s first step).
      if (input.navigation === 'immediate') {
        for (const subjectId of input.subject) {
          expandPath(graph, subjectId);
        }
      }

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

      // Dedup subjects against the active deck using DXN identity.
      // The same object can appear under different graph paths (e.g., via collections vs types).
      // Resolve each subject's DXN and, if it matches an already-open deck item, remap the
      // subject to the existing deck entry so that openEntry's exact-match check succeeds.
      {
        const deck = yield* DeckCapabilities.getDeck();
        const active = deck.solo ? [deck.solo].filter(Boolean) : deck.active;
        if (active.length > 0 && input.subject.length > 0) {
          const resolveDxn = (qualifiedPath: string) =>
            Effect.reduce(pathResolvers, Option.none<string>(), (acc, resolver) =>
              Option.isSome(acc)
                ? Effect.succeed(acc)
                : resolver(qualifiedPath).pipe(
                    Effect.map((opt) => Option.map(opt, (dxn) => dxn.toString())),
                    Effect.catchAll(() => Effect.succeed(Option.none<string>())),
                  ),
            );

          // Build DXN → deck item ID map for active items.
          const deckDxnMap = new Map<string, string>();
          yield* Effect.all(
            active.map((deckId) =>
              resolveDxn(deckId).pipe(
                Effect.map((opt) => {
                  if (Option.isSome(opt)) {
                    deckDxnMap.set(opt.value, deckId);
                  }
                }),
              ),
            ),
            { concurrency: 'unbounded' },
          );

          // Remap subjects whose DXN matches an existing deck item.
          if (deckDxnMap.size > 0) {
            const remapped = yield* Effect.all(
              input.subject.map((subjectId) =>
                resolveDxn(subjectId).pipe(
                  Effect.map((opt) => {
                    if (Option.isSome(opt)) {
                      const existing = deckDxnMap.get(opt.value);
                      if (existing && existing !== subjectId) {
                        return existing;
                      }
                    }
                    return subjectId;
                  }),
                ),
              ),
              { concurrency: 'unbounded' },
            );
            input = { ...input, subject: remapped };
          }
        }
      }

      let previouslyOpenIds: Set<string>;
      {
        const deck = yield* DeckCapabilities.getDeck();
        previouslyOpenIds = new Set<string>(deck.solo ? [deck.solo] : deck.active);
        const next =
          deck.solo || !deck.initialized
            ? [...input.subject]
            : openSubjectsOnActiveDeck(deck.active, input.subject, {
                pivotId: input.pivotId,
                key: input.key,
              });

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
