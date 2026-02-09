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
    <div className='flex flex-col gap-20 is-full'>
      <div className='flex justify-center text-4xl p-2 rounded border border-separator'>
        <motion.div className='pli-2 text-neutral-500'>{'{'}</motion.div>
        <motion.div
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          animate={state}
          initial={initial}
          variants={{
            closed: {
              letterSpacing: '-0.5em',
              opacity: 0,
            },
            open: {
              letterSpacing: '0em',
              opacity: 100,
            },
          }}
        >
          {children}
        </motion.div>
        <motion.div className='pli-2 text-neutral-500'>{'}'}</motion.div>
      </div>

      <div className='flex justify-center'>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Restart' onClick={toggle} />
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-sfx/Text',
  component: Text,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='flex gap-2'>
        <span className='text-sky-500'>Welcome</span>
        <span className='text-neutral-500'>to</span>
        <span className='text-orange-500'>Composer</span>
      </div>
    ),
  },
};
