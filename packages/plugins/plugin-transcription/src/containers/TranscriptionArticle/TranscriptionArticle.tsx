//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useMembers, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { type Transcript, Message } from '@dxos/types';

import { Transcription } from '#components';
import { useFeedModelAdapter, useTranscriptionRecording } from '#hooks';
import { meta } from '#meta';

import { renderByline } from '../../util';

export type TranscriptionArticleProps = AppSurface.ObjectArticleProps<Transcript.Transcript>;

export const TranscriptionArticle = ({ role, subject: transcript, attendableId }: TranscriptionArticleProps) => {
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const feed = transcript.feed.target;
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const model = useFeedModelAdapter(renderByline(members), messages);
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
    <Panel.Root role={role}>
      <Menu.Root {...menuActions} attendableId={attendableId}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
      </Menu.Root>
      <Panel.Content asChild>
        <Transcription model={model} transcript={transcript} />
      </Panel.Content>
    </Panel.Root>
  );
};
