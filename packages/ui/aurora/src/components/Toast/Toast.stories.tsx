//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { ReactNode, useState } from 'react';

import { Button } from '../Buttons';
import {
  ToastAction,
  ToastActions,
  ToastBody,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from './Toast';

type ActionTriggerProps = { altText: string; trigger: ReactNode };

type StorybookToastProps = Partial<{
  openTrigger: string;
  title: string;
  description: string;
  actionTriggers: ActionTriggerProps[];
  closeTrigger: ReactNode;
}>;

const StorybookToast = (props: StorybookToastProps) => {
  const [open, setOpen] = useState(true);
  return (
    <ToastProvider>
      <Button onClick={() => setOpen(true)}>{props.openTrigger}</Button>
      <ToastViewport />
      <ToastRoot open={open} onOpenChange={setOpen}>
        <ToastBody>
          <ToastTitle>{props.title}</ToastTitle>
          <ToastDescription>{props.description}</ToastDescription>
        </ToastBody>
        <ToastActions>
          <ToastClose asChild={typeof props.closeTrigger !== 'string'}>{props.closeTrigger}</ToastClose>
          {(props.actionTriggers || []).map(({ altText, trigger }: ActionTriggerProps, index: number) => (
            <ToastAction key={index} altText={altText} asChild={typeof trigger !== 'string'}>
              {trigger}
            </ToastAction>
          ))}
        </ToastActions>
      </ToastRoot>
    </ToastProvider>
  );
};

export default {
  component: StorybookToast,
};

export const Default = {
  args: {
    openTrigger: 'Open toast',
    title: 'Hi, this is a toast',
    description: 'This goes away on its own with a timer.',
    actionTriggers: [{ altText: 'Press F5 to reload the page', trigger: <Button variant='primary'>Reload</Button> }],
    closeTrigger: <Button>Close</Button>,
  },
  parameters: {
    chromatic: { delay: 800 },
  },
};
