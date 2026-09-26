//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';
import { type MessageValence } from '@dxos/ui-types';

import { withTheme } from '../../testing/index.ts';
import { Button } from '../Button/index.ts';
import { Banner } from './Banner.tsx';

random.seed(123);

type StoryArgs = {
  valence: MessageValence;
  title: string;
  body: string;
  button?: boolean;
};

const DefaultStory = ({ valence, title, body, button }: StoryArgs) => {
  return (
    <div className='w-[30rem]'>
      <Banner.Root valence={valence}>
        <Banner.Content>
          {title && <Banner.Title onClose={() => console.log('close')}>{title}</Banner.Title>}
          {body && (
            <Banner.Body asChild classNames='gap-2'>
              <div>
                <p>{body}</p>
                {button && <Button>Test</Button>}
              </div>
            </Banner.Body>
          )}
        </Banner.Content>
      </Banner.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Banner',
  component: Banner.Root as any,
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

//
// Empty
//

/** A surface with nothing in it: no valence, no box — the one banner that says nothing is wrong. */
export const Empty: StoryObj<typeof Banner.Empty> = {
  render: (args) => <Banner.Empty {...args} />,
  args: {
    label: 'No automations',
  },
};

/** No label: the generic message, so a surface that forgot to say what is missing still reads. */
export const EmptyFallback: StoryObj<typeof Banner.Empty> = {
  render: () => <Banner.Empty />,
};

/** With an icon, for a surface whose emptiness is worth depicting. */
export const EmptyWithIcon: StoryObj<typeof Banner.Empty> = {
  render: (args) => <Banner.Empty {...args} />,
  args: {
    label: 'No automations',
    icon: 'ph--lightning--regular',
  },
};
