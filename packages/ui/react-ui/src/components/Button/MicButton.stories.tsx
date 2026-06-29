//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '../../testing';
import { translations } from '../../translations';
import { Tooltip } from '../Tooltip';
import { type MicButtonProps, MicButton } from './MicButton';

const DefaultStory = ({ mode = 'toggle', ...props }: MicButtonProps) => {
  const [recording, setRecording] = useState(false);

  return (
    <Tooltip.Provider>
      <MicButton
        iconOnly
        variant='ghost'
        {...props}
        mode={mode}
        // `label`/`recording`/handlers are driven by story state so the demo reacts to interaction.
        label={recording ? 'Stop recording' : mode === 'hold' ? 'Hold to record' : 'Start recording'}
        recording={recording}
        onToggle={() => setRecording((value) => !value)}
        onPressStart={() => setRecording(true)}
        onPressEnd={() => setRecording(false)}
      />
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/MicButton',
  decorators: [withTheme()],
  component: MicButton,
  render: DefaultStory,
  args: { label: 'Record', mode: 'toggle' },
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof MicButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  args: {
    mode: 'toggle',
  },
};

export const Hold: Story = {
  args: {
    mode: 'hold',
  },
};
