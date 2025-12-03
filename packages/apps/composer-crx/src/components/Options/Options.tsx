//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { Composer, DXOSHorizontalType } from '@dxos/brand';
import { SpaceId } from '@dxos/keys';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DEVELOPER_MODE_PROP, SPACE_ID_PROP, SPACE_MODE_PROP, getProp } from '../../config';
import { translationKey } from '../../translations';

const headerGrid = 'grid grid-cols-[8rem_2fr_1fr_8rem] p-4 overflow-hidden';
const propertiesGrid =
  'grid grid-cols-[8rem_1fr_1fr_8rem] p-4 overflow-hidden items-center [&_label]:m-0 [&_label]:text-base';

export type OptionsProps = ThemedClassName<{}>;

export const Options = ({ classNames }: OptionsProps) => {
  const { t } = useTranslation(translationKey);
  const [developerMode, setDeveloperMode] = useState(false);
  const [spaceMode, setSpaceMode] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setDeveloperMode(Boolean(await getProp(DEVELOPER_MODE_PROP)));
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = await getProp(SPACE_ID_PROP);
      if (SpaceId.isValid(stored)) {
        setSpaceId(stored);
      }
    })();
  }, []);

  const handleDeveloperModeChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === 'indeterminate' ? false : Boolean(checked);
    await browser.storage.sync.set({ [DEVELOPER_MODE_PROP]: next });
    setDeveloperMode(next);
  };

  const handleSpaceModeChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === 'indeterminate' ? false : Boolean(checked);
    await browser.storage.sync.set({ [SPACE_MODE_PROP]: next });
    setSpaceMode(next);
  };

  const handleSpaceIdChange = async (ev: ChangeEvent<HTMLInputElement>) => {
    const next = ev.target.value;
    await browser.storage.sync.set({ [SPACE_ID_PROP]: next });
    setSpaceId(next);
  };

  return (
    <div className={mx('flex flex-col grow overflow-y-auto', classNames)}>
      <div className={headerGrid}>
        <a href='https://dxos.org/composer' target='_blank' rel='noreferrer' className='flex justify-end -mie-4'>
          <Composer className='is-[8rem] bs-[8rem]' />
        </a>
        <div className='flex flex-col justify-end'>
          <h1 className='text-[64px] poiret-one-regular'>{t('composer.title')}</h1>
        </div>
        <div className='flex flex-col justify-start items-end'>
          <div className='flex items-center gap-2 mbs-4'>
            <span className='text-subdued'>Powered by</span>
            <a
              target='_blank'
              rel='noreferrer'
              href='https://dxos.org'
              className='text-base !text-subdued hover:opacity-50'
            >
              <DXOSHorizontalType className='bs-10 dark:fill-neutral-50' />
            </a>
          </div>
        </div>
      </div>

      <div className={propertiesGrid}>
        <div />
        <Input.Root>
          <Input.Label>{t('settings.dev-mode.label')}</Input.Label>
          <div className='text-end'>
            <Input.Switch checked={developerMode} onCheckedChange={handleDeveloperModeChange} />
          </div>
        </Input.Root>
      </div>
      <div className={propertiesGrid}>
        <div />
        <Input.Root>
          <Input.Label>{t('settings.space-mode.label')}</Input.Label>
          <div className='text-end'>
            <Input.Switch checked={spaceMode} onCheckedChange={handleSpaceModeChange} />
          </div>
        </Input.Root>
      </div>
      <div className={propertiesGrid}>
        <div />
        <Input.Root>
          <Input.Label>{t('settings.space-id.label')}</Input.Label>
          <div className='text-end'>
            <Input.TextInput value={spaceId ?? ''} onChange={handleSpaceIdChange} />
          </div>
        </Input.Root>
      </div>
    </div>
  );
};
