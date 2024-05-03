//
// Copyright 2023 DXOS.org
//

import React, { useEffect, type FC, type PropsWithChildren, type ReactNode, useState } from 'react';

import { LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';

import { type PluginContext, PluginProvider } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginProvides } from './plugin';
import { ErrorBoundary } from '../SurfacePlugin';

export type BootstrapPluginsParams = {
  order: PluginDefinition['meta'][];
  plugins: Record<string, () => Promise<PluginDefinition>>;
  core?: string[];
  defaults?: string[];
  fallback?: ErrorBoundary['props']['fallback'];
  placeholder?: ReactNode;
};

export type PluginHostProvides = {
  plugins: PluginContext;
};

export const parsePluginHost = (plugin: Plugin) =>
  (plugin.provides as PluginHostProvides).plugins ? (plugin as Plugin<PluginHostProvides>) : undefined;

const PLUGIN_HOST = 'dxos.org/plugin/host';

/**
 * Bootstraps an application by initializing plugins and rendering root components.
 */
export const PluginHost = ({
  order,
  plugins: definitions,
  core = [],
  defaults = [],
  fallback = DefaultFallback,
  placeholder = null,
}: BootstrapPluginsParams): PluginDefinition<PluginHostProvides> => {
  const state = new LocalStorageStore<PluginContext>(PLUGIN_HOST, {
    ready: false,
    enabled: [...defaults],
    plugins: [],
    available: order.filter(({ id }) => !core.includes(id)),
    setPlugin: (id: string, enabled: boolean) => {
      if (enabled) {
        state.values.enabled.push(id);
      } else {
        const index = state.values.enabled.findIndex((enabled) => enabled === id);
        index !== -1 && state.values.enabled.splice(index, 1);
      }
    },
  });

  state.prop({ key: 'enabled', type: LocalStorageStore.json<string[]>() });

  return {
    meta: {
      id: PLUGIN_HOST,
      name: 'Plugin host',
    },
    provides: {
      plugins: state.values,
      context: ({ children }) => <PluginProvider value={state.values}>{children}</PluginProvider>,
      root: () => {
        return (
          <ErrorBoundary fallback={fallback}>
            <Root order={order} core={core} definitions={definitions} state={state.values} placeholder={placeholder} />
          </ErrorBoundary>
        );
      },
    },
  };
};

const DefaultFallback = ({ error }: { error: Error }) => {
  return (
    <div style={{ padding: '1rem' }}>
      {/* TODO(wittjosiah): Link to docs for replacing default. */}
      <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.5rem 0' }}>{error.message}</h1>
      <pre>{error.stack}</pre>
    </div>
  );
};

type RootProps = {
  order: PluginDefinition['meta'][];
  state: PluginContext;
  definitions: Record<string, () => Promise<PluginDefinition>>;
  core: string[];
  placeholder: ReactNode;
};

const Root = ({ order, core: corePluginIds, definitions, state, placeholder }: RootProps) => {
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    log('initializing plugins', { enabled: state.enabled });
    const timeout = setTimeout(async () => {
      try {
        const enabledIds = [...corePluginIds, ...state.enabled].sort((a, b) => {
          const indexA = order.findIndex(({ id }) => id === a);
          const indexB = order.findIndex(({ id }) => id === b);
          return indexA - indexB;
        });

        const enabled = await Promise.all(
          enabledIds
            .map((id) => definitions[id])
            // If local storage indicates a plugin is enabled, but it is not available, ignore it.
            .filter((definition): definition is () => Promise<PluginDefinition> => Boolean(definition))
            .map((definition) => definition()),
        );

        const plugins = await Promise.all(
          enabled.map(async (definition) => {
            const plugin = await initializePlugin(definition).catch((err) => {
              log.error('Failed to initialize plugin:', { id: definition.meta.id, err });
              return undefined;
            });
            return plugin;
          }),
        ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));
        log('plugins initialized', { plugins });

        await Promise.all(enabled.map((pluginDefinition) => pluginDefinition.ready?.(plugins)));
        log('plugins ready', { plugins });

        state.plugins = plugins;
        state.ready = true;
      } catch (err) {
        setError(err);
      }
    });

    return () => {
      clearTimeout(timeout);
      state.ready = false;
      // TODO(wittjosiah): Does this ever need to be called prior to having dynamic plugins?
      // void Promise.all(enabled.map((definition) => definition.unload?.()));
    };
  }, []);

  if (error) {
    throw error;
  }

  if (!state.ready) {
    return <>{placeholder}</>;
  }

  const ComposedContext = composeContext(state.plugins);

  return <ComposedContext>{rootComponents(state.plugins)}</ComposedContext>;
};

/**
 * Resolve a `PluginDefinition` into a fully initialized `Plugin`.
 */
export const initializePlugin = async <T, U>(pluginDefinition: PluginDefinition<T, U>): Promise<Plugin<T & U>> => {
  const provides = await pluginDefinition.initialize?.();
  return {
    ...pluginDefinition,
    provides: {
      ...pluginDefinition.provides,
      ...provides,
    } as PluginProvides<T & U>,
  };
};

const rootComponents = (plugins: Plugin[]) => {
  return plugins
    .map((plugin) => {
      const Component = plugin.provides.root;
      if (Component) {
        return <Component key={plugin.meta.id} />;
      } else {
        return null;
      }
    })
    .filter((node): node is JSX.Element => Boolean(node));
};

const composeContext = (plugins: Plugin[]) => {
  return compose(plugins.map((p) => p.provides.context!).filter(Boolean));
};

const compose = (contexts: FC<PropsWithChildren>[]) => {
  return [...contexts].reduce((Acc, Next) => ({ children }) => (
    <Acc>
      <Next>{children}</Next>
    </Acc>
  ));
};
