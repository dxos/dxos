//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';

import { type AssetLoader, fetchAsset, makeMedia } from './assets.ts';
import { REFERENCE } from './util.ts';
import { Work } from './work.ts';

export const TEMPLATE_ID = 'org.dxos.plugin-debug.template.review';

export type Options = {
  /** Where screenshot bytes come from; defaults to fetching the pinned PR URLs. */
  readonly loadAsset?: AssetLoader;
};

/**
 * A review queue: one project whose finished tasks carry the merged dxos/dxos pull requests that
 * delivered them, with the screenshots and demo recordings attached to those PRs, and whose tasks in
 * review carry the PRs still open.
 */
export const make = ({ loadAsset = fetchAsset }: Options = {}) => {
  const phases = { media: makeMedia(loadAsset), work: Work };
  return SampleSpace.make({
    space: { name: 'Composer — Review queue', icon: 'medal-military', hue: 'green' },
    reference: REFERENCE,
    phases,
    build: (phases) =>
      Effect.gen(function* () {
        const media = yield* phases.media();
        return yield* phases.work(media);
      }),
  });
};

export const makeTemplate = (options?: Options): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: TEMPLATE_ID,
    description: 'A project with tasks carrying real dxos pull requests, their screenshots and demo videos.',
    definition: make(options),
  });
