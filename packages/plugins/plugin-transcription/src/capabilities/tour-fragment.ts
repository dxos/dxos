//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Chat from '@dxos/assistant/Chat';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as SupportCapabilities from '@dxos/plugin-support/SupportCapabilities';
import * as Tour from '@dxos/plugin-support/Tour';

/**
 * Adds a dictation step wherever the control appears. Kept in step with `whenDictatable` in the
 * graph builder, which decides where the control itself is offered.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(SupportCapabilities.TourFragment, {
      matches: Tour.whenTypes([Markdown.Document, Chat.Chat]),
      steps: () => import('../tours/index.ts').then(({ steps }) => steps),
    }),
  ),
);
