//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { FC, PropsWithChildren } from 'react';

/**
 * Capabilities provided by a plugin.
 * The base surface capabilities are always included.
 */
export type PluginProvides<TProvides> = TProvides & {
  /**
   * React Context which is wrapped around the application to enable any hooks the plugin may provide.
   */
  context?: FC<PropsWithChildren>;

  /*
   * React component which is rendered at the root of the application.
   */
  root?: FC<PropsWithChildren>;
};

/**
 * A unit of containment of modular functionality that can be provided to an application.
 * Plugins provide things like components, state, actions, etc. to the application.
 */
export type Plugin<TProvides = {}> = {
  meta: {
    /**
     * Globally unique ID.
     *
     * Expected to be in the form of a valid URL.
     *
     * @example dxos.org/plugin/example
     */
    id: string;

    /**
     * Short ID for use in URLs.
     *
     * NOTE: This is especially experimental and likely to change.
     */
    // TODO(wittjosiah): How should these be managed?
    shortId?: string;

    /**
     * Human-readable name.
     */
    name?: string;

    /**
     * Short description of plugin functionality.
     */
    description?: string;

    /**
     * Tags to help categorize the plugin.
     */
    tags?: string[];

    /**
     * Component to render icon for the plugin when displayed in a list.
     */
    // TODO(wittjosiah): Convert to `icon` and make serializable.
    iconComponent?: FC<IconProps>;
  };

  /**
   * Capabilities provided by the plugin.
   */
  provides: PluginProvides<TProvides>;
};

/**
 * Plugin definitions extend the base `Plugin` interface with additional lifecycle methods.
 */
export type PluginDefinition<TProvides = {}, TInitializeProvides = {}> = Omit<Plugin, 'provides'> & {
  /**
   * Capabilities provided by the plugin.
   */
  provides?: Plugin<TProvides>['provides'];

  /**
   * Initialize any async behavior required by the plugin.
   *
   * @return Capabilities provided by the plugin which are merged with base capabilities.
   */
  initialize?: () => Promise<PluginProvides<TInitializeProvides>>;

  /**
   * Called once all plugins have been initialized.
   * This is the place to do any initialization which requires other plugins to be ready.
   *
   * @param plugins All plugins which successfully initialized.
   */
  ready?: (plugins: Plugin[]) => Promise<void>;

  /**
   * Called when the plugin is unloaded.
   * This is the place to do any cleanup required by the plugin.
   */
  unload?: () => Promise<void>;
};

export const pluginMeta = (meta: Plugin['meta']) => meta;

type LazyPlugin<T> = () => Promise<{ default: (props: T) => PluginDefinition }>;

export namespace Plugin {
  export const lazy = <T>(p: LazyPlugin<T>, props?: T) => {
    return () =>
      p().then(({ default: definition }) => {
        return definition(props as T);
      });
  };
}
