//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { Markdown } from '#types';

import { getMarkdownAnchorText } from '../model/selection.ts';

// Ordering-only: registers the anchor text resolver once the app graph exists (mirrors the
// AppGraphReady ordering the event-mode module used previously); the body reads nothing.
export const AnchorResolver = Capability.makeModule(
  'AnchorResolver',
  { requires: [AppCapabilities.AppGraph], provides: [AppCapabilities.AnchorResolver], environments: [] },
  () =>
    Effect.succeed(
      Capability.contribute(AppCapabilities.AnchorResolver, {
        key: Type.getTypename(Markdown.Document),
        getText: getMarkdownAnchorText,
      }),
    ),
);
