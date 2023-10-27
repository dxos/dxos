//
// Copyright 2023 DXOS.org
//

import { z } from 'zod';

import type { Plugin } from '../PluginHost';

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
