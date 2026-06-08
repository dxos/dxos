//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { motion } from 'motion/react';
import React, { type PropsWithChildren, useState } from 'react';

import { IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: string }>) => {
  const [state, setState] = useState(initial);
  const toggle = () => {
    setState((state) => (state === 'closed' ? 'open' : 'closed'));
  };

  return (
    <div className='flex flex-col gap-20 w-full'>
      <div className='flex justify-center text-4xl font-thin'>
        <motion.div
          className='inline-flex p-4 border border-separator rounded-md'
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
          animate={state}
          initial={initial}
          variants={{
            open: {
              gap: '1em',
              opacity: 1,
            },
            closed: {
              gap: '0.2em',
              opacity: 0,
            },
          }}
        >
          {children}
        </motion.div>
      </div>

      <div className='flex justify-center'>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Restart' onClick={toggle} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-experimental/Text',
  component: Text,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <span>D</span>
        <span>X</span>
        <span>O</span>
        <span>S</span>
      </>
    ),
  },
};
