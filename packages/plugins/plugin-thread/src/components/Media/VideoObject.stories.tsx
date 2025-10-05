//
// Copyright 2025 DXOS.org
//

import { type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { getUserMediaTrack } from '../../calls';
import { ResponsiveContainer } from '../ResponsiveGrid';

import { VideoObject, type VideoObjectProps } from './VideoObject';

const DefaultStory = (props: VideoObjectProps) => {
  log.info('render');
  const [videoStream, setVideoStream] = useState<MediaStream>();
  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      try {
        const stream = new MediaStream();
        stream.addTrack(await getUserMediaTrack('videoinput'));
        setVideoStream(stream);
      } catch (err) {
        log.catch(err);
      }
    });

    return () => {
      void ctx.dispose();
      videoStream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <ResponsiveContainer>
      <VideoObject videoStream={videoStream} flip {...props} />
    </ResponsiveContainer>
  );
};

const meta = {
  title: 'plugins/plugin-thread/VideoObject',
  component: VideoObject,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof VideoObject>;

export const SelfView: Story = {};
