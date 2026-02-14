//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Input } from '../../components';
import { withTheme } from '../../testing';

import { Container, type ContainerRootProps } from './Container';

const DefaultStory = (props: ContainerRootProps) => {
  return (
    <div className='plb-2 is-[20rem] border border-separator rounded-sm'>
      <Container.Root {...props}>
        <Container.Column>
          <Input.Root>
            <Input.Label>Label</Input.Label>
            <Input.TextInput />
          </Input.Root>
        </Container.Column>
      </Container.Root>
    </div>
  );
};

const meta: Meta<typeof Container.Root> = {
  title: 'ui/react-ui-core/primitives/Container',
  component: Container.Root,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const SM: Story = {
  args: {
    variant: 'sm',
  },
};

export const MD: Story = {
  args: {
    variant: 'md',
  },
};

export const LG: Story = {
  args: {
    variant: 'lg',
  },
};
