//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';
import * as Tone from 'tone';

import { IconButton, Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { Sound, createDrum } from './sounds';

const createPattern = (): Sound => {
  const kick = createDrum('kick');
  const snare = createDrum('snare');

  const kickPattern = new Tone.Sequence(
    (time, hit) => hit && kick.trigger(time),
    [
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', 'C4', 'C4', 'C4'],
      ['C4', 'C4', 'C4', 'C4'],
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', null, null, null],
      ['C4', null, null, null],
    ].flat(),
    '16n',
  );

  const snarePattern = new Tone.Sequence(
    (time, hit) => hit && snare.trigger(time),
    [
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
      [null, null, null, null],
      ['C4', null, null, null],
    ].flat(),
    '16n',
  );
  snarePattern.humanize = '128n';

  return {
    start: async () => {
      await Tone.start();

      kickPattern.start(0);
      snarePattern.start(0);

      Tone.getTransport().bpm.value = 130;
      Tone.getTransport().start();
    },
    stop: async () => {
      kickPattern.stop();
      snarePattern.stop();

      Tone.getTransport().stop();
    },
  };
};

const DefaultStory = () => {
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) {
      return;
    }

    const action = createPattern();
    void action.start();
    return () => void action.stop();
  }, [running]);

  return (
    <Toolbar.Root>
      <IconButton
        icon='ph--play--regular'
        iconOnly
        variant='ghost'
        size={16}
        label='play'
        onClick={() => setRunning(true)}
      />
      <IconButton
        icon='ph--stop--regular'
        iconOnly
        variant='ghost'
        size={16}
        label='stop'
        onClick={() => setRunning(false)}
      />
    </Toolbar.Root>
  );
};

const meta = {
  title: 'plugins/plugin-sequencer/audio/sounds',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
