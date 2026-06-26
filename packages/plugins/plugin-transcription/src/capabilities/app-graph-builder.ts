//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Markdown } from '@dxos/plugin-markdown/types';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { TranscriptionCapabilities } from '#types';

const whenMarkdownDocument = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObjectMatches,
  NodeMatcher.whenEchoTypeMatches(Markdown.Document),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'transcriptionToolbar',
        match: (node, get) => whenMarkdownDocument(node, get),
        actions: (matched, get) => {
          const sessionAtom = capabilities.get(TranscriptionCapabilities.RecordingSession);
          const session = get(sessionAtom);
          const recording = !!session?.recording && session.id === matched.id;

          return Effect.succeed([
            {
              id: 'transcription',
              data: Effect.fnUntraced(function* () {
                const registry = capabilities.get(Capabilities.AtomRegistry);
                const current = registry.get(sessionAtom);
                const active = !!current?.recording && current.id === matched.id;
                // Toggle: a single audio device means one active session, so starting one replaces any other.
                registry.set(sessionAtom, active ? null : { id: matched.id, recording: true });
              }),
              properties: {
                label: recording
                  ? ['stop-recording.label', { ns: meta.profile.key }]
                  : ['start-recording.label', { ns: meta.profile.key }],
                icon: 'ph--microphone--regular',
                // Highlight the control with the error (rose) tone while recording.
                classNames: recording ? 'bg-error-surface' : undefined,
                disposition: 'toolbar',
                testId: 'transcription.record.toggle',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
