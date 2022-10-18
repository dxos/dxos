//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import {
  CaretRight,
  CompoundButton,
  Group,
  GroupProps,
  HeadingProps,
  Plus,
  QrCode,
  Textbox
} from '@dxos/react-ui';

import { TFunction, useTranslation } from '../../translations';

export interface AuthChoicesProps {
  label?: HeadingProps
  description?: ReactNode
  excludeCreate?: boolean
  excludeRecover?: boolean
  excludeInviteDevice?: boolean
  labelVisuallyHidden?: boolean
  elevation?: GroupProps['elevation']
  className?: string
}

const AuthChoicesDefaultLabel = (t: TFunction): HeadingProps => {
  return {
    level: 1,
    className: 'mb-4',
    children: t('auth choices label')
  };
};

export const AuthChoices = ({
  label,
  excludeCreate,
  excludeInviteDevice,
  excludeRecover,
  ...groupProps
}: AuthChoicesProps) => {
  const { t } = useTranslation();

  return (
    <Group label={label || AuthChoicesDefaultLabel(t)} {...groupProps}>
      {!excludeCreate && (
        <CompoundButton
          description={t('create profile description')}
          before={<Plus className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='w-full mb-4'
        >{t('create profile label')}</CompoundButton>
      )}
      {!excludeInviteDevice && (
        <CompoundButton
          description={t('invite device description')}
          before={<QrCode className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='w-full mb-4'
        >{t('invite device label')}</CompoundButton>
      )}
      {!excludeRecover && (
        <CompoundButton
          description={t('recover profile description')}
          before={<Textbox className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='w-full mb-4'
        >{t('recover profile label')}</CompoundButton>
      )}
    </Group>
  );
};
