//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import 'preact/debug';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { VideoObject } from './VideoObject';
import { getUserMediaTrack } from '../../util';
import { ResponsiveContainer } from '../ResponsiveGrid';

const meta: Meta<typeof VideoObject> = {
  title: 'plugins/plugin-calls/VideoObject',
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
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof VideoObject>;

export const SelfView: Story = {};
