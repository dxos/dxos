//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Toast } from './Toast';

type ActionTriggerProps = { altText: string; trigger: ReactNode };

type StorybookToastProps = Partial<{
  icon: string;
  title: string;
  description: string;
  duration: number;
  actionTriggers: ActionTriggerProps[];
  openTrigger: string;
  defaultOpen: boolean;
}>;

const DefaultStory = ({
  icon,
  title,
  description,
  duration,
  actionTriggers,
  openTrigger,
  defaultOpen = true,
}: StorybookToastProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Toast.Provider>
      <Button onClick={() => setOpen(true)}>{openTrigger}</Button>
      <Toast.Viewport />
      <Toast.Root open={open} onOpenChange={setOpen} defaultOpen={defaultOpen} duration={duration}>
        <Toast.Title icon={icon} onClose={() => setOpen(false)}>
          {title}
        </Toast.Title>
        <Toast.Description>{description}</Toast.Description>
        {actionTriggers && actionTriggers.length > 0 && (
          <Toast.Actions>
            {actionTriggers.map(({ altText, trigger }: ActionTriggerProps, index: number) => (
              <Toast.Action key={index} altText={altText} asChild={typeof trigger !== 'string'}>
                {trigger}
              </Toast.Action>
            ))}
          </Toast.Actions>
        )}
      </Toast.Root>
    </Toast.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Toast',
  component: Toast as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: true,
    openTrigger: 'Open toast',
    icon: 'ph--sparkle--regular',
    title: 'This is a toast',
    description: 'This goes away on its own with a timer.',
    duration: 100_000,
    actionTriggers: [
      {
        altText: 'Press F5 to reload the page',
        trigger: <Button variant='primary'>Reload</Button>,
      },
    ],
  },
};
