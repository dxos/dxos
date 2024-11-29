//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { osTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { CreateObjectDialog, type CreateObjectDialogProps } from './CreateObjectDialog';
import translations from '../../translations';
import { CollectionType } from '../../types';

const Story = (args: CreateObjectDialogProps) => {
  return (
    <Dialog.Root open>
      <Dialog.Overlay blockAlign='start'>
        <CreateObjectDialog {...args} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta: Meta<typeof CreateObjectDialog> = {
  title: 'plugins/plugin-space/CreateObjectDialog',
  component: CreateObjectDialog,
  render: Story,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: { translations: [...translations, osTranslations] },
  args: {
    schemas: [CollectionType],
  },
};

export default meta;

export const Default: StoryObj<typeof CreateObjectDialog> = {};
