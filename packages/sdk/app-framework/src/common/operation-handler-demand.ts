//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

import type * as PluginManager from '../core/plugin-manager';
import * as ActivationEvents from './activation-events';

/**
 * Builds the demand-pull half of deferred operation handlers: given an operation key, activates
 * the plugin module expected to provide its handler (parked there by the host's activation
 * policy) — first the plugin derived from the key's `<plugin>.operation.<name>` shape, then, for
 * operations defined outside their handling plugin, every registered plugin once. Firing an event
 * with no parked modules is a cheap no-op, so hosts without a policy only pay the failed lookup's
 * single retry. Pass as `OperationHandlerSet.withResolver`'s resolver.
 */
export const makeOperationHandlerPull =
  (
    pluginManager: PluginManager.PluginManager,
    isResolved: (key: string) => Promise<boolean>,
  ): ((key: string) => Promise<boolean>) =>
  async (key: string): Promise<boolean> => {
    const nsid = key.replace(/^dxn:/, '');
    const separator = nsid.indexOf('.operation.');
    const activateAll = (pluginKeys: string[]) =>
      EffectEx.runAndForwardErrors(
        Effect.all(
          pluginKeys.map((pluginKey) =>
            pluginManager.activate(ActivationEvents.OperationHandlersRequested(pluginKey)).pipe(Effect.ignore),
          ),
          { concurrency: 'unbounded', discard: true },
        ),
      );
    if (separator !== -1) {
      await activateAll([nsid.slice(0, separator)]);
    } else {
      log.warn('operation key has no plugin prefix; pulling all handler providers', { key });
    }
    if (!(await isResolved(key))) {
      // Fallback for cross-plugin handlers (e.g. an app-toolkit-defined operation handled by a
      // content plugin): activate every registered plugin's parked handlers, once per key.
      log.warn('handler not under its key prefix; pulling all handler providers', { key });
      await activateAll(pluginManager.getPlugins().map((plugin) => plugin.meta.profile.key));
    }
    return true;
  };
