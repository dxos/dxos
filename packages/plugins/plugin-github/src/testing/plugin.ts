//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { GitHubCapabilities } from '#types';

import { fixtureLinkSource } from './fixtures.ts';

/** Replaces the plugin's default fetch: a story answers every link from fixtures, deterministic per URL. */
export const FixtureLinkSourcePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.github.testing.linkSource'), name: 'Fixture link source' }),
).pipe(
  Plugin.addModule({
    id: 'linkSource',
    provides: [GitHubCapabilities.LinkSource],
    activate: () => Effect.succeed([Capability.contribute(GitHubCapabilities.LinkSource, fixtureLinkSource)]),
  }),
  Plugin.make,
);
