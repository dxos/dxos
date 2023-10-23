//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import type { Graph, Node } from '@dxos/app-graph';
import type { UnsubscribeCallback } from '@dxos/async';

import type { Plugin } from './PluginHost';

//
// Layout
//

/**
 * Basic state provided by a layout plugin.
 */
export const Layout = z.object({
  fullscreen: z.boolean(),
  sidebarOpen: z.boolean(),
  complementarySidebarOpen: z.boolean(),

  dialogContent: z.any().optional().describe('Data to be passed to the dialog Surface.'),
  dialogOpen: z.boolean(),

  popoverAnchorId: z.string().optional(),
  popoverContent: z.any().optional().describe('Data to be passed to the popover Surface.'),
  popoverOpen: z.boolean(),

  // TODO(wittjosiah): Array?
  active: z.string().optional().describe('Id of the currently active item.'),
  // TODO(wittjosiah): History?
  previous: z.string().optional(),
});

export type Layout = z.infer<typeof Layout>;

/**
 * Provides for a plugin that can manage the app layout.
 */
export type LayoutPluginProvides = {
  layout: Readonly<Layout>;
};

/**
 * Type guard for layout plugins.
 */
export const parseLayoutPlugin = (plugin: Plugin) => {
  const { success } = Layout.safeParse((plugin.provides as any).layout);
  return success ? (plugin as Plugin<LayoutPluginProvides>) : undefined;
};

//
// Translations
//

export const ResourceKey = z.union([z.string(), z.record(z.any())]);
export type ResourceKey = z.infer<typeof ResourceKey>;

export const ResourceLanguage = z.record(ResourceKey);
export type ResourceLanguage = z.infer<typeof ResourceLanguage>;

/**
 * A resource is a collection of translations for a language.
 */
export const Resource = z.record(ResourceLanguage);
export type Resource = z.infer<typeof Resource>;

/**
 * Provides for a plugin that exposes translations.
 */
export type TranslationsProvides = {
  translations: Readonly<Resource[]>;
};

/**
 * Type guard for translation plugins.
 */
export const parseTranslationsPlugin = (plugin: Plugin) => {
  const { success } = z.array(Resource).safeParse((plugin.provides as any).translations);
  return success ? (plugin as Plugin<TranslationsProvides>) : undefined;
};

//
// Graph
//

/**
 * Provides for a plugin that exposes the application graph.
 */
export type GraphPluginProvides = {
  graph: Graph;
};

export type GraphBuilderProvides = {
  graph: {
    builder: (params: { parent: Node; plugins: Plugin[] }) => UnsubscribeCallback | void;
  };
};

/**
 * Type guard for graph plugins.
 */
export const parseGraphPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.root ? (plugin as Plugin<GraphPluginProvides>) : undefined;

/**
 * Type guard for graph builder plugins.
 */
export const parseGraphBuilderPlugin = (plugin: Plugin) =>
  (plugin.provides as any).graph?.builder ? (plugin as Plugin<GraphBuilderProvides>) : undefined;
