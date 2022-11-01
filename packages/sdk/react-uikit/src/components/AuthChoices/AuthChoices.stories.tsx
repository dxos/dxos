//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import cx from 'classnames';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Group } from '@dxos/react-ui';

import { templateForComponent } from '../../testing';
import { AuthChoices, AuthChoicesProps } from './AuthChoices';

export default {
  title: 'react-uikit/AuthChoices',
  component: AuthChoices,
  argTypes: {
    onCreate: { action: 'create' },
    onRecover: { action: 'recover' },
    onJoin: { action: 'join' }
  }
};

const Template = (args: AuthChoicesProps) => {
  const { t } = useTranslation();
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-4 text-3xl',
        children: t('auth choices label')
      }}
      className={cx('p-5 rounded-xl max-w-md mx-auto my-4')}
    >
      <AuthChoices {...args} />
    </Group>
  );
};

export const Default = templateForComponent(Template)({});
Default.args = {};
