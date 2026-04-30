//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { IntegrationProvider } from './integration-provider';

/**
 * Shell `IntegrationProvider` entries for OAuth presets that don't yet have a
 * dedicated service plugin (github, linear, slack). They register only a
 * `source` so the OAuth preset shows up in the add-token menu and the resulting
 * token wraps in an Integration. Sync operations and `onTokenCreated` are
 * absent — sync is unavailable and no service-specific account fill happens.
 *
 * As real service plugins land (plugin-github, plugin-linear, plugin-slack),
 * each contributes its own `IntegrationProvider` and the matching entry here
 * should be removed. Capability contributions from sibling plugins won't
 * collide — there's an asymmetric "first contributor wins" check elsewhere
 * (or the dispatch site handles duplicates) — but the cleanest end state is
 * one entry per source.
 */
export default Capability.makeModule<IntegrationProvider[]>(
  Effect.fnUntraced(function* () {
    return Capability.contributes(IntegrationProvider, [
      { source: 'github.com' },
      { source: 'linear.app' },
      { source: 'slack.com' },
    ]);
  }),
);
