//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { TFunction, useTranslation } from 'react-i18next';

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

export interface AuthChoicesProps extends Omit<GroupProps, 'label'> {
  label?: HeadingProps
  onClickCreate?: () => void
  onClickInviteDevice?: () => void
  onClickRecover?: () => void
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
  onClickCreate,
  onClickInviteDevice,
  onClickRecover,
  ...groupProps
}: AuthChoicesProps) => {
  const { t } = useTranslation();

  return (
    <Group
      elevation={5}
      label={label || AuthChoicesDefaultLabel(t)}
      {...groupProps}
      className={cx('p-6 rounded-3xl', groupProps.className)}>
      <div role='none' className='flex flex-col gap-2 mt-4'>
        {onClickCreate && (
          <CompoundButton
            description={t('create profile description')}
            before={<Plus className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onClickCreate}
          >{t('create profile label')}</CompoundButton>
        )}
        {onClickInviteDevice && (
          <CompoundButton
            description={t('invite device description')}
            before={<QrCode className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onClickInviteDevice}
          >{t('invite device label')}</CompoundButton>
        )}
        {onClickRecover && (
          <CompoundButton
            description={t('recover profile description')}
            before={<Textbox className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onClickRecover}
          >{t('recover profile label')}</CompoundButton>
        )}
      </div>
    </Group>
  );
};
