//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppPlugin, AppSpace } from '@dxos/app-toolkit';
import { Filter } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { Markdown } from '@dxos/plugin-markdown';
import { isNonNullable, trim } from '@dxos/util';

export const SAMPLE_CONTENT = trim`
  # Transcription

  Place the cursor here, then click the microphone in the toolbar to start recording.

  Live transcription appears inline as greyed text — confirm (✓) to insert it into the document, or cancel (✕) to discard.

`;

export type StoryGraphPluginOptions = {
  /** Plugin meta key (distinct per story so multiple graph plugins don't collide). */
  key?: string;
  /** Human-readable plugin name. */
  name?: string;
};

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of the
 * graph root, so TranscriptionPlugin's toolbar extension can attach the record action to the doc's
 * node (mirrors the comments storybook).
 */
export const StoryGraphPlugin = ({
  key = 'org.dxos.plugin.transcription.story.storyGraph',
  name = 'Story Graph',
}: StoryGraphPluginOptions = {}) =>
  Plugin.define(
    Plugin.makeMeta({
      key: DXN.make(key),
      name,
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
  )();
