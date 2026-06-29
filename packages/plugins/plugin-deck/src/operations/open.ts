//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, NotFound } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Database, EID, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { openSubjectsOnActiveDeck } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      log('LayoutOperation.Open handler start');
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      // Validate navigation targets, redirecting to 404 if not found.
      const capabilities = yield* Capability.Service;
      const pathResolvers = capabilities.getAll(AppCapabilities.NavigationPathResolver);
      const client = yield* Capability.get(ClientCapabilities.Client).pipe(
        Effect.catchAll(() => Effect.succeed(undefined)),
      );
      // Existence checkers for the resolved EID: local (load + catchTag) first, then remote (edge).
      const checkLocalExistence = client
        ? (id: EID.EID) => {
            const spaceId = EID.getSpaceId(id);
            const space = spaceId ? client.spaces.get(spaceId) : undefined;
            if (!space) {
              return Effect.succeed(false);
            }
            return Database.load(space.db.makeRef(id)).pipe(
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

      // Immediate: skip 404 / resolver checks but still expand the path (same as validate’s first step).
      if (input.navigation === 'immediate') {
        for (const subjectId of input.subject) {
          NotFound.expandPath(graph, subjectId);
        }
      }

      const validatedSubjects = yield* Effect.all(
        input.subject.map((subjectId) =>
          input.navigation === 'immediate'
            ? Effect.succeed(subjectId)
            : NotFound.validateNavigationTarget({
                graph,
                subjectId,
                pathResolvers,
                checkLocalExistence,
                checkRemoteExistence,
              }),
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
      // Only needed in multi (deck) mode; solo mode replaces the single visible item anyway.
      {
        const deck = yield* DeckCapabilities.getDeck();
        const active = !deck.solo && deck.initialized ? deck.active : [];
        if (active.length > 0 && input.subject.length > 0) {
          const resolveDXN = (qualifiedPath: string) =>
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
              resolveDXN(deckId).pipe(
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
                resolveDXN(subjectId).pipe(
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

      // Compute the next active deck state and apply it.
      // In solo or uninitialized mode the subject list replaces the deck entirely.
      // In multi (deck) mode, subjects are merged via openSubjectsOnActiveDeck which
      // uses stack semantics (truncate after pivot, then push new entries).
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

      // Schedule side-effects for the newly opened items: scroll into view, expose in
      // the navigation sidebar, and emit observability events.
      // When nothing is newly opened (subject was already visible), the fallback
      // `input.subject[0]` still triggers scroll and expose so the user is taken there.
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
