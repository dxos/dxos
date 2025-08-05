//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect-rx/rx-react';
import { effect } from '@preact/signals-core';
import React, { type FC, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { useDefaultValue } from '@dxos/react-hooks';

import { Capabilities, Events } from './common';
import { type Plugin, PluginManager, type PluginManagerOptions } from './core';
import { topologicalSort } from './helpers';
import { ErrorBoundary, PluginManagerProvider, useCapabilities } from './react';

const ENABLED_KEY = 'dxos.org/app-framework/enabled';

export type CreateAppOptions = {
  pluginManager?: PluginManager;
  pluginLoader?: PluginManagerOptions['pluginLoader'];
  plugins?: Plugin[];
  core?: string[];
  defaults?: string[];
  placeholder?: FC<{ stage: number }>;
  fallback?: ErrorBoundary['props']['fallback'];
  cacheEnabled?: boolean;
  safeMode?: boolean;
};

/**
 * Expected usage is for this to be the entrypoint of the application.
 * Initializes plugins and renders the root components.
 *
 * @example
 * const plugins = [LayoutPlugin(), MyPlugin()];
 * const core = [LayoutPluginId];
 * const default = [MyPluginId];
 * const fallback = <div>Initializing Plugins...</div>;
 * const App = createApp({ plugins, core, default, fallback });
 * createRoot(document.getElementById('root')!).render(
 *   <StrictMode>
 *     <App />
 *   </StrictMode>,
 * );
 *
 * @param params.pluginLoader A function which loads new plugins.
 * @param params.plugins All plugins available to the application.
 * @param params.core Core plugins which will always be enabled.
 * @param params.defaults Default plugins are enabled by default but can be disabled by the user.
 * @param params.placeholder Placeholder component to render during startup.
 * @param params.fallback Fallback component to render if an error occurs during startup.
 * @param params.cacheEnabled Whether to cache enabled plugins in localStorage.
 * @param params.safeMode Whether to enable safe mode, which disables optional plugins.
 */
export const useApp = ({
  pluginManager,
  pluginLoader: _pluginLoader,
  plugins: _plugins,
  core: _core,
  defaults: _defaults,
  placeholder,
  fallback = DefaultFallback,
  cacheEnabled = false,
  safeMode = false,
}: CreateAppOptions) => {
  const plugins = useDefaultValue(_plugins, () => []);
  const core = useDefaultValue(_core, () => plugins.map(({ meta }) => meta.id));
  const defaults = useDefaultValue(_defaults, () => []);

  // TODO(wittjosiah): Provide a custom plugin loader which supports loading via url.
  const pluginLoader = useMemo(
    () =>
      _pluginLoader ??
      ((id: string) => {
        const plugin = plugins.find((plugin) => plugin.meta.id === id);
        invariant(plugin, `Plugin not found: ${id}`);
        return plugin;
      }),
    [_pluginLoader, plugins],
  );

  const state = useMemo(() => live({ ready: false, error: null }), []);
  const cached: string[] = useMemo(() => JSON.parse(localStorage.getItem(ENABLED_KEY) ?? '[]'), []);
  const enabled = useMemo(
    () => (safeMode ? [] : cacheEnabled && cached.length > 0 ? cached : defaults),
    [safeMode, cacheEnabled, cached, defaults],
  );
  const manager = useMemo(
    () => pluginManager ?? new PluginManager({ pluginLoader, plugins, core, enabled }),
    [pluginManager, pluginLoader, plugins, core, enabled],
  );

  useEffect(() => {
    return manager.activation.on(({ event, state: _state, error }) => {
      // Once the app is ready the first time, don't show the fallback again.
      if (!state.ready && event === Events.Startup.id) {
        state.ready = _state === 'activated';
      }

      if (error && !state.ready && !state.error) {
        state.error = error;
      }
    });
  }, [manager, state]);

  useEffect(() => {
    effect(() => {
      cacheEnabled && localStorage.setItem(ENABLED_KEY, JSON.stringify(manager.enabled));
    });
  }, [cacheEnabled, manager]);

  useEffect(() => {
    manager.context.contributeCapability({
      interface: Capabilities.PluginManager,
      implementation: manager,
      module: 'dxos.org/app-framework/plugin-manager',
    });

    manager.context.contributeCapability({
      interface: Capabilities.RxRegistry,
      implementation: manager.registry,
      module: 'dxos.org/app-framework/rx-registry',
    });

    return () => {
      manager.context.removeCapability(Capabilities.PluginManager, manager);
      manager.context.removeCapability(Capabilities.RxRegistry, manager.registry);
    };
  }, [manager]);

  useEffect(() => {
    setupDevtools(manager);
  }, [manager]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      await Promise.all([
        // TODO(wittjosiah): Factor out such that this could be called per surface role when attempting to render.
        manager.activate(Events.SetupReactSurface),
        manager.activate(Events.Startup),
      ]);
    });

    return () => clearTimeout(timeout);
  }, [manager]);

  return useCallback(
    () => (
      <ErrorBoundary fallback={fallback}>
        <PluginManagerProvider value={manager}>
          <RegistryContext.Provider value={manager.registry}>
            <App placeholder={placeholder} state={state} />
          </RegistryContext.Provider>
        </PluginManagerProvider>
      </ErrorBoundary>
    ),
    [fallback, manager, placeholder, state],
  );
};

const DELAY_PLACEHOLDER = 2_000;

enum LoadingState {
  Loading = 0,
  FadeIn = 1,
  FadeOut = 2,
  Done = 3,
}

/**
 * To avoid "flashing" the placeholder, we wait a period of time before starting the loading animation.
 * If loading completes during this time the placehoder is not shown, otherwise is it displayed for a minimum period of time.
 *
 * States:
 * 0: Loading   - Wait for a period of time before starting the loading animation.
 * 1: Fade-in   - Display a loading animation.
 * 2: Fade-out  - Fade out the loading animation.
 * 3: Done      - Remove the placeholder.
 */
const useLoading = (state: AppProps['state']) => {
  const [stage, setStage] = useState<LoadingState>(LoadingState.Loading);
  useEffect(() => {
    const i = setInterval(() => {
      setStage((tick) => {
        switch (tick) {
          case LoadingState.Loading:
            if (!state.ready) {
              return LoadingState.FadeIn;
            } else {
              clearInterval(i);
              return LoadingState.Done;
            }
          case LoadingState.FadeIn:
            if (state.ready) {
              return LoadingState.FadeOut;
            }
            break;
          case LoadingState.FadeOut:
            clearInterval(i);
            return LoadingState.Done;
        }

        return tick;
      });
    }, DELAY_PLACEHOLDER);

    return () => clearInterval(i);
  }, []);

  return stage;
};

type AppProps = Pick<CreateAppOptions, 'placeholder'> & {
  state: { ready: boolean; error: unknown };
};

const App = ({ placeholder: Placeholder, state }: AppProps) => {
  const reactContexts = useCapabilities(Capabilities.ReactContext);
  const reactRoots = useCapabilities(Capabilities.ReactRoot);
  const stage = useLoading(state);

  if (state.error) {
    // This triggers the error boundary to provide UI feedback for the startup error.
    throw state.error;
  }

  // TODO(wittjosiah): Consider using Suspense instead?
  if (stage < LoadingState.Done) {
    if (!Placeholder) {
      return null;
    }

    return <Placeholder stage={stage} />;
  }

  const ComposedContext = composeContexts(reactContexts);
  return (
    <ComposedContext>
      {reactRoots.map(({ id, root: Component }) => (
        <Component key={id} />
      ))}
    </ComposedContext>
  );
};

// Default fallback does not use tailwind or theme.
const DefaultFallback = ({ error }: { error: Error }) => {
  return (
    <div style={{ margin: '0.5rem', padding: '1rem', overflow: 'hidden', border: '1px solid red' }}>
      {/* TODO(wittjosiah): Link to docs for replacing default. */}
      <h1 style={{ margin: '0.5rem 0', fontSize: '1.2rem' }}>[ERROR]: {error.message}</h1>
      <pre style={{ overflow: 'auto', fontSize: '1rem', whiteSpace: 'pre-wrap', color: '#888888' }}>{error.stack}</pre>
    </div>
  );
};

const composeContexts = (contexts: Capabilities.ReactContext[]) => {
  if (contexts.length === 0) {
    return ({ children }: PropsWithChildren) => <>{children}</>;
  }

  return topologicalSort(contexts)
    .map(({ context }) => context)
    .reduce((Acc, Next) => ({ children }) => (
      <Acc>
        <Next>{children}</Next>
      </Acc>
    ));
};

const setupDevtools = (manager: PluginManager) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.manager = manager;
};
