//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Annotation, Obj } from '@dxos/echo';
import { type EdgeHttpClient } from '@dxos/edge-client';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

//
// Capability Module
//
// Publishes the enabled-plugin list of each scope the user owns to EDGE, so a headless invocation can
// be scoped to it (spec D-78).
//
// The lists themselves live in ECHO — this identity's enabled set replicates through the settings space,
// and a space's through its `properties` — which is what follows the user between devices and members.
// EDGE cannot read either without opening an Automerge document on the invocation's path, so this module
// pushes the resolved list whenever it changes and EDGE keeps the projection.
//
// Only pushes, never reads back: ECHO is the source of truth, and a scope EDGE holds no record for falls
// back to the deployment's own list rather than to "nothing enabled".
//

/** Debounce for a publish: enabling one plugin can enable several, and the closure settles key by key. */
const PUBLISH_DELAY_MS = 500;

type Publisher = {
  readonly publishIdentity: (pluginKeys: readonly string[]) => void;
  readonly publishSpace: (spaceId: SpaceId, pluginKeys: readonly string[]) => void;
  readonly cancel: () => void;
};

type Edge = Pick<EdgeHttpClient, 'request'>;

const identityPath = '/registry/scopes/identity';
const spacePath = (spaceId: SpaceId) => `/registry/scopes/spaces/${spaceId}`;

/**
 * Publishes a scope's list at most once per {@link PUBLISH_DELAY_MS}, and never republishes a list EDGE
 * already holds.
 *
 * A space with no decisions clears its record rather than publishing an empty list: an empty list on
 * EDGE means the scope enabled nothing, where no record means the scope has made no choice and the
 * caller's own list applies.
 */
export const makeScopePublisher = (edge: Edge): Publisher => {
  /** The last list EDGE accepted for each scope, so an unrelated change republishes nothing. */
  const published = new Map<string, string>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const send = async (scopeKey: string, path: string, pluginKeys: readonly string[]): Promise<void> => {
    const sorted = [...pluginKeys].sort();
    const body = JSON.stringify(sorted);
    if (published.get(scopeKey) === body) {
      return;
    }
    try {
      if (sorted.length === 0 && scopeKey.startsWith('space:')) {
        await edge.request(Context.default(), path, { method: 'DELETE' });
      } else {
        await edge.request(Context.default(), path, { method: 'PUT', body: { pluginKeys: sorted } });
      }
      published.set(scopeKey, body);
      log.info('published plugin scope to EDGE', { scopeKey, count: sorted.length });
    } catch (error) {
      // Dropped, not retried: the next change publishes again, and a scope EDGE has no record for falls
      // back to the deployment's list rather than losing the caller its plugins.
      published.delete(scopeKey);
      log.warn('could not publish plugin scope to EDGE', { scopeKey, error });
    }
  };

  const schedule = (scopeKey: string, path: string, pluginKeys: readonly string[]): void => {
    clearTimeout(timers.get(scopeKey));
    timers.set(
      scopeKey,
      setTimeout(() => {
        timers.delete(scopeKey);
        void send(scopeKey, path, pluginKeys);
      }, PUBLISH_DELAY_MS),
    );
  };

  return {
    publishIdentity: (pluginKeys) => schedule('identity', identityPath, pluginKeys),
    publishSpace: (spaceId, pluginKeys) => schedule(`space:${spaceId}`, spacePath(spaceId), pluginKeys),
    cancel: () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const client = yield* ClientCapabilities.Client;
    const manager = yield* Capabilities.PluginManager;
    const registry = yield* Capabilities.AtomRegistry;
    const edge = yield* Capability.getOption(ClientCapabilities.EdgeHttpClient);
    if (Option.isNone(edge)) {
      // No EDGE to publish to: a local-only profile runs its plugins in the browser and nowhere else.
      return [];
    }

    const publisher = makeScopePublisher(edge.value);

    // The identity's own set, which the settings space already replicates between this user's devices.
    const publishIdentity = () => publisher.publishIdentity(manager.getEnabled());
    const unsubscribeIdentity = registry.subscribe(manager.enabled, publishIdentity);
    publishIdentity();

    // Each space's own set. Watched per space rather than published from the settings UX, so a decision
    // another member made reaches EDGE from whichever client sees it first.
    //
    // Two subscriptions per space, following the annotation the way settings sync does: the properties
    // name the settings object, and a space that has never been configured has none until its first
    // decision names one. Read-only — a space with no object has made no choice, which clears its scope
    // rather than creating an object here.
    type Watch = { properties: () => void; settings: () => void };
    const watched = new Map<SpaceId, Watch>();
    const watch = (space: Space): void => {
      if (watched.has(space.id)) {
        return;
      }
      const entry: Watch = { properties: () => {}, settings: () => {} };
      watched.set(space.id, entry);
      void space
        .waitUntilReady()
        .then(() => {
          if (watched.get(space.id) !== entry) {
            return;
          }
          const publishSpace = () => publisher.publishSpace(space.id, AppSpace.getEnabledSpacePlugins(space) ?? []);
          const follow = () => {
            const ref = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(
              Option.getOrUndefined,
            );
            if (!ref) {
              publishSpace();
              return;
            }
            void ref
              .load()
              .then((settings) => {
                if (watched.get(space.id) !== entry) {
                  return;
                }
                entry.settings();
                entry.settings = Obj.subscribe(settings, publishSpace);
                publishSpace();
              })
              .catch((err) => log.catch(err));
          };
          entry.properties = Obj.subscribe(space.properties, follow);
          follow();
        })
        .catch((err) => log.catch(err));
    };
    const watchAll = (spaces: readonly Space[]) => spaces.forEach(watch);
    const spaces = client.spaces.subscribe(watchAll);
    watchAll(client.spaces.get());

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribeIdentity();
        spaces.unsubscribe();
        watched.forEach(({ properties, settings }) => {
          properties();
          settings();
        });
        watched.clear();
        publisher.cancel();
      }),
    );

    return [];
  }),
);
