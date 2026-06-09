//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useMediaQuery } from '@dxos/react-hooks';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';

import { VideoPlayer } from '#components';
import { meta } from '#meta';
import { Video, VideoOperation } from '#types';

export type VideoArticleProps = AppSurface.ObjectArticleProps<Video.Video>;

export const VideoArticle = ({ role, attendableId, subject }: VideoArticleProps) => {
  const [video] = useObject(subject);
  const { invokePromise } = useOperationInvoker();
  const [transcribing, setTranscribing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  // Embed the transcript/summary surface below the player only on large form factors.
  const [isLg] = useMediaQuery('lg');
  const hasTranscript = !!video.transcript;
  // The transcript sets the selection point (a seconds offset) to seek the player.
  const selected = useSelected(attendableId, 'single');
  const startTime = selected && /^\d+$/.test(selected) ? Number(selected) : undefined;

  const handleTranscribe = useCallback(async () => {
    if (!invokePromise) {
      return;
    }
    setTranscribing(true);
    try {
      await invokePromise(
        VideoOperation.Transcribe,
        { video: Ref.make(subject) },
        {
          spaceId: Obj.getDatabase(subject)?.spaceId,
          notify: { error: ['transcribe-error.message', { ns: meta.id }] },
        },
      );
    } finally {
      setTranscribing(false);
    }
  }, [invokePromise, subject]);

  const handleSummarize = useCallback(async () => {
    if (!invokePromise) {
      return;
    }
    setSummarizing(true);
    try {
      await invokePromise(
        VideoOperation.Summarize,
        { video: Ref.make(subject) },
        {
          spaceId: Obj.getDatabase(subject)?.spaceId,
          notify: { error: ['summarize-error.message', { ns: meta.id }] },
        },
      );
    } finally {
      setSummarizing(false);
    }
  }, [invokePromise, subject]);

  const handleOpenOriginal = useCallback(() => {
    if (video.url) {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    }
  }, [video.url]);

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
          'summarize',
          {
            label: ['summarize.label', { ns: meta.id }],
            icon: 'ph--text-align-left--regular',
            disabled: !hasTranscript || summarizing,
            disposition: 'toolbar',
            testId: 'video.toolbar.summarize',
          },
          () => void handleSummarize(),
        )
        .separator()
        .action(
          'open-original',
          {
            label: ['open-original.label', { ns: meta.id }],
            icon: 'ph--arrow-square-out--regular',
            disabled: !video.url,
            disposition: 'toolbar',
            testId: 'video.toolbar.open-original',
          },
          () => handleOpenOriginal(),
        )
        .build(),
    [video.url, hasTranscript, transcribing, summarizing, handleTranscribe, handleSummarize, handleOpenOriginal],
  );

  return (
    <Menu.Root {...menuActions} attendableId={attendableId}>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Menu.Toolbar />
        </Panel.Toolbar>
        <Panel.Content classNames='grid grid-rows-[auto_1fr]'>
          <VideoPlayer url={video.url} startTime={startTime} />
          {isLg && <Surface.Surface role='transcript' data={{ subject, attendableId }} limit={1} />}
        </Panel.Content>
      </Panel.Root>
    </Menu.Root>
  );
};

export default VideoArticle;
