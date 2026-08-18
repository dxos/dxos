//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { AlertDialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import hero from '../../../assets/hero.webp?url';
import { translations } from '../../translations';
import { AuthorizingDeviceDialog } from './AuthorizingDeviceDialog';

const DefaultStory = () => (
  <AlertDialog.Root defaultOpen>
    <AlertDialog.Overlay
      classNames='dark bg-neutral-950! bg-no-repeat bg-center'
      style={{ backgroundImage: `url(${hero})` }}
    >
      <AuthorizingDeviceDialog />
    </AlertDialog.Overlay>
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
