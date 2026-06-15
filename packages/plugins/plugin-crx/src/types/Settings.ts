//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * User preferences that govern how Composer coordinates with the composer-crx
 * browser extension — both the page-actions bridge and the render-proxy. All fields
 * are optional; defaults are applied by consumers when reading the atom.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    /**
     * Master toggle. When false, the bridge plugin ignores incoming extension actions.
     * Defaults to `true`.
     */
    enabled: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Accept extension actions',
        description: 'When off, actions sent from the composer-crx browser extension are ignored.',
      }),
    ),

    /**
     * Navigate to the created object after the extension creates one. Defaults to
     * `false` to avoid yanking focus during active work.
     */
    autoOpenAfterClip: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Open after action',
        description: 'Navigate to the created object when the extension creates one.',
      }),
    ),

    /**
     * Master toggle. When false, plugins fall back to the edge HTTP proxy instead of asking the
     * extension to render pages. Defaults to `true`.
     */
    renderProxyEnabled: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Use extension to render pages',
        description: 'Let plugins render pages via the browser extension to scrape client-rendered sites.',
      }),
    ),

    /**
     * Maximum time (ms) to wait for a page to render before aborting. Defaults to `20000`.
     */
    renderTimeout: Schema.optional(
      Schema.Number.annotations({
        title: 'Render timeout (ms)',
        description: 'Maximum time to wait for a page to finish rendering before giving up.',
      }),
    ),

    /**
     * Render pages in a focused (foreground) tab. Helps sites that defer loading when backgrounded,
     * at the cost of stealing focus. Defaults to `false`.
     */
    renderActiveTab: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Render in focused tab',
        description: 'Render pages in a focused tab; helps sites that defer loading when backgrounded.',
      }),
    ),

    /**
     * Enable verbose logging and debug previews in the extension. Defaults to `false`.
     */
    developerMode: Schema.optional(
      Schema.Boolean.annotations({
        title: 'Developer mode',
        description: 'Enable verbose logging and debug previews in the browser extension.',
      }),
    ),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

/**
 * Default values applied when a field is absent. Kept separate from the
 * schema so `createKvsStore` can store only user-set values while consumers
 * (this plugin's components, and any downstream reader) see sensible
 * defaults.
 */
export const defaults: Required<Settings> = {
  enabled: true,
  autoOpenAfterClip: false,
  renderProxyEnabled: true,
  renderTimeout: 20_000,
  renderActiveTab: false,
  developerMode: false,
};

export const withDefaults = (settings: Settings): Required<Settings> => ({
  ...defaults,
  ...settings,
});
