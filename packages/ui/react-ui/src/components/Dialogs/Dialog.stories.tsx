//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '../../testing';
import { Button } from '../Buttons';

import { Dialog } from './Dialog';

type StoryProps = Partial<{
  title: string;
  description: string;
  body: string;
  closeTrigger: string;
  openTrigger: string;
  blockAlign: 'center' | 'start';
}>;

const DefaultStory = ({ title, openTrigger, description, body, closeTrigger, blockAlign }: StoryProps) => {
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <Button>{openTrigger}</Button>
      </Dialog.Trigger>
      <Dialog.Overlay blockAlign={blockAlign}>
        <Dialog.Content>
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <p className='mbs-2 mbe-4'>{body}</p>
          <Dialog.Close asChild>
            <Button variant='primary'>{closeTrigger}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

export default {
  title: 'ui/react-ui-core/Dialog',
  component: Dialog,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    title: 'Dialog title',
    openTrigger: 'Open Dialog',
    description: 'Dialog description',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    closeTrigger: 'Close trigger',
    blockAlign: 'center',
  },
  argTypes: {
    blockAlign: {
      type: 'select',
      options: ['center', 'start', 'end'],
    },
  },
};
