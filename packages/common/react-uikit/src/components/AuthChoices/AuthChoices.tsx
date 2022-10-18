//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import {
  Button,
  GroupProps,
  Group,
  HeadingProps
} from '@dxos/react-ui';

import { useTranslation, TFunction } from '../../translations';

export interface AuthChoicesProps extends Pick<GroupProps, 'labelVisuallyHidden' | 'elevation' | 'className'> {
  label?: HeadingProps
  description?: ReactNode
  create?: boolean
  recover?: boolean
  inviteDevice?: boolean
}

const AuthChoicesDefaultLabel = (t: TFunction): HeadingProps => {
  return {
    level: 1,
    className: 'mb-4',
    children: t('auth choices label')
  };
};

export const AuthChoices = ({ create, recover, inviteDevice, label, ...groupProps }: AuthChoicesProps) => {
  const { t } = useTranslation();

  return <Group label={label || AuthChoicesDefaultLabel(t)} {...groupProps}><Button>{t('create profile label')}</Button></Group>;
};
