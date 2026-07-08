//
// Copyright 2024 DXOS.org
//

import React, { useEffect } from 'react';

import { useAtomCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useMembers, useQuery } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Transcription, renderByline, useFeedModelAdapter } from '@dxos/react-ui-transcription';
import { Message, type Transcript } from '@dxos/types';

import { useTranscriptionRecording } from '#hooks';
import { meta } from '#meta';
import { TranscriptionCapabilities } from '#types';

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

  // TODO(burdon): Remove if not mutable. E.g., finalized transcript.
  const { recording, toggleRecording } = useTranscriptionRecording(transcript);

  // A meeting-managed transcript is written by an open TranscriptionManager (native RealtimeKit segments), so
  // suppress the local recorder to avoid a second, per-client capture into the same feed. The standalone case
  // (no manager bound to this feed) keeps the mic button.
  const managedFeeds = useAtomCapability(TranscriptionCapabilities.ManagedFeeds);
  const managed = !!feed && managedFeeds.has(Obj.getURI(feed));

  // Hiding the toolbar action only stops new local recordings — an already-running one keeps capturing.
  // Force it off so a meeting turning on native transcription can't double-write this feed.
  useEffect(() => {
    if (managed && recording) {
      toggleRecording();
    }
  }, [managed, recording, toggleRecording]);

  const menuActions = useMenuBuilder(() => {
    const builder = MenuBuilder.make();
    return (
      managed
        ? builder
        : builder.action(
            'toggle-recording',
            {
              label: [recording ? 'stop-recording.label' : 'start-recording.label', { ns: meta.profile.key }],
              icon: recording ? 'ph--stop-circle--regular' : 'ph--microphone--regular',
              disposition: 'toolbar',
              testId: 'transcription.toggle-recording',
            },
            toggleRecording,
          )
    ).build();
  }, [managed, recording, toggleRecording]);

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
