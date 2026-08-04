//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';
import { type MessageValence } from '@dxos/ui-types';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Message } from './Message';

random.seed(123);

type StoryArgs = {
  valence: MessageValence;
  title: string;
  body: string;
  button?: boolean;
  /** Wrap the title/body in `Message.Content` so the message carries its own inset. */
  padded?: boolean;
};

const DefaultStory = ({ valence, title, body, button, padded }: StoryArgs) => {
  const Wrapper = padded ? Message.Content : React.Fragment;
  return (
    <div className='w-[30rem]'>
      <Message.Root valence={valence}>
        <Wrapper>
          {title && <Message.Title onClose={() => console.log('close')}>{title}</Message.Title>}
          {body && (
            <Message.Body asChild classNames='gap-2'>
              <div>
                <p>{body}</p>
                {button && <Button>Test</Button>}
              </div>
            </Message.Body>
          )}
        </Wrapper>
      </Message.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Message',
  component: Message.Root as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    valence: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error', 'neutral'],
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    valence: 'neutral',
    title: 'Default',
    body: random.lorem.paragraphs(1),
    button: true,
  },
};

export const Success: Story = {
  args: {
    valence: 'success',
    title: 'Success',
    body: random.lorem.paragraphs(1),
    button: true,
  },
};

export const Info: Story = {
  args: {
    valence: 'info',
    title: 'Info',
    body: random.lorem.paragraphs(1),
    button: true,
  },
};

export const Warning: Story = {
  args: {
    valence: 'warning',
    title: 'Warning',
    body: random.lorem.paragraphs(1),
    button: true,
  },
};

export const Error: Story = {
  args: {
    valence: 'error',
    title: 'Error',
    body: random.lorem.paragraphs(1),
    button: true,
  },
};

export const Padded: Story = {
  args: {
    valence: 'neutral',
    title: 'Padded',
    body: random.lorem.paragraphs(1),
    button: true,
    padded: true,
  },
};
