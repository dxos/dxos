//
// Copyright 2026 DXOS.org
//

const PLUGIN_SPEC_SUBJECT_BRAND = '@dxos/plugin-code/plugin-spec';

/**
 * Subject attached to the per-plugin `spec` graph node. Carries the bundled
 * MDL content (via `Plugin.Meta.specContent`) so the spec surface can render
 * it via {@link SpecView} without any ECHO binding.
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
  typeof value === 'object' && value !== null && (value as { __brand?: unknown }).__brand === PLUGIN_SPEC_SUBJECT_BRAND;
