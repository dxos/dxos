//
// Copyright 2023 DXOS.org
//

import { FC, PropsWithChildren } from 'react';

/**
 * Props passed to a component by the `Surface` resolver.
 */
export type ComponentProps = PropsWithChildren<{
  data: any;
  role?: string;
}>;

export type PluginProvides<TProvides> = TProvides & {
  /**
   * React Context which is wrapped around the application to enable any hooks the plugin may provide.
   */
  context?: FC<PropsWithChildren>;

  /**
   * Used by the `Surface` resolver to find a component to render when presented with data but no component name.
   */
  component?: <P extends PropsWithChildren = PropsWithChildren>(
    data: unknown,
    role?: string,
    props?: Partial<P>,
  ) => FC<ComponentProps> | undefined | null | false | 0;

  /**
   * Used by the `Surface` resolver to find a component by name.
   */
  components?: Record<string, FC<ComponentProps>> & { default?: FC };
};

export type Plugin<TProvides = {}> = {
  meta: {
    /**
     * Globally unique identifier for the plugin.
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
  };

  /**
   * Capabilities provided by the plugin.
   */
  provides: PluginProvides<TProvides>;
};

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

/**
 * Find a plugin by ID.
 */
export const findPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> | undefined => {
  return plugins.find(
    (plugin) => plugin.meta.id === id || (typeof plugin.meta.shortId === 'string' && plugin.meta.shortId === id),
  ) as Plugin<T>;
};
