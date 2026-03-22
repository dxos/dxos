//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { type Meta, type StoryObj } from '@storybook/react-vite';

import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Oscilloscope } from '@dxos/react-ui-sfx';

import { useMixerEngine } from '../../hooks';
import { Dream, Sequence } from '../../types';

import { Mixer } from './Mixer';

const DefaultStory = () => {
  const { engine, playing, outputNode } = useMixerEngine();
  const spaces = useSpaces();
  const space = spaces[0];
  const [dream, setDream] = useState<Dream.Dream | undefined>();

  useEffect(() => {
    if (space && !dream) {
      setDream(
        space.db.add(
          Dream.make({
            name: 'Test Dream',
            sequences: [Sequence.makeSampleSequence('rain')],
          }),
        ),
      );
    }
  }, [space, dream]);

  if (!dream) {
    return <></>;
  }

  return (
    <div className='dx-container grid grid-cols-[1fr_1fr] gap-8 px-8'>
      <Mixer dream={dream} engine={engine} />
      <div className='flex flex-col justify-center'>
        <Oscilloscope classNames='h-[400px] border-green-500' mode='waveform' active={playing} source={outputNode} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-zen/components/Mixer',
  render: DefaultStory,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [Dream.Dream] }),
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {};
