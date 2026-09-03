//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { Chat } from '@dxos/assistant-toolkit';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Mic } from '#components';
import { meta } from '#meta';

/**
 * Where dictation is offered: anything with a text surface to dictate into. One matcher rather than
 * one extension per host, so a new surface is a typename here — and the hosts stay unaware that
 * transcription exists.
 */
const whenDictatable = GraphNodeMatcher.whenAll(
  AppNodeMatcher.whenEchoObjectMatches,
  GraphNodeMatcher.whenAny(
    AppNodeMatcher.whenEchoTypeMatches(Markdown.Document),
    AppNodeMatcher.whenEchoTypeMatches(Chat.Chat),
  ),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'transcriptionToolbar',
      match: (node, get) => whenDictatable(node, get),
      // The control owns recording state, mode, device selection, and entity-extraction —
      // interactions the action model cannot express (press-and-hold, an embedded dropdown, a
      // live device list) — so it renders via the custom toolbar variant rather than a plain
      // toggle action. The node is static (state lives in the control), keeping the toolbar's
      // action atom stable across recording changes.
      actions: (matched) =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: 'transcription',
            data: () => Effect.void,
            properties: {
              label: ['start-recording.label', { ns: meta.profile.key }],
              icon: 'ph--microphone--regular',
              // Both surfaces: dictation acts on whatever text is being composed, which an object
              // toolbar and a prompt row each have.
              disposition: ['toolbar', 'prompt'],
              variant: 'custom',
              render: () => <Mic docId={matched.id} />,
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
