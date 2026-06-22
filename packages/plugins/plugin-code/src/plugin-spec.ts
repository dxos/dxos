//
// Copyright 2026 DXOS.org
//

const PLUGIN_SPEC_SUBJECT_BRAND = '@dxos/plugin-code/plugin-spec';

/**
 * Subject attached to the per-plugin `spec` graph node. Carries the MDL
 * content resolved from `Plugin.Meta.spec` (the relative path inside the
 * plugin's package) plus the file contents contributed via
 * {@link AppCapabilities.PluginAsset} by each plugin's
 * `addPluginAssetModule`, so the spec surface can render it via
 * `SpecArticle` (with `content` and no `subject`) without any ECHO binding.
 */
export type PluginSpecSubject = {
  readonly __brand: typeof PLUGIN_SPEC_SUBJECT_BRAND;
  readonly pluginId: string;
  readonly name: string;
  readonly content: string;
};

export const makePluginSpecSubject = (input: Omit<PluginSpecSubject, '__brand'>): PluginSpecSubject => ({
  ...input,
  __brand: PLUGIN_SPEC_SUBJECT_BRAND,
});

export const isPluginSpecSubject = (value: unknown): value is PluginSpecSubject =>
  typeof value === 'object' &&
  value !== null &&
  (value as { __brand?: unknown }).__brand === PLUGIN_SPEC_SUBJECT_BRAND &&
  typeof (value as { pluginId?: unknown }).pluginId === 'string' &&
  typeof (value as { name?: unknown }).name === 'string' &&
  typeof (value as { content?: unknown }).content === 'string';
