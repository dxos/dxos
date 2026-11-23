//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability$ from '@dxos/app-framework/Capability';

import { type Translations } from '../app/index.ts';
import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Adapts a module exporting `translations` into a module body contributing them.
 * Default export: a manifest loads adapters by URL, like module bodies. Keeps the body's other exports,
 * where hot replacement finds its key.
 */
export default <M extends { translations: Translations.Resource | Translations.Resource[] }>(module: M) => ({
  ...module,
  default: () =>
    Effect.succeed([
      Capability$.contribute(
        AppCapabilities.Translations,
        Array.isArray(module.translations) ? module.translations : [module.translations],
      ),
    ]),
});
