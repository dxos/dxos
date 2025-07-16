//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { DeploymentDialog } from '../DeploymentDialog/DeploymentDialog';

export const Default = {
  args: {
    accessToken: { value: 'example-token' },
    scripts: [
      { label: 'Script 1', templateId: 'template1' },
      { label: 'Script 2', templateId: 'template2' },
      { label: 'Script 3', templateId: 'template3' },
    ],
  },
  render: (args: any) => (
    <Dialog.Root defaultOpen={true}>
      <DeploymentDialog {...args} />
    </Dialog.Root>
  ),
};

const meta: Meta = {
  title: 'plugins/plugin-script/DeploymentDialog',
  component: DeploymentDialog,
  parameters: { translations },
  decorators: [withTheme, withLayout()],
};

export default meta;
