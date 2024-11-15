//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { useStoryClientData, withClientProvider } from '@dxos/react-client/testing';
import { Dialog } from '@dxos/react-ui';
import { osTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SpaceSettingsDialog, type SpaceSettingsDialogProps } from './SpaceSettingsDialog';
import translations from '../../translations';

const Story = (args: Partial<SpaceSettingsDialogProps>) => {
  const { space } = useStoryClientData();

  return (
    <Dialog.Root open>
      <Dialog.Overlay blockAlign='start'>
        <SpaceSettingsDialog {...args} space={space!} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-space/SpaceSettingsDialog',
  component: SpaceSettingsDialog,
  render: Story,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true }),
    withTheme,
    withLayout({ tooltips: true }),
  ],
  parameters: { translations: [...translations, osTranslations] },
};

export default meta;

export const Default: StoryObj<typeof SpaceSettingsDialog> = {};
