//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { Composer } from '@dxos/brand';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DEVELOPER_MODE_PROP } from '../../config';
import { translationKey } from '../../translations';

export type OptionsProps = ThemedClassName<{}>;

export const Options = ({ classNames }: OptionsProps) => {
  const { t } = useTranslation(translationKey);
  const [developerMode, setDeveloperMode] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await browser.storage.sync.get(DEVELOPER_MODE_PROP);
      const stored = result?.[DEVELOPER_MODE_PROP];
      setDeveloperMode(Boolean(stored));
    })();
  }, []);

  const handleDeveloperModeChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === 'indeterminate' ? false : Boolean(checked);
    setDeveloperMode(next);
    await browser.storage.sync.set({ [DEVELOPER_MODE_PROP]: next });
  };

  return (
    <div className={mx('flex flex-col grow gap-4 overflow-hidden', classNames)}>
      <div className='grid grid-cols-[8rem_1fr] p-4 overflow-y-auto'>
        <a href='https://dxos.org/composer' target='_blank' rel='noreferrer'>
          <Composer className='is-[8rem] bs-[8rem]' />
        </a>
        <div className='flex items-center'>
          <div className='flex flex-col'>
            <h1 className='text-[40px] poiret-one-regular'>{t('composer.title')}</h1>
            <a target='_blank' href='https://dxos.org/composer' className='text-base text-subdued' rel='noreferrer'>
              {t('composer.description')}
            </a>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-[8rem_1fr] p-4 overflow-y-auto'>
        <div />
        <Input.Root>
          <div className='flex items-center gap-3'>
            <Input.Switch checked={developerMode} onCheckedChange={handleDeveloperModeChange} />
            <Input.Label classNames='!font-base !m-0'>{t('settings.devmode.label')}</Input.Label>
          </div>
        </Input.Root>
      </div>
    </div>
  );
};
