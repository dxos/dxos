//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC, useState } from 'react';

import { Button, Flex, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { PulseSpinner } from './PulseSpinner.tsx';
import { ShapeSpinner } from './ShapeSpinner.tsx';
import { type ActivityState, type SpinnerProps } from './Spinner.tsx';

const STATES: ActivityState[] = ['ready', 'thinking', 'alert', 'error'];

type StoryArgs = SpinnerProps & { Spinner: FC<SpinnerProps> };

/** One implementation of the interface, with a button per state. */
const DefaultStory = ({ Spinner, state: initialState }: StoryArgs) => {
  const [state, setState] = useState(initialState);

  return (
    <Flex column grow>
      <Toolbar.Root>
        {STATES.map((value) => (
          <Button key={value} onClick={() => setState(value)} classNames='capitalize'>
            {value}
          </Button>
        ))}
      </Toolbar.Root>
      <Flex grow center>
        <Spinner state={state} size={6} />
      </Flex>
    </Flex>
  );
};

const meta = {
  title: 'ui/react-ui-components/Spinner',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The morphing square. */
export const Shape: Story = {
  args: { Spinner: ShapeSpinner },
};

/** The dot matrix; its alert state is a heartbeat. */
export const Pulse: Story = {
  args: { Spinner: PulseSpinner },
};

/** The dot matrix with the orbit alert: a light circling the outer ring. */
export const PulseOrbit: Story = {
  args: { Spinner: (props: SpinnerProps) => <PulseSpinner {...props} alert='orbit' /> },
};
