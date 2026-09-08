//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { Dialog } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { CreateSpaceDialog } from './CreateSpaceDialog';

const DefaultStory = () => (
  <Dialog.Root defaultOpen>
    <Dialog.Overlay>
      <CreateSpaceDialog />
    </Dialog.Overlay>
  </Dialog.Root>
);

const meta = {
  title: 'plugins/plugin-space/containers/CreateSpaceDialog',
  component: CreateSpaceDialog,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [ProcessManagerPlugin(), ClientPlugin.make({})],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    // The dialog's action row is `Form.Actions`, whose labels live in the form package's bundle.
    translations: [...translations, ...formTranslations],
  },
} satisfies Meta<typeof CreateSpaceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
