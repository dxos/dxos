//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { Dialog } from '@dxos/react-ui';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { DeploymentDialog, type DeploymentDialogProps } from './DeploymentDialog';

const DefaultStory = (props: DeploymentDialogProps) => {
  return (
    <Dialog.Root defaultOpen={true}>
      <DeploymentDialog {...props} />
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-script/DeploymentDialog',
  component: DeploymentDialog,
  render: DefaultStory,
  parameters: { translations },
  decorators: [withTheme, withLayout()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    accessToken: Obj.make(DataType.AccessToken, {
      source: 'example.com',
      token: 'example-token',
    }),
    scriptTemplates: [
      { id: 't-1', name: 'Script 1', source: 'template1' },
      { id: 't-2', name: 'Script 2', source: 'template2' },
      { id: 't-3', name: 'Script 3', source: 'template3' },
    ],
  },
};
