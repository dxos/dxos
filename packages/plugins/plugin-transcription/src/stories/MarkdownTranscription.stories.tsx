//
// Copyright 2026 DXOS.org
//

import { type StateEffect } from '@codemirror/state';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, AppSpace } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { appendPendingText, setPendingAnchor, setPendingInterim } from '@dxos/ui-editor';
import { isNonNullable } from '@dxos/util';

import { translations } from '#translations';

import { TranscriptionPlugin } from '../TranscriptionPlugin';

const SAMPLE_CONTENT = [
  '# Transcription',
  '',
  'Place the cursor here, then click the microphone in the toolbar to start recording.',
  '',
  'Live transcription appears inline as greyed text — confirm (✓) to insert it into the document, or cancel (✕) to discard.',
  '',
].join('\n');

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of the
 * graph root, so TranscriptionPlugin's toolbar extension can attach the record action to the doc's
 * node (mirrors the comments storybook).
 */
const StoryGraphPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.transcription.story.storyGraph'),
    name: 'Story Graph',
  }),
).pipe(
  AppPlugin.addAppGraphModule({
    activate: Effect.fnUntraced(function* () {
      const capabilities = yield* Capability.Service;
      const extensions = yield* GraphBuilder.createExtension({
        id: 'storyDocs',
        match: NodeMatcher.whenRoot,
        connector: (_, get) =>
          Effect.gen(function* () {
            const client = capabilities.get(ClientCapabilities.Client);
            const space = AppSpace.getPersonalSpace(client);
            if (!space) {
              return [];
            }
            const docs = get(space.db.query(Filter.type(Markdown.Document)).atom);
            return docs
              .map((object) => AppNode.makeObject({ get, db: space.db, object, droppable: false }))
              .filter(isNonNullable);
          }),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

type StoryArgs = {
  /**
   * Seed the pending-text decoration directly (final/interim text), bypassing audio capture, to
   * showcase the recording-state preview deterministically in stories and the headless storybook test.
   */
  seed?: { final?: string; interim?: string };
};

// Renders the real plugin-markdown editor surface. TranscriptionPlugin contributes both the
// start/stop toolbar button (via AppGraphBuilder) and the pending-text CodeMirror extension (via
// MarkdownCapabilities.ExtensionProvider), so toggling the toolbar microphone streams live
// transcription into the document as a greyed pending block with inline confirm/cancel.
const DefaultStory = ({ seed }: StoryArgs) => {
  const { graph } = useAppGraph();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);
  // Mark the editor attended so its toolbar (and the contributed actions) are active.
  const attentionAttrs = useAttentionAttributes(attendableId);
  const [editorViews] = useCapabilities(MarkdownCapabilities.EditorViews);

  // Story renders the surface directly (no deck), so expand the doc node's actions.
  useEffect(() => {
    if (attendableId) {
      void Graph.expand(graph, attendableId, 'action');
    }
  }, [graph, attendableId]);

  // Seed the pending-text decoration once the editor view has registered (no mic required).
  useEffect(() => {
    if (!seed || !attendableId || !editorViews) {
      return;
    }
    let cancelled = false;
    const trySeed = () => {
      const entry = editorViews.get(attendableId);
      if (!entry) {
        return false;
      }
      // Anchor the pending block at the end of the document.
      const anchor = entry.view.state.doc.length;
      const effects: StateEffect<unknown>[] = [setPendingAnchor.of({ anchor, placeholder: 'Recording…' })];
      if (seed.final) {
        effects.push(appendPendingText.of(seed.final));
      }
      if (seed.interim) {
        effects.push(setPendingInterim.of(seed.interim));
      }
      entry.view.dispatch({ effects });
      return true;
    };
    if (trySeed()) {
      return;
    }
    const interval = setInterval(() => {
      if (cancelled || trySeed()) {
        clearInterval(interval);
      }
    }, 50);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [seed, attendableId, editorViews]);

  const data = useMemo(() => ({ subject: doc, attendableId: attendableId ?? 'story' }), [doc, attendableId]);

  if (!doc) {
    return <Loading data={{ doc: !!doc }} />;
  }

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/MarkdownTranscription',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(Markdown.make({ name: 'Transcription', content: SAMPLE_CONTENT }));
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        TranscriptionPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Shows the recording-state decoration at the end of the document: finalized text on the comment
 * surface, the volatile interim tail distinguished, and the inline confirm/cancel affordances —
 * seeded without a microphone.
 */
export const Recording: Story = {
  args: {
    seed: {
      final: 'The quick brown fox jumps over the lazy dog.',
      interim: ' And the in-flight words still being transcribed',
    },
  },
};

/**
 * Shows the "Recording…" placeholder shown at the end of the document the moment recording starts,
 * before any text has been transcribed.
 */
export const RecordingIndicator: Story = {
  args: {
    seed: {},
  },
};
