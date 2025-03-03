//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import 'preact/debug';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import { log } from '@dxos/log';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { VideoObject } from './VideoObject';
import { useUserMedia } from '../../hooks';

const meta: Meta<typeof VideoObject> = {
  title: 'plugins/plugin-calls/VideoObject',
  component: VideoObject,
  render: (args) => {
    log.info('render');
    const media = useUserMedia();
    useEffect(() => {
      media.turnCameraOn();
    }, []);

    return <VideoObject videoTrack={media.state.videoTrack} {...args} />;
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
