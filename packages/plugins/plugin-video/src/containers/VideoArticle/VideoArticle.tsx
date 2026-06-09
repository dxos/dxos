//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { VideoPlayer } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

export type VideoArticleProps = AppSurface.ObjectArticleProps<Video.Video>;

export const VideoArticle = ({ role, attendableId, subject }: VideoArticleProps) => {
  const [video] = useObject(subject);
  const { invokePromise } = useOperationInvoker();
  const [transcribing, setTranscribing] = useState(false);
  const hasTranscript = !!video.transcript;

  const handleTranscribe = useCallback(async () => {
    if (!invokePromise) {
      return;
    }
    setTranscribing(true);
    try {
      await invokePromise(VideoOperation.Transcribe, { video: Ref.make(subject) });
    } finally {
      setTranscribing(false);
    }
  }, [invokePromise, subject]);

  const handleOpenTranscript = useCallback(async () => {
    const db = Obj.getDatabase(subject);
    const transcript = await subject.transcript?.load();
    if (!db || !transcript || !invokePromise) {
      return;
    }
    await invokePromise(LayoutOperation.Open, {
      subject: [getObjectPathFromObject(transcript)],
      workspace: getSpacePath(db.spaceId),
    });
  }, [invokePromise, subject]);

  const menuActions = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action(
          'transcribe',
          {
            label: ['transcribe.label', { ns: meta.id }],
            icon: 'ph--subtitles--regular',
            disabled: !video.url || transcribing,
            disposition: 'toolbar',
            testId: 'video.toolbar.transcribe',
          },
          () => void handleTranscribe(),
        )
        .action(
          'open-transcript',
          {
            label: ['open-transcript.label', { ns: meta.id }],
            icon: 'ph--file-text--regular',
            disabled: !hasTranscript,
            disposition: 'toolbar',
            testId: 'video.toolbar.open-transcript',
          },
          () => void handleOpenTranscript(),
        )
        .build(),
    [video.url, hasTranscript, transcribing, handleTranscribe, handleOpenTranscript],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content>
          <VideoPlayer url={video.url} />
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

export default VideoArticle;
