//
// Copyright 2026 DXOS.org
//

import { type StateEffect } from '@codemirror/state';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities, AppNode, AppPlugin, AppSpace } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';
import { appendPendingText, cancelPendingText, setPendingAnchor, setPendingInterim } from '@dxos/ui-editor';
import { isNonNullable } from '@dxos/util';

export const SAMPLE_CONTENT = [
  '# Transcription',
  '',
  'Place the cursor here, then click the microphone in the toolbar to start recording.',
  '',
  'Live transcription appears inline as greyed text — confirm (✓) to insert it into the document, or cancel (✕) to discard.',
  '',
  '',
].join('\n');

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of the
 * graph root, so TranscriptionPlugin's toolbar extension can attach the record action to the doc's
 * node (mirrors the comments storybook).
 */
export const StoryGraphPlugin = Plugin.define(
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
            // Tolerate the teardown window when stories swap: the Client capability may already be
            // removed while this reactive connector recomputes once more (use `getAll`, not the
            // throwing `get`).
            const [client] = capabilities.getAll(ClientCapabilities.Client);
            const space = client && AppSpace.getPersonalSpace(client);
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

export type StoryArgs = {
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
export const DefaultStory = ({ seed }: StoryArgs) => {
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
    if (!attendableId || !editorViews) {
      return;
    }
    // Clear any previously-seeded decoration when seeding stops.
    if (!seed) {
      editorViews.get(attendableId)?.view.dispatch({ effects: cancelPendingText.of() });
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
