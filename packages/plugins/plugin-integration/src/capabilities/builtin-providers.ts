//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

import { CUSTOM_PROVIDER_ID } from '../constants';

/**
 * Built-in `IntegrationProvider` entries: custom token + stub OAuth presets
 * awaiting dedicated service plugins.
 */
export default Capability.makeModule<IntegrationProviderEntry[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      {
        id: CUSTOM_PROVIDER_ID,
        // The user enters the source in the dialog; we don't know it ahead of time.
        source: '',
        label: 'Custom Token',
      },
      // GitHub, Linear, and Slack are implemented as dedicated plugins
      // (`@dxos/plugin-github`, `@dxos/plugin-linear`, `@dxos/plugin-slack`).
    ]);
  }),
);
