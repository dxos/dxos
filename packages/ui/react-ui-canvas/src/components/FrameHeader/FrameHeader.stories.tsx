//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FrameHeader, type FrameHeaderProps } from './FrameHeader.tsx';

random.seed(123);

const SCENES = [
  {
    title: 'The Decentralized Operating System',
    caption: random.lorem.paragraph(),
  },
  {
    title: 'The ECHO Hypergraph',
    caption: random.lorem.paragraph(),
  },
  {
    title: 'The OS for your Agents',
    caption: random.lorem.paragraph(),
  },
];

/** Steps through a few scenes' titles, so previous, next and play can be tried. */
const Stepping = (props: Partial<FrameHeaderProps>) => {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  return (
    <FrameHeader
      {...SCENES[index]}
      index={index}
      count={SCENES.length}
      playing={playing}
      onPrevious={() => setIndex((value) => Math.max(0, value - 1))}
      onNext={() => setIndex((value) => Math.min(SCENES.length - 1, value + 1))}
      onPlayingChange={setPlaying}
      {...props}
    />
  );
};

/**
 * The header of a sequence of scenes on its own: title, caption, the scene counter and the playback controls.
 *
 * Test:
 * 1. Next steps to the following title and counter, and disables itself on the last; previous does the same back.
 * 2. Play turns to pause and back.
 */
const meta: Meta<typeof Stepping> = {
  title: 'ui/react-ui-canvas/components/FrameHeader',
  render: (args) => <Stepping {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

export const Default: StoryObj<typeof Stepping> = {};
