//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { OperationPlugin, RuntimePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { translations } from '../../translations';

import { DeploymentDialog } from './DeploymentDialog';

const DeploymentDialogStory = () => {
  const accessToken = useMemo(
    () =>
      Obj.make(AccessToken.AccessToken, {
        source: 'example.com',
        token: 'example-token',
      }),
    [],
  );
  const scriptTemplates = useMemo(
    () => [
      { id: 't-1', name: 'Script 1', source: 'template1' },
      { id: 't-2', name: 'Script 2', source: 'template2' },
      { id: 't-3', name: 'Script 3', source: 'template3' },
    ],
    [],
  );
  return (
    <Dialog.Root defaultOpen={true}>
      <DeploymentDialog accessToken={accessToken} scriptTemplates={scriptTemplates} />
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-script/containers/DeploymentDialog',
  component: DeploymentDialogStory,
  parameters: { translations },
  // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [OperationPlugin(), RuntimePlugin(), ClientPlugin({})],
    }),
  ],
} satisfies Meta<typeof DeploymentDialogStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
