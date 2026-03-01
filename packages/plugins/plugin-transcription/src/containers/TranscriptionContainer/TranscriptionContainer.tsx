//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { Container } from '@dxos/react-ui';
import { type Message, type Transcript } from '@dxos/types';

import { TranscriptView } from '../../components/Transcript';
import { useQueueModelAdapter } from '../../hooks';
import { renderByline } from '../../util';

export type TranscriptionContainerProps = SurfaceComponentProps<Transcript.Transcript>;

export const TranscriptionContainer = ({ role, subject: transcript }: TranscriptionContainerProps) => {
  const attendableId = Obj.getDXN(transcript).toString();
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const queue = useQueue<Message.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <Container.Main role={role}>
      <TranscriptView attendableId={attendableId} model={model} transcript={transcript} />
    </Container.Main>
  );
};
