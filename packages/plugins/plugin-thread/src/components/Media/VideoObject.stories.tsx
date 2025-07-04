//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { VideoObject } from './VideoObject';
import { getUserMediaTrack } from '../../calls';
import { ResponsiveContainer } from '../ResponsiveGrid';

const meta: Meta<typeof VideoObject> = {
  title: 'plugins/plugin-thread/VideoObject',
  component: VideoObject,
  render: (args) => {
    log.info('render');
    const [videoStream, setVideoStream] = useState<MediaStream>();
    useEffect(() => {
      const ctx = new Context();
      scheduleTask(ctx, async () => {
        const stream = new MediaStream();
        stream.addTrack(await getUserMediaTrack('videoinput'));
        setVideoStream(stream);
      });

      return () => {
        void ctx.dispose();
        videoStream?.getTracks().forEach((track) => track.stop());
      };
    }, []);

    return (
      <ResponsiveContainer>
        <VideoObject videoStream={videoStream} {...args} flip />
      </ResponsiveContainer>
    );
  },
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'justify-center' })],
};

export default meta;

type Story = StoryObj<typeof VideoObject>;

export const SelfView: Story = {};
