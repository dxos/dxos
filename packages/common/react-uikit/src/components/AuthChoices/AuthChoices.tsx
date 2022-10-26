//
// Copyright 2022 DXOS.org
//

import { CaretRight, Plus, QrCode, Textbox } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CompoundButton } from '@dxos/react-ui';

export interface AuthChoicesProps {
  onCreate?: () => void;
  onInviteDevice?: () => void;
  onRecover?: () => void;
}

export const AuthChoices = ({ onCreate, onInviteDevice, onRecover }: AuthChoicesProps) => {
  const { t } = useTranslation();

  return (
    <div role='none' className='flex flex-col gap-2 mt-4 px-2'>
      {onCreate && (
        <CompoundButton
          description={t('create profile description')}
          before={<Plus className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onCreate}
        >
          {t('create profile label')}
        </CompoundButton>
      )}
      {onInviteDevice && (
        <CompoundButton
          description={t('invite device description')}
          before={<QrCode className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onInviteDevice}
        >
          {t('invite device label')}
        </CompoundButton>
      )}
      {onRecover && (
        <CompoundButton
          description={t('recover profile description')}
          before={<Textbox className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onRecover}
        >
          {t('recover profile label')}
        </CompoundButton>
      )}
    </div>
  );
};
