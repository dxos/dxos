//
// Copyright 2023 DXOS.org
//

import React, { type JSX, type FC, type PropsWithChildren, type ReactNode, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { type HostPluginParams } from './HostPlugin';
import { type PluginContext } from './PluginContext';
import { type Plugin, type PluginDefinition, type PluginProvides } from './plugin';

export type PluginContainerProps = Pick<HostPluginParams, 'core'> & {
  plugins: Record<string, () => Promise<PluginDefinition>>;
  state: PluginContext;
  placeholder: ReactNode;
};

/**
 * Root component initializes plugins.
 */
export const PluginContainer = ({ plugins: definitions, core, state, placeholder }: PluginContainerProps) => {
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    log('initializing plugins', { enabled: state.enabled });
    const t = setTimeout(async () => {
      try {
        const enabledIds = [...core, ...state.enabled];
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
            });

            log('initialized', { plugin: definition.meta.id });
            return plugin;
          }),
        );

        const initialized = plugins.filter((plugin): plugin is Plugin => Boolean(plugin));
        log('plugins initialized', { plugins: initialized });

        await Promise.all(enabled.map((plugin) => plugin.ready?.({ plugins: initialized })));
        log('plugins ready', { plugins: initialized });

        state.plugins = initialized;
        state.ready = true;
      } catch (err) {
        setError(err);
      }
    });

    return () => {
      clearTimeout(t);
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
const initializePlugin = async <T, U>(pluginDefinition: PluginDefinition<T, U>): Promise<Plugin<T & U>> => {
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
