//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as AlertDialog from '@dxos/react-ui/AlertDialog';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations.ts';
import { AuthorizingDeviceDialog } from './AuthorizingDeviceDialog.tsx';

const DefaultStory = () => (
  <AlertDialog.Root defaultOpen>
    <AuthorizingDeviceDialog />
  </AlertDialog.Root>
);

const meta = {
  title: 'apps/composer-app/AuthorizingDeviceDialog',
  component: AuthorizingDeviceDialog,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof AuthorizingDeviceDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
