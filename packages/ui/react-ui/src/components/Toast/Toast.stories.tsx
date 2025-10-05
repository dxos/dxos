//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';

import { Button } from '../Buttons';

import { Toast } from './Toast';

type ActionTriggerProps = { altText: string; trigger: ReactNode };

type StorybookToastProps = Partial<{
  title: string;
  description: string;
  actionTriggers: ActionTriggerProps[];
  openTrigger: string;
  closeTrigger: ReactNode;
}>;

const DefaultStory = ({ title, description, actionTriggers, openTrigger, closeTrigger }: StorybookToastProps) => {
  const [open, setOpen] = useState(true);
  return (
    <Toast.Provider>
      <Button onClick={() => setOpen(true)}>{openTrigger}</Button>
      <Toast.Viewport />
      <Toast.Root open={open} onOpenChange={setOpen}>
        <Toast.Body>
          <Toast.Title>{title}</Toast.Title>
          <Toast.Description>{description}</Toast.Description>
        </Toast.Body>
        <Toast.Actions>
          <Toast.Close asChild={typeof closeTrigger !== 'string'}>{closeTrigger}</Toast.Close>
          {(actionTriggers || []).map(({ altText, trigger }: ActionTriggerProps, index: number) => (
            <Toast.Action key={index} altText={altText} asChild={typeof trigger !== 'string'}>
              {trigger}
            </Toast.Action>
          ))}
        </Toast.Actions>
      </Toast.Root>
    </Toast.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-core/Toast',
  component: Toast as any,
  render: DefaultStory,
    parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    openTrigger: 'Open toast',
    title: 'This is a toast',
    description: 'This goes away on its own with a timer.',
    actionTriggers: [
      {
        altText: 'Press F5 to reload the page',
        trigger: <Button variant='primary'>Reload</Button>,
      }],
    closeTrigger: <Button>Close</Button>,
  },
  parameters: {
    chromatic: { delay: 800 },
  },
};
