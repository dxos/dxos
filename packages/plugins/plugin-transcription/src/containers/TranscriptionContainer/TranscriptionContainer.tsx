//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useFeedQuery, useMembers } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Message, type Transcript } from '@dxos/types';

import { Transcription } from '#components';
import { useFeedModelAdapter } from '#hooks';

import { renderByline } from '../../util';

export type TranscriptionContainerProps = AppSurface.ObjectArticleProps<Transcript.Transcript>;

export const TranscriptionContainer = ({ role, subject: transcript, attendableId }: TranscriptionContainerProps) => {
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const feed = transcript.feed.target;
  const messages = useFeedQuery(feed, Filter.type(Message.Message)) as Message.Message[];
  const model = useFeedModelAdapter(renderByline(members), messages);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <Transcription attendableId={attendableId} model={model} transcript={transcript} />
      </Panel.Content>
    </Panel.Root>
  );
};
