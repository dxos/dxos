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
import { Video, VideoOperation } from '#types';

/**
 * Contributes the video operations to a Video object's app-graph node, so they appear in the
 * article's menu: fetch the transcript from captions, transcribe via the EDGE worker, and create the
 * AI summary. These are explicit alternatives to the on-demand generation the surfaces run.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extension = yield* GraphBuilder.createExtension({
      id: `${meta.id}/video-actions`,
      match: (node) => (Obj.instanceOf(Video.Video, node.data) ? Option.some(node.data as Video.Video) : Option.none()),
      actions: (video) =>
        Effect.succeed([
          {
            id: `${video.id}-fetch-transcript`,
            data: () =>
              Operation.invoke(
                VideoOperation.FetchTranscript,
                { video: Ref.make(video) },
                { spaceId: Obj.getDatabase(video)?.spaceId },
              ),
            properties: {
              label: ['fetch-transcript.label', { ns: meta.id }],
              icon: 'ph--closed-captioning--regular',
              disposition: 'list-item',
            },
          },
          {
            id: `${video.id}-transcribe`,
            data: () =>
              Operation.invoke(
                VideoOperation.Transcribe,
                { video: Ref.make(video) },
                { spaceId: Obj.getDatabase(video)?.spaceId },
              ),
            properties: {
              label: ['transcribe.label', { ns: meta.id }],
              icon: 'ph--subtitles--regular',
              disposition: 'list-item',
            },
          },
          {
            id: `${video.id}-summarize`,
            data: () =>
              Operation.invoke(
                VideoOperation.Summarize,
                { video: Ref.make(video) },
                { spaceId: Obj.getDatabase(video)?.spaceId },
              ),
            properties: {
              label: ['summarize.label', { ns: meta.id }],
              icon: 'ph--text-align-left--regular',
              disposition: 'list-item',
            },
          },
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, [extension]);
  }),
);
