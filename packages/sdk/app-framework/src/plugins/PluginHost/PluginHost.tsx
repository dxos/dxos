//
// Copyright 2023 DXOS.org
//

import { deepSignal, shallow } from 'deepsignal/react';
import React, { useEffect, type FC, type PropsWithChildren, type ReactNode } from 'react';

import { log } from '@dxos/log';

import { type PluginContext, PluginProvider } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginProvides } from './plugin';

export type BootstrapPluginsParams = {
  plugins: PluginDefinition[];
  fallback?: ReactNode | FC<Omit<PluginContext, 'ready'>>;
};

export type PluginHostProvides = {
  plugins: PluginContext;
};

export const parsePluginHost = (plugin: Plugin) =>
  (plugin.provides as PluginHostProvides).plugins ? (plugin as Plugin<PluginHostProvides>) : undefined;

/**
 * Bootstraps an application by initializing plugins and rendering root components.
 */
export const PluginHost = ({
  plugins: definitions,
  fallback,
}: BootstrapPluginsParams): PluginDefinition<PluginHostProvides> => {
  const state = deepSignal<PluginContext>({ ready: false, initializing: [], loading: [], plugins: [] });

  return {
    meta: {
      id: 'dxos.org/plugin/host',
    },
    provides: {
      plugins: state,
      context: ({ children }) => <PluginProvider value={state}>{children}</PluginProvider>,
      root: () => {
        useEffect(() => {
          log('initializing plugins', { definitions });
          const timeout = setTimeout(async () => {
            state.initializing = shallow(definitions);
            const plugins = await Promise.all(
              definitions.map(async (definition) => {
                const plugin = await initializePlugin(definition).catch((err) => {
                  console.error('Failed to initialize plugin:', definition.meta.id, err);
                  return undefined;
                });
                state.initializing = shallow(state.initializing.filter((plugin) => plugin !== definition));
                return plugin;
              }),
            ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));

            log('plugins initialized', { plugins });
            state.loading = shallow(definitions);
            await Promise.all(
              definitions.map(async (pluginDefinition) => {
                await pluginDefinition.ready?.(plugins);
                state.loading = shallow(state.loading.filter((plugin) => plugin !== pluginDefinition));
              }),
            );

            log('plugins ready', { plugins });
            state.plugins = shallow(plugins);
            state.ready = true;
          });

          return () => {
            clearTimeout(timeout);
            state.ready = false;
            void Promise.all(definitions.map((definition) => definition.unload?.()));
          };
        }, []);

        if (!state.ready) {
          if (typeof fallback === 'function') {
            const FallbackComponent = fallback;
            return (
              <FallbackComponent initializing={state.initializing} loading={state.loading} plugins={state.plugins} />
            );
          }
          return <>{fallback ?? null}</>;
        }

        const ComposedContext = composeContext(state.plugins);

        return <ComposedContext>{rootComponents(state.plugins)}</ComposedContext>;
      },
    },
  };
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
// export const PluginHost = ({ plugins: definitions, fallback }: BootstrapPluginsParams): PluginDefinition => {
//   // const state = deepSignal<PluginContext>({ ready: false, initializing: [], loading: [], plugins: [] });

//   return {
//     meta: {
//       id: 'dxos.org/plugin/host',
//     },
//     provides: {
//       // plugins: state,
//       // context: ({ children }) => <PluginProvider value={state}>{children}</PluginProvider>,
//       root: () => {
//         const [plugins, setPlugins] = useState<Plugin[]>();
//         const [initializing, setInitializing] = useState<PluginDefinition[]>([]);
//         const [loading, setLoading] = useState<PluginDefinition[]>([]);
//         useEffect(() => {
//           log('initializing plugins', { definitions });
//           const timeout = setTimeout(async () => {
//             setInitializing(definitions);
//             const plugins = await Promise.all(
//               definitions.map(async (definition) => {
//                 const plugin = await initializePlugin(definition).catch((err) => {
//                   console.error('Failed to initialize plugin:', definition.meta.id, err);
//                   return undefined;
//                 });
//                 setInitializing((initializing) => initializing.filter((plugin) => plugin !== definition));
//                 return plugin;
//               }),
//             ).then((plugins) => plugins.filter((plugin): plugin is Plugin => Boolean(plugin)));

//             log('plugins initialized', { plugins });
//             setLoading(definitions);
//             await Promise.all(
//               definitions.map(async (pluginDefinition) => {
//                 await pluginDefinition.ready?.(plugins);
//                 setLoading((loading) => loading.filter((plugin) => plugin !== pluginDefinition));
//               }),
//             );

//             log('plugins ready', { plugins });
//             setPlugins(plugins);
//           });

//           return () => {
//             clearTimeout(timeout);
//             void Promise.all(definitions.map((definition) => definition.unload?.()));
//           };
//         }, []);

//         if (!plugins) {
//           if (typeof fallback === 'function') {
//             const FallbackComponent = fallback;
//             return <FallbackComponent initializing={initializing} loading={loading} />;
//           }
//           return <>{fallback ?? null}</>;
//         }

//         const ComposedContext = composeContext(plugins);

//         return (
//           <PluginProvider value={{ plugins, initializing, loading, ready: true }}>
//             <ComposedContext>{rootComponents(plugins)}</ComposedContext>
//           </PluginProvider>
//         );
//       },
//     },
//   };
// };
