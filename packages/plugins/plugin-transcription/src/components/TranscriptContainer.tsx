//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { type Identity } from '@dxos/react-client/halo';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { Layout } from '@dxos/react-ui';
import { type Message, type Transcript } from '@dxos/types';

import { useQueueModelAdapter } from '../hooks';
import { renderByline } from '../util';

import { TranscriptView } from './Transcript';

export type TranscriptionContainerProps = SurfaceComponentProps<Transcript.Transcript>;

export const TranscriptionContainer = ({ role, subject: transcript }: TranscriptionContainerProps) => {
  const attendableId = Obj.getDXN(transcript).toString();
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity).filter((identity): identity is Identity => identity != null);
  const queue = useQueue<Message.Message>(transcript.queue.dxn, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <Layout.Main role={role}>
      <TranscriptView attendableId={attendableId} model={model} transcript={transcript} />
    </Layout.Main>
  );
};

export default TranscriptionContainer;
