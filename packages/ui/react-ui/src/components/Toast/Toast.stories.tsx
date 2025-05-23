//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { type ReactNode, useState } from 'react';

import { Toast } from './Toast';
import { withTheme } from '../../testing';
import { Button } from '../Buttons';

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

export default {
  title: 'ui/react-ui-core/Toast',
  component: Toast,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    openTrigger: 'Open toast',
    title: 'This is a toast',
    description: 'This goes away on its own with a timer.',
    actionTriggers: [
      {
        altText: 'Press F5 to reload the page',
        trigger: <Button variant='primary'>Reload</Button>,
      },
    ],
    closeTrigger: <Button>Close</Button>,
  },
  parameters: {
    chromatic: { delay: 800 },
  },
};
