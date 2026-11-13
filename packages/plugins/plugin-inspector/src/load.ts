//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useState } from 'react';

import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import * as EffectEx from '@dxos/effect/EffectEx';

/** Set before a reload, so the reloaded page loads the dev plugin again by itself. */
const AUTOLOAD_KEY = 'org.dxos.plugin.inspector.autoload';

export type DevPlugin = {
  status: 'idle' | 'loading' | 'loaded' | 'failed';
  /** Key of the loaded plugin. */
  pluginId?: string;
  /** Why the last load failed, in terms of what the reader can do. */
  error?: string;
  load: () => void;
  /**
   * Reloads the page and the plugin with it. The browser keeps a module once it imports it, so a fresh copy of edited
   * code needs a fresh page.
   */
  reload: () => void;
};

/** Loads the plugin a dev server's manifest describes, the way Composer's Load dev plugin does. */
export const useDevPlugin = (manifestUrl: string | undefined): DevPlugin => {
  const manager = PluginManagerProvider.usePluginManager();
  const [state, setState] = useState<Pick<DevPlugin, 'status' | 'pluginId' | 'error'>>({ status: 'idle' });

  const load = useCallback(() => {
    if (!manifestUrl) {
      return;
    }
    setState({ status: 'loading' });
    void EffectEx.runPromise(
      manager.add(manifestUrl).pipe(
        Effect.tap((plugin) => manager.enable(plugin.meta.profile.key)),
        Effect.match({
          onSuccess: (plugin) => {
            storage((store) => store.setItem(AUTOLOAD_KEY, manifestUrl));
            setState({ status: 'loaded', pluginId: plugin.meta.profile.key });
          },
          onFailure: (error) => setState({ status: 'failed', error: describe(error, manifestUrl) }),
        }),
      ),
    );
  }, [manager, manifestUrl]);

  const reload = useCallback(() => {
    if (manifestUrl) {
      storage((store) => store.setItem(AUTOLOAD_KEY, manifestUrl));
    }
    window.location.reload();
  }, [manifestUrl]);

  useEffect(() => {
    if (manifestUrl && storage((store) => store.getItem(AUTOLOAD_KEY)) === manifestUrl) {
      load();
    }
  }, [manifestUrl, load]);

  return { ...state, load, reload };
};

/** Session storage can be missing or throw, e.g. in a sandboxed frame; the reader then clicks Load again. */
const storage = <T>(fn: (store: Storage) => T): T | undefined => {
  try {
    return fn(window.sessionStorage);
  } catch {
    return undefined;
  }
};

/** The `context.reason` a load error carries, and its cause's. */
const reasons = (error: unknown): string[] => {
  if (typeof error !== 'object' || error === null) {
    return [];
  }
  const own =
    'context' in error &&
    typeof error.context === 'object' &&
    error.context !== null &&
    'reason' in error.context &&
    typeof error.context.reason === 'string'
      ? [error.context.reason]
      : [];
  return [...own, ...('cause' in error ? reasons(error.cause) : [])];
};

const causeMessage = (error: unknown): string =>
  typeof error === 'object' && error !== null && 'cause' in error && error.cause instanceof Error
    ? error.cause.message
    : String(error);

const describe = (error: unknown, manifestUrl: string): string => {
  const why = reasons(error);
  if (why.includes('fetch-failed')) {
    return `Couldn't reach ${manifestUrl}. Check that npm run dev is running in your plugin's folder, and that the browser may reach your local network.`;
  }
  if (why.includes('http-error') || why.includes('parse-failed') || why.includes('invalid')) {
    return `The dev server answered, but ${manifestUrl} is not a plugin manifest. Check that vite.config.ts adds composerPlugin.`;
  }
  if (why.includes('import-failed')) {
    return `Your plugin's code failed to load: ${causeMessage(error)}`;
  }
  if (why.includes('meta-missing') || why.includes('meta-mismatch')) {
    return "Your plugin's metadata does not match its manifest. Check the key in dx.config.ts.";
  }
  return String(error);
};
