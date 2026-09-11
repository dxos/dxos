//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { meta } from '#meta';
import { Markdown } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.Tour, {
      id: `${meta.profile.key}.tour.document`,
      label: ['document-tour.label', { ns: meta.profile.key }],
      matches: Tour.whenType(Markdown.Document),
      auto: true,
      steps: () => import('../tours/index.ts').then(({ steps }) => steps),
    }),
  ),
);
