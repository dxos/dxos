//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useEffect, useState } from 'react';

import { Composer, DXOSHorizontalType } from '@dxos/brand';
import { SpaceId } from '@dxos/keys';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Switch from '@dxos/react-ui/Switch';
import * as Textarea from '@dxos/react-ui/Textarea';
import * as Util from '@dxos/react-ui/Util';

import {
  DEFAULT_COMPOSER_URLS,
  DeveloperMode,
  SpaceId as SpaceIdConfig,
  SpaceMode,
  getComposerUrls,
  setComposerUrls,
} from '../../core/index.ts';
import { translationKey } from '../../translations.ts';

export type OptionsProps = {};

export const Options = Util.composable<HTMLDivElement, OptionsProps>((props, forwardedRef) => {
  const { t } = Hooks.useTranslation(translationKey);
  const [developerMode, setDeveloperMode] = useState(false);
  const [spaceMode, setSpaceMode] = useState(false);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [composerUrls, setComposerUrlsState] = useState('');

  useEffect(() => {
    void (async () => {
      setComposerUrlsState((await getComposerUrls()).join('\n'));
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      setDeveloperMode(await DeveloperMode.get());
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const stored = await SpaceIdConfig.get();
      if (stored && SpaceId.isValid(stored)) {
        setSpaceId(stored);
      }
    })();
  }, []);

  const handleDeveloperModeChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === 'indeterminate' ? false : Boolean(checked);
    await DeveloperMode.set(next);
    setDeveloperMode(next);
  };

  const handleSpaceModeChange = async (checked: boolean | 'indeterminate') => {
    const next = checked === 'indeterminate' ? false : Boolean(checked);
    await SpaceMode.set(next);
    setSpaceMode(next);
  };

  const handleSpaceIdChange = async (ev: ChangeEvent<HTMLInputElement>) => {
    const next = ev.target.value;
    // Reflect typing immediately, but persist only a valid (or cleared) id so the stored value stays
    // consistent with the validated read path — a partial/malformed id would otherwise silently
    // vanish on reload.
    setSpaceId(next);
    if (next === '' || SpaceId.isValid(next)) {
      await SpaceIdConfig.set(next);
    }
  };

  // One match pattern per line; blank lines ignored. An empty editor restores the defaults so a
  // user can never lock the extension out of every Composer origin.
  const handleComposerUrlsChange = async (ev: ChangeEvent<HTMLTextAreaElement>) => {
    const next = ev.target.value;
    setComposerUrlsState(next);
    const urls = next
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    await setComposerUrls(urls.length > 0 ? urls : DEFAULT_COMPOSER_URLS);
  };

  return (
    <ScrollArea.Root {...Util.composableProps(props)} orientation='vertical' ref={forwardedRef}>
      <ScrollArea.Viewport>
        <div className='grid grid-cols-[8rem_2fr_1fr_8rem] p-4 overflow-hidden'>
          <a href='https://dxos.org/composer' target='_blank' rel='noreferrer'>
            <Composer className='w-[8rem] h-[8rem]' />
          </a>
          <div className='flex flex-col justify-end -ml-2'>
            <h1 className='text-[64px] poiret-one-regular'>{t('composer.title')}</h1>
          </div>
          <div className='flex flex-col justify-start items-end'>
            <div className='flex items-center gap-2 mt-4'>
              <span className='text-fg-subtle'>Powered by</span>
              <a
                target='_blank'
                rel='noreferrer'
                href='https://dxos.org'
                className='text-base text-fg-subtle! hover:opacity-50'
              >
                <DXOSHorizontalType className='h-10 dark:fill-neutral-50' />
              </a>
            </div>
          </div>
        </div>

        <div className='grid grid-cols-[8rem_1fr_1fr_8rem] p-4 overflow-hidden'>
          <div className='col-span-full grid grid-cols-subgrid p-4 items-center'>
            <div />
            <Field.Root>
              <Field.Label>{t('settings.dev-mode.label')}</Field.Label>
              <div className='text-end'>
                <Switch.Switch
                  checked={developerMode}
                  onCheckedChange={({ checked }) => handleDeveloperModeChange(checked)}
                />
              </div>
            </Field.Root>
          </div>
          <div className='col-span-full grid grid-cols-subgrid p-4 items-center'>
            <div />
            <Field.Root>
              <Field.Label>{t('settings.space-mode.label')}</Field.Label>
              <div className='text-end'>
                <Switch.Switch checked={spaceMode} onCheckedChange={({ checked }) => handleSpaceModeChange(checked)} />
              </div>
            </Field.Root>
          </div>
          <div className='col-span-full grid grid-cols-subgrid p-4 items-center'>
            <div />
            <Field.Root>
              <Field.Label>{t('settings.space-id.label')}</Field.Label>
              <div className='text-end'>
                <Input.Input value={spaceId ?? ''} onChange={handleSpaceIdChange} />
              </div>
            </Field.Root>
          </div>
          <div className='col-span-full grid grid-cols-subgrid p-4 items-center'>
            <div />
            <Field.Root>
              <Field.Label classNames='self-start'>{t('settings.composer-urls.label')}</Field.Label>
              <div className='text-end'>
                <Textarea.Textarea
                  rows={4}
                  placeholder={DEFAULT_COMPOSER_URLS.join('\n')}
                  value={composerUrls}
                  onChange={handleComposerUrlsChange}
                  classNames='font-mono text-sm'
                />
              </div>
            </Field.Root>
          </div>
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

Options.displayName = 'Options';
