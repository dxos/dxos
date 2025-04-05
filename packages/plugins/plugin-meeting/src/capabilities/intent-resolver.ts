//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { Capabilities, contributes, createIntent, createResolver, type PluginsContext } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { QueueSubspaceTags, DXN } from '@dxos/keys';
import { create, makeRef, refFromDXN } from '@dxos/live-object';
import { OutlinerAction } from '@dxos/plugin-outliner/types';
import { TranscriptionAction } from '@dxos/plugin-transcription/types';
import { TextType } from '@dxos/schema';

import { MeetingAction, MeetingType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ spaceId, name }) =>
        Effect.gen(function* () {
          const { dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
          const { object: transcript } = yield* dispatch(createIntent(TranscriptionAction.Create, { spaceId }));
          const { object: tree } = yield* dispatch(createIntent(OutlinerAction.CreateTree));
          const meeting = create(MeetingType, {
            name,
            created: new Date().toISOString(),
            participants: [],
            chat: refFromDXN(new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()])),
            transcript: makeRef(transcript),
            notes: makeRef(tree),
            summary: makeRef(create(TextType, { content: '' })),
          });

          return { data: { object: meeting } };
        }),
    }),
  ]);
