//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Key } from '@dxos/echo';
import { log } from '@dxos/log';

import { DeckCapabilities, DeckSchema } from '#types';

import { applyActive, applyCompanion, applyWorkspace } from '../operations/apply';
import { getCandidateEntityIds, getUnresolvedPlankId } from '../util';
import * as Navigation from '../util/navigation';
import { shouldDeferNavigationHandlers } from './check-app-scheme';

// TODO(wittjosiah): Shorten, or apply the restore per-pair.
const RESOLVE_TIMEOUT = '10 seconds';

const LOADER_TIMEOUT = '5 seconds';

let generation = 0;

/** Dispatch navigation handlers for a URL arriving from outside the app, then project it. */
export const handleExternalUrl = Effect.fnUntraced(function* (url?: URL) {
  const navigationHandlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const settingsAtom = yield* Capability.get(DeckCapabilities.Settings);

  const resolvedUrl = url ?? new URL(window.location.href);
  const settings = registry.get(settingsAtom);
  if (!(settings?.enableNativeRedirect && shouldDeferNavigationHandlers())) {
    yield* Effect.all(
      navigationHandlers.map((handler) =>
        handler(resolvedUrl).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('navigation handler failed', { error: Cause.pretty(cause) })),
          ),
        ),
      ),
      { concurrency: 'unbounded' },
    );
  }

  return yield* projectUrl(resolvedUrl);
});

/**
 * Project a URL into deck state, returning the plank attention should move to, or `undefined` when
 * it should stay where it is. `attend` attends the end of the chain rather than the displaced plank.
 */
export const projectUrl = Effect.fnUntraced(function* (url?: URL, options?: { attend?: boolean }) {
  const attendChainEnd = options?.attend ?? true;
  const navigationTargetLoaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const manager = yield* Effect.serviceOption(Plugin.Service);

  const stamp = ++generation;
  const current = () => stamp === generation;

  const updateState = (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => {
    registry.set(stateAtom, fn(registry.get(stateAtom)));
  };

  const knownIdsBySegment = Effect.fnUntraced(function* () {
    const state = registry.get(stateAtom);
    const { segments } = registry.get(ephemeralAtom);
    const active = state.decks[state.activeDeck]?.active ?? [];
    return new Map(active.map((id) => [segments?.[id] ?? id, id]));
  });

  /** Re-runs `parse` as builders register their keys, settling as soon as it succeeds. */
  const parseWhenKeysArrive = <A>(parse: () => Option.Option<A>) =>
    Effect.callback<Option.Option<A>>((resume) => {
      const cancel = registry.subscribe(builder.extensions, () => {
        const parsed = parse();
        if (Option.isSome(parsed)) {
          resume(Effect.succeed(parsed));
        }
      });
      return Effect.sync(cancel);
    }).pipe(
      Effect.timeoutOrElse({
        duration: RESOLVE_TIMEOUT,
        orElse: () => Effect.succeed(Option.none<A>()),
      }),
    );

  const switchWorkspace = (workspacePath: string) =>
    workspacePath === registry.get(stateAtom).activeDeck ? Effect.void : applyWorkspace(workspacePath);

  const pathname = (url ?? new URL(window.location.href)).pathname;
  if (pathname === '/reset') {
    updateState((s) => ({
      ...s,
      activeDeck: DeckSchema.DEFAULT_DECK_ID,
      decks: {
        [DeckSchema.DEFAULT_DECK_ID]: { ...DeckSchema.defaultDeck },
      },
    }));
    window.location.pathname = '/';
    return;
  }

  if (pathname === '/') {
    return;
  }

  yield* UrlPath.readWorkspace(pathname).pipe(
    Option.filter(Key.SpaceId.isValid),
    Option.match({
      onNone: () => Effect.void,
      onSome: (workspace) => switchWorkspace(GraphPath.getSpacePath(workspace)),
    }),
  );

  const pullIdle: Effect.Effect<void, Error> = Option.isSome(manager)
    ? Effect.asVoid(manager.value.activate(ActivationEvents.Idle))
    : Effect.void;

  const parseUrl = () => UrlPath.parse(pathname, PathResolution.buildUrlKeyTable(builder));
  const parsed = yield* parseUrl().pipe(
    Option.match({
      onSome: Effect.succeedSome,
      onNone: () =>
        pullIdle.pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('idle activation failed during url restore', { error: Cause.pretty(cause) })),
          ),
          Effect.map(parseUrl),
          Effect.flatMap((afterIdle) =>
            Option.isSome(afterIdle) ? Effect.succeed(afterIdle) : parseWhenKeysArrive(parseUrl),
          ),
        ),
    }),
  );
  if (!current()) {
    return undefined;
  }
  if (Option.isNone(parsed)) {
    yield* applyActive([NotFound.NOT_FOUND_PATH], {});
    return undefined;
  }

  const { workspace, pairs } = parsed.value;
  const workspacePath =
    workspace === DeckSchema.DEFAULT_DECK_ID ? DeckSchema.DEFAULT_DECK_ID : GraphPath.getSpacePath(workspace);
  yield* switchWorkspace(workspacePath);

  if (pairs.length === 0) {
    return undefined;
  }

  if (!current()) {
    return undefined;
  }

  const known = yield* knownIdsBySegment();
  const initial = pairs
    .filter((pair) => pair.key !== UrlPath.COMPANION_KEY)
    .map((pair) => {
      const segment = Navigation.toSegment(pair);
      return { segment, id: known.get(segment) ?? getUnresolvedPlankId(pair) };
    });
  yield* applyActive(
    initial.map(({ id }) => id),
    Object.fromEntries(initial.map(({ id, segment }) => [id, segment])),
  );

  const loaders = navigationTargetLoaders;
  const verdicts: AppCapabilities.NavigationTargetVerdict[] = pairs.map(() => 'unknown');
  if (loaders.length > 0) {
    yield* Effect.forEach(
      pairs,
      (pair, index) => {
        const candidates =
          pair.id === undefined ? [] : getCandidateEntityIds(pair.id, builder.urlGrammar.tailSeparator);
        if (candidates.length === 0) {
          return Effect.void;
        }
        return Effect.forEach(candidates, (entityId) =>
          Effect.forEach(loaders, (loader) =>
            loader.load({ spaceId: pair.workspace, entityId }).pipe(
              Effect.timeoutOrElse({
                duration: LOADER_TIMEOUT,
                orElse: () => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown'),
              }),
              Effect.catch(() => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown')),
            ),
          ),
        ).pipe(
          Effect.tap((results) => Effect.sync(() => (verdicts[index] = NotFound.combineVerdicts(results.flat())))),
        );
      },
      { concurrency: 'unbounded' },
    );
  }

  const resolved = yield* PathResolution.resolveUrl(
    builder,
    { workspace, pairs },
    { wait: (index) => (verdicts[index] === 'absent' ? undefined : RESOLVE_TIMEOUT) },
  );

  const plankIds: string[] = [];
  const segments: Record<string, string> = {};
  let companionNodeId: string | null = null;
  let companionAnchorId: string | undefined;
  pairs.forEach((pair, index) => {
    const nodeId = resolved[index]?.nodeId;
    if (pair.key === UrlPath.COMPANION_KEY) {
      if (nodeId) {
        companionNodeId = nodeId;
        companionAnchorId = plankIds[plankIds.length - 1];
      }
      return;
    }
    const plankId = nodeId ?? resolved[index]?.candidateId ?? getUnresolvedPlankId(pair);
    plankIds.push(plankId);
    segments[plankId] = Navigation.toSegment(pair);
  });

  if (!current()) {
    return undefined;
  }

  const displaced = yield* applyActive(plankIds, segments);

  yield* applyCompanion(companionNodeId);

  if (!attendChainEnd) {
    return displaced;
  }

  return companionAnchorId ?? plankIds[plankIds.length - 1];
});
