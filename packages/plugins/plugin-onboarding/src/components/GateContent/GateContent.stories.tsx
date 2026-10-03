//
// Copyright 2026 DXOS.org
//

import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { AlertDialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import hero from '../../../assets/hero.webp?url';
import { translations } from '../../translations.ts';
import { AuthorizingDeviceDialog } from '../AuthorizingDeviceDialog/index.ts';
import { GateContent } from './GateContent.tsx';

/** As the deck shows the gate: the host styles the backdrop, the surface renders its card in `GateContent`. */
const DefaultStory = () => (
  <AlertDialog.Root
    defaultOpen
    backdrop={{ classNames: 'dark bg-neutral-950! bg-no-repeat bg-center', style: { backgroundImage: `url(${hero})` } }}
  >
    <GateContent>
      <AuthorizingDeviceDialog />
    </GateContent>
  </AlertDialog.Root>
);

const meta = {
  title: 'apps/composer-app/GateContent',
  component: GateContent,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof GateContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
