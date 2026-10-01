//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { useMembers } from '@dxos/halo-react';
import { ActionToolbar, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Transcription, useFeedModelAdapter } from '@dxos/react-ui-transcription';
import { Next } from '@dxos/react-ui/next';
import { Message, type Transcript } from '@dxos/types';

import { useTranscriptionRecording } from '#hooks';
import { meta } from '#meta';

import { renderByline } from '../../util/index.ts';

export type TranscriptionArticleProps = AppSurface.ObjectArticleProps<Transcript.Transcript>;

export const TranscriptionArticle = ({ role, subject: transcript, attendableId }: TranscriptionArticleProps) => {
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId);
  const feed = useResolveRef(transcript.feed);
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const model = useFeedModelAdapter(renderByline(members), messages);

  // TODO(burdon): Remove if not mutable. E.g., finalized transcript.
  const { recording, toggleRecording } = useTranscriptionRecording(transcript);
  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'toggle-recording',
          {
            label: [recording ? 'stop-recording.label' : 'start-recording.label', { ns: meta.profile.key }],
            icon: recording ? 'ph--stop-circle--regular' : 'ph--microphone--regular',
            disposition: 'toolbar',
            testId: 'transcription.toggle-recording',
          },
          toggleRecording,
        )
        .build(),
    [recording, toggleRecording],
  );

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <ActionToolbar {...menuActions} attendableId={attendableId} />
      </Next.Panel.Header>

      <Next.Panel.Body asChild>
        <Transcription model={model} transcript={transcript} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

TranscriptionArticle.displayName = 'TranscriptionArticle';
