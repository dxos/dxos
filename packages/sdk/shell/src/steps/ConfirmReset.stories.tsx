//
// Copyright 2026 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { StorybookDialog } from '../story-components';
import { translations } from '../translations';
import { ConfirmReset } from './ConfirmReset';

const meta = {
  title: 'sdk/shell/ConfirmReset',
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof ConfirmReset>;

export default meta;

export const ResetStorage = () => (
  <StorybookDialog inOverlayLayout>
    <ConfirmReset
      active
      mode='reset storage'
      onCancel={() => console.log('cancel')}
      onConfirm={async () => console.log('confirm reset storage')}
    />
  </StorybookDialog>
);

export const JoinNewIdentity = () => (
  <StorybookDialog inOverlayLayout>
    <ConfirmReset
      active
      mode='join new identity'
      onCancel={() => console.log('cancel')}
      onConfirm={async () => console.log('confirm join new identity')}
    />
  </StorybookDialog>
);

export const Recover = () => (
  <StorybookDialog inOverlayLayout>
    <ConfirmReset
      active
      mode='recover'
      onCancel={() => console.log('cancel')}
      onConfirm={async () => console.log('confirm recover')}
    />
  </StorybookDialog>
);

export const NoCancel = () => (
  <StorybookDialog inOverlayLayout>
    <ConfirmReset active mode='reset storage' onConfirm={async () => console.log('confirm')} />
  </StorybookDialog>
);

export const Inactive = () => (
  <StorybookDialog inOverlayLayout>
    <ConfirmReset
      active={false}
      mode='reset storage'
      onCancel={() => console.log('cancel')}
      onConfirm={async () => console.log('confirm')}
    />
  </StorybookDialog>
);
