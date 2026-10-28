//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Chat from '@dxos/assistant/Chat';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { Mic } from '#components';
import { meta } from '#meta';
import { Dictatable } from '#types';

// A chat is dictated into through its prompt node, not its toolbar.
const whenDictatable = GraphNodeMatcher.whenAll(
  AppNodeMatcher.whenEchoObjectMatches,
  GraphNodeMatcher.whenAny(...Dictatable.types.map((type) => AppNodeMatcher.whenEchoTypeMatches(type))),
  GraphNodeMatcher.whenNot(AppNodeMatcher.whenEchoTypeMatches(Chat.Chat)),
);

// The control owns recording state, mode, device selection, and entity-extraction — interactions the
// action model cannot express (press-and-hold, an embedded dropdown, a live device list) — so it renders
// via the custom toolbar variant rather than a plain toggle action. The node is static (state lives in
// the control), keeping the toolbar's action atom stable across recording changes.
const makeMicAction = (docId: string, disposition: string) =>
  AppGraphNode.makeAction({
    id: 'transcription',
    data: () => Effect.void,
    properties: {
      label: ['start-recording.label', { ns: meta.profile.key }],
      icon: 'ph--microphone--regular',
      disposition,
      variant: 'custom',
      render: () => <Mic docId={docId} />,
    },
  });

/** The mic in the toolbar of a dictatable document and in every chat prompt, whether or not its chat is stored yet. */
export const createMicExtensions = () =>
  Effect.all([
    AppGraphBuilder.createExtension({
      id: 'transcriptionToolbar',
      match: (node, get) => whenDictatable(node, get),
      actions: (matched) => Effect.succeed([makeMicAction(matched.id, 'toolbar')]),
    }),
    AppGraphBuilder.createExtension({
      id: 'transcriptionPrompt',
      match: GraphNodeMatcher.whenNodeType(AppNode.PROMPT_TYPE),
      actions: (matched) => Effect.succeed([makeMicAction(matched.id, 'prompt')]),
    }),
  ]);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* createMicExtensions();
    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
