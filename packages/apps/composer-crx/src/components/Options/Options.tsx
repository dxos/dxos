//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { Composer } from '@dxos/brand';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DEVELOPER_MODE_PROP } from '../../config';

export type OptionsProps = ThemedClassName<{}>;

export const Options = ({ classNames }: OptionsProps) => {
  const { t } = useTranslation('composer');
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
    <div className={mx('flex flex-col grow gap-4 overflow-y-auto', classNames)}>
      <div className='grid grid-cols-[8rem_1fr] p-4'>
        <a href='https://dxos.org/composer' target='_blank' rel='noreferrer'>
          <Composer className='is-[8rem] bs-[8rem]' />
        </a>
        <div className='grid grid-rows-[1fr_1fr]'>
          <div />
          <div>
            <h1 className='text-2xl'>{t('composer.title')}</h1>
            <p className='text-sm text-subdued'>{t('composer.description')}</p>
          </div>
        </div>
      </div>

      <div className='flex flex-col p-4 gap-4'>
        <div className='flex items-center gap-2'>
          <Input.Root>
            <Input.Switch checked={developerMode} onCheckedChange={handleDeveloperModeChange} />
            <Input.Label>Developer mode</Input.Label>
          </Input.Root>
        </div>
      </div>
    </div>
  );
};
