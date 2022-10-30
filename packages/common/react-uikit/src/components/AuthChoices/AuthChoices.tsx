//
// Copyright 2022 DXOS.org
//

import { CaretRight, Plus, QrCode, Textbox } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CompoundButton } from '@dxos/react-ui';

export interface AuthChoicesProps {
  onCreate?: () => void;
  onJoin?: () => void;
  onRecover?: () => void;
}

export const AuthChoices = ({ onCreate, onJoin, onRecover }: AuthChoicesProps) => {
  const { t } = useTranslation();

  return (
    <div role='none' className='flex flex-col gap-2 mt-4 px-2'>
      {onCreate && (
        <CompoundButton
          description={t('create identity description')}
          before={<Plus className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onCreate}
        >
          {t('create identity label')}
        </CompoundButton>
      )}
      {onJoin && (
        <CompoundButton
          description={t('join identity description')}
          before={<QrCode className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onJoin}
        >
          {t('join identity label')}
        </CompoundButton>
      )}
      {onRecover && (
        <CompoundButton
          description={t('recover identity description')}
          before={<Textbox className='w-6 h-6' />}
          after={<CaretRight className='w-4 h-4' weight='bold' />}
          className='text-lg w-full'
          onClick={onRecover}
        >
          {t('recover identity label')}
        </CompoundButton>
      )}
    </div>
  );
};
