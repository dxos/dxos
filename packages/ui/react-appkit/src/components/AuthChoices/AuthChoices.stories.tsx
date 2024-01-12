//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { AuthChoices, type AuthChoicesProps } from './AuthChoices';
import { Group } from '../Group';

export default {
  title: 'react-appkit/AuthChoices',
  component: AuthChoices,
  decorators: [withTheme],
  argTypes: {
    onCreate: { action: 'create' },
    onRecover: { action: 'recover' },
    onJoin: { action: 'join' },
  },
};
export const Default = {
  render: (args: AuthChoicesProps) => {
    const { t } = useTranslation('appkit');
    return (
      <Group
        label={{
          level: 1,
          className: 'mb-4 text-3xl',
          children: t('auth choices label'),
        }}
        className='p-5 rounded-lg max-w-md mx-auto my-4'
      >
        <AuthChoices {...args} />
      </Group>
    );
  },
};
