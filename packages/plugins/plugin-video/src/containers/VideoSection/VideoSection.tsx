//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';

import { VideoPlayer } from '#components';
import { type Video } from '#types';

export type VideoSectionProps = {
  subject: Video.Video;
  attendableId: string;
};

/**
 * Section surface that renders only the {@link VideoPlayer}. Kept isolated from the transcript/summary
 * editors so the cross-origin player iframe never shares a component/prop graph with CodeMirror.
 */
export const VideoSection = ({ attendableId, subject }: VideoSectionProps) => {
  const [video] = useObject(subject);
  // The transcript sets the selection point (a seconds offset) to seek the player.
  const selected = useSelected(attendableId, 'single');
  const startTime = selected && /^\d+$/.test(selected) ? Number(selected) : undefined;

  return <VideoPlayer url={video.url} startTime={startTime} />;
};
