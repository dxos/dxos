//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '#meta';

// Import only the (lightweight) Video type directly — NOT via the `#types` barrel. The barrel also
// evaluates `VideoOperation`, which pulls the `@dxos/ai` stack; importing that here would drag the
// whole AI stack into early boot (this module contributes `AppCapabilities.AppGraphBuilder`). The
// operations are lazy-imported in the action handlers below, so `@dxos/ai` only loads when a menu
// item is invoked.
import * as Video from '../types/Video';

/**
 * Contributes the video operations to a Video object's app-graph node, so they appear in the
 * article's menu: fetch the transcript from captions, transcribe via the EDGE worker, and create the
 * AI summary. These are explicit alternatives to the on-demand generation the surfaces run.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Lazy-load the operation definitions (and their `@dxos/ai` dependency) only at click time, so the
    // AI stack stays out of early boot. Each action references its concrete operation (the three ops
    // have distinct output types, so a name-indexed helper would not typecheck).
    const loadOps = () => Effect.promise(() => import('../types/VideoOperation'));
    const scope = (video: Video.Video) => ({ spaceId: Obj.getDatabase(video)?.spaceId });

    const extension = yield* GraphBuilder.createExtension({
      id: 'videoActions',
      match: (node) => (Obj.instanceOf(Video.Video, node.data) ? Option.some(node.data as Video.Video) : Option.none()),
      actions: (video) =>
        Effect.succeed([
          {
            id: `${video.id}-fetch-transcript`,
            data: () =>
              Effect.gen(function* () {
                const ops = yield* loadOps();
                return yield* Operation.invoke(ops.FetchTranscript, { video: Ref.make(video) }, scope(video));
              }),
            properties: {
              label: ['fetch-transcript.label', { ns: meta.profile.key }],
              icon: 'ph--closed-captioning--regular',
              disposition: 'list-item',
            },
          },
          {
            id: `${video.id}-transcribe`,
            data: () =>
              Effect.gen(function* () {
                const ops = yield* loadOps();
                return yield* Operation.invoke(ops.Transcribe, { video: Ref.make(video) }, scope(video));
              }),
            properties: {
              label: ['transcribe.label', { ns: meta.profile.key }],
              icon: 'ph--subtitles--regular',
              disposition: 'list-item',
            },
          },
          {
            id: `${video.id}-summarize`,
            data: () =>
              Effect.gen(function* () {
                const ops = yield* loadOps();
                return yield* Operation.invoke(ops.Summarize, { video: Ref.make(video) }, scope(video));
              }),
            properties: {
              label: ['summarize.label', { ns: meta.profile.key }],
              icon: 'ph--text-align-left--regular',
              disposition: 'list-item',
            },
          },
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
