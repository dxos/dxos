//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown/types';

import { Mic } from '#components';
import { meta } from '#meta';

const whenMarkdownDocument = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObjectMatches,
  NodeMatcher.whenEchoTypeMatches(Markdown.Document),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'transcriptionToolbar',
        match: (node, get) => whenMarkdownDocument(node, get),
        // The control owns recording state, mode, device selection, and entity-extraction —
        // interactions the action model cannot express (press-and-hold, an embedded dropdown, a
        // live device list) — so it renders via the custom toolbar variant rather than a plain
        // toggle action. The node is static (state lives in the control), keeping the toolbar's
        // action atom stable across recording changes.
        actions: (matched) =>
          Effect.succeed([
            Node.makeAction({
              id: 'transcription',
              data: () => Effect.void,
              properties: {
                label: ['start-recording.label', { ns: meta.profile.key }],
                icon: 'ph--microphone--regular',
                disposition: 'toolbar',
                variant: 'custom',
                render: () => <Mic docId={matched.id} />,
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
