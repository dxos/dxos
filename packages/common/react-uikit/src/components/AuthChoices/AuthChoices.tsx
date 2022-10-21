//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import {
  CaretRight,
  Plus,
  QrCode,
  Textbox
} from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  CompoundButton,
  Group,
  GroupProps
} from '@dxos/react-ui';

import { TKey } from '../../types';

export interface AuthChoicesProps extends Omit<GroupProps, 'label'> {
  rootLabelTKey?: TKey
  onCreate?: () => void
  onInviteDevice?: () => void
  onRecover?: () => void
}

export const AuthChoices = ({
  rootLabelTKey,
  onCreate,
  onInviteDevice,
  onRecover,
  ...groupProps
}: AuthChoicesProps) => {
  const { t } = useTranslation();

  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-4 text-3xl',
        children: t(rootLabelTKey ?? 'auth choices label')
      }}
      {...groupProps}
      className={cx('p-5 rounded-xl', groupProps.className)}>
      <div role='none' className='flex flex-col gap-2 mt-4'>
        {onCreate && (
          <CompoundButton
            description={t('create profile description')}
            before={<Plus className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onCreate}
          >{t('create profile label')}</CompoundButton>
        )}
        {onInviteDevice && (
          <CompoundButton
            description={t('invite device description')}
            before={<QrCode className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onInviteDevice}
          >{t('invite device label')}</CompoundButton>
        )}
        {onRecover && (
          <CompoundButton
            description={t('recover profile description')}
            before={<Textbox className='w-6 h-6' />}
            after={<CaretRight className='w-4 h-4' weight='bold' />}
            className='text-lg w-full'
            onClick={onRecover}
          >{t('recover profile label')}</CompoundButton>
        )}
      </div>
    </Group>
  );
};
