//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { AudioStream, type AudioStreamProps } from './AudioStream';

const DefaultStory = (props: AudioStreamProps) => (
  <div className='p-4 text-sm text-description'>
    Headless audio sink for {props.tracks.length} track(s); renders an off-screen <code>&lt;audio&gt;</code> element.
    <AudioStream {...props} />
  </div>
);

const meta = {
  title: 'plugins/plugin-calls/components/AudioStream',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// No media devices in stories; exercises the empty-track path.
export const Empty: Story = {
  args: { tracks: [] },
};
