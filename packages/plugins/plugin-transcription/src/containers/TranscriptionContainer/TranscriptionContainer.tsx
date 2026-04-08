//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type Message, type Transcript } from '@dxos/types';

import { Transcription } from '#components';
import { useQueueModelAdapter } from '#hooks';
import { renderByline } from '../../util';

export type TranscriptionContainerProps = AppSurface.ObjectArticleProps<Transcript.Transcript>;

export const TranscriptionContainer = ({ role, subject: transcript, attendableId }: TranscriptionContainerProps) => {
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const queue = useQueue<Message.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <Transcription attendableId={attendableId} model={model} transcript={transcript} />
      </Panel.Content>
    </Panel.Root>
  );
};
