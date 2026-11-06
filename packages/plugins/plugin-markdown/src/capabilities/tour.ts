//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Tour from '@dxos/app-toolkit/Tour';

import { Markdown } from '#types';

import { MarkdownNamespace } from '../namespace.ts';
import { steps } from '../tours/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.Tour, {
      id: `${MarkdownNamespace.key}.tour.document`,
      label: ['document-tour.label', { ns: MarkdownNamespace.key }],
      matches: Tour.whenType(Markdown.Document),
      auto: true,
      steps,
    }),
  ),
);
