//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { PathResolution } from '@dxos/app-graph';
import { AppCapabilities, LayoutOperation, NotFound, Paths, UrlPath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { SimpleLayoutCapabilities } from '#types';

/** Strip the `root/` prefix off a qualified workspace path, back to the bare `UrlPath` workspace token. */
const bareWorkspace = (qualifiedWorkspace: string): string => {
  const [, workspace] = qualifiedWorkspace.split('/');
  return workspace ?? qualifiedWorkspace;
};

/**
 * URL handler for simple layout that syncs browser URL with layout state, under the same pair-chain
 * grammar as the deck (`@dxos/app-toolkit`'s `UrlPath`), simplified to a single plank: the URL never
 * carries more than one `(key, id)` pair, since simple layout has no multi-plank deck to serialize.
 *
 * On Tauri, also listens for deep links via the deep-link plugin.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationService = yield* Capability.get(Capabilities.OperationInvoker);
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(SimpleLayoutCapabilities.State);

    const provideServices = <A, E>(effect: Effect.Effect<A, E, Capability.Service | Operation.Service>) =>
      effect.pipe(
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
      );

    const getState = () => registry.get(stateAtom);

    /** Dispatch all NavigationHandler contributions with a given URL. */
    const dispatchNavigationHandlers = Effect.fn(function* (url: URL) {
      const handlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
      yield* Effect.all(
        handlers.map((handler) => handler(url)),
        { concurrency: 'unbounded' },
      );
    });

    const handleNavigation = Effect.fn(function* (url?: URL) {
      const { builder } = yield* Capability.get(AppCapabilities.AppGraph);
      const resolvedUrl = url ?? new URL(window.location.href);
      yield* dispatchNavigationHandlers(resolvedUrl);

      let pathname = resolvedUrl.pathname;
      if (isFilePath(pathname)) {
        log.info('[UrlHandler] Skipping file path (not a graph node)', { pathname });
        pathname = '/';
      }

      if (pathname === '/') {
        // Bare root with no `/w/...` info at all: leave the persisted state as-is; the outbound sync
        // below rewrites the URL to reflect it as soon as the state is next read.
        return;
      }

      const keyTable = PathResolution.buildUrlKeyTable(builder);
      const parsed = UrlPath.parse(pathname, keyTable);
      if (Option.isNone(parsed)) {
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [NotFound.NOT_FOUND_PATH],
          navigation: 'immediate',
        });
        return;
      }

      const { workspace, pairs } = parsed.value;
      const workspacePath = Paths.getSpacePath(workspace);
      if (workspacePath !== getState().workspace) {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: workspacePath });
      }

      // Single-plank grammar: only the first id-bearing pair is meaningful; anything past it (a
      // companion pair, or a second plank from a shared deck link) is ignored.
      const plankPair = pairs.find((pair) => pair.id !== undefined);
      if (!plankPair) {
        // Workspace-only URL: SwitchWorkspace above already restored the workspace.
        return;
      }

      const resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs: [plankPair] });
      const nodeId = resolved[0]?.nodeId ?? NotFound.NOT_FOUND_PATH;
      yield* Operation.invoke(LayoutOperation.Set, { subject: [nodeId] });
    });

    const onPopState = () => void EffectEx.runAndForwardErrors(provideServices(handleNavigation()));

    yield* provideServices(handleNavigation());
    window.addEventListener('popstate', onPopState);

    // Tauri deep link support.
    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.gen(function* () {
        const { getCurrent, onOpenUrl } = yield* Effect.promise(() => import('@tauri-apps/plugin-deep-link'));

        const launchUrls = yield* Effect.promise(() => getCurrent());
        if (launchUrls && launchUrls.length > 0) {
          log.info('[UrlHandler] App launched with deep links', { urls: launchUrls });
          for (const urlString of launchUrls) {
            yield* provideServices(handleDeepLink(urlString, handleNavigation));
          }
        }

        unlistenDeepLink = yield* Effect.promise(() =>
          onOpenUrl((urls) => {
            log.info('[UrlHandler] Deep links received', { urls });
            for (const urlString of urls) {
              void EffectEx.runAndForwardErrors(provideServices(handleDeepLink(urlString, handleNavigation)));
            }
          }),
        );
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => log.warn('[UrlHandler] Failed to initialize deep link listener', { error })),
        ),
      );
    }

    const { builder } = yield* Capability.get(AppCapabilities.AppGraph);

    // Sync URL with layout state changes.
    const syncUrl = (method: 'push' | 'replace' = 'push') => {
      const state = getState();
      const workspace = bareWorkspace(state.workspace);

      const pairs: UrlPath.Pair[] = [];
      if (state.active) {
        const represented = PathResolution.representNode(builder, state.active);
        if (Option.isSome(represented)) {
          pairs.push(represented.value);
        } else {
          log.warn('[UrlHandler] active item has no URL representation; omitting from URL', {
            active: state.active,
          });
        }
      }

      const path = UrlPath.format({ workspace, pairs });
      const newUrl = `${path}${window.location.search}`;
      if (`${window.location.pathname}${window.location.search}` !== newUrl) {
        if (method === 'replace') {
          history.replaceState(null, '', newUrl);
        } else {
          history.pushState(null, '', newUrl);
        }
      }
    };

    const unsubscribe = registry.subscribe(stateAtom, () => syncUrl());
    // Correct a bare/stale URL against the already-persisted state on load.
    syncUrl('replace');

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);

/** Check if a path is a redirect path handled elsewhere (e.g., OAuth). */
const isRedirectPath = (pathname: string): boolean => pathname.startsWith('/redirect/');

/** Paths with file extensions are not graph node paths. */
const isFilePath = (pathname: string): boolean => /\.[a-z]+$/i.test(pathname);

/** Handle a deep link URL string. Merges query params into window.location and navigates. */
const handleDeepLink = Effect.fn(function* (urlString: string, navigate: (url?: URL) => Effect.Effect<void, any, any>) {
  log.info('[UrlHandler] Deep link received', { url: urlString });

  const deepLinkUrl = new URL(urlString);

  // For custom schemes (e.g., composer://a/b/c), new URL() treats the first segment as the
  // hostname. Reconstruct the full path from hostname + pathname.
  const fullPath =
    deepLinkUrl.protocol !== 'https:' && deepLinkUrl.protocol !== 'http:' && deepLinkUrl.hostname
      ? '/' + deepLinkUrl.hostname + deepLinkUrl.pathname
      : deepLinkUrl.pathname;

  if (isRedirectPath(fullPath)) {
    return;
  }

  // Merge deep link query params into the current window URL so handlers can read them.
  const current = new URL(window.location.href);
  if (deepLinkUrl.search) {
    deepLinkUrl.searchParams.forEach((value, key) => current.searchParams.set(key, value));
  }
  current.pathname = fullPath;
  history.replaceState(null, '', current.pathname + current.search);

  yield* navigate(current);
});
