//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { EchoId } from '@dxos/keys';
import { useMembers, useQueue } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type Message, type Transcript } from '@dxos/types';

import { Transcription } from '../../components';
import { useQueueModelAdapter } from '../../hooks';
import { renderByline } from '../../util';

export type TranscriptionContainerProps = SurfaceComponentProps<Transcript.Transcript>;

export const TranscriptionContainer = ({ role, subject: transcript, attendableId }: TranscriptionContainerProps) => {
  const db = Obj.getDatabase(transcript);
  const members = useMembers(db?.spaceId).map((member) => member.identity);
  const queueEchoId = useMemo(() => {
    const echoDxn = transcript.queue.dxn.asEchoDXN();
    return echoDxn?.spaceId && echoDxn?.echoId
      ? EchoId.fromSpaceAndObjectId(echoDxn.spaceId, echoDxn.echoId as any)
      : undefined;
  }, [transcript.queue.dxn]);
  const queue = useQueue<Message.Message>(queueEchoId, { pollInterval: 1_000 });
  const model = useQueueModelAdapter(renderByline(members), queue);

  return (
    <Panel.Root role={role}>
      <Panel.Content asChild>
        <Transcription attendableId={attendableId} model={model} transcript={transcript} />
      </Panel.Content>
    </Panel.Root>
  );
};
