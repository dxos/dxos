//
// Copyright 2023 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React from 'react';

import { SettingsValue } from '@braneframe/plugin-settings';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { DECK_PLUGIN } from '../meta';
import { type DeckSettingsProps } from '../types';

const isSocket = !!(globalThis as any).__args;

export const LayoutSettings = ({ settings }: { settings: DeckSettingsProps }) => {
  const { t } = useTranslation(DECK_PLUGIN);

  return (
    <>
      <SettingsValue label={t('settings deck label')}>
        <Input.Switch checked={settings.deck} onCheckedChange={(checked) => (settings.deck = !!checked)} />
      </SettingsValue>
      {!settings.deck && (
        <Button variant='ghost' classNames='p-0 gap-2' onClick={() => window.location.reload()}>
          <ArrowClockwise />
          <p className='text-sm font-medium'>{t('reload required message')}</p>
        </Button>
      )}
      <SettingsValue label={t('settings show footer label')}>
        <Input.Switch checked={settings.showFooter} onCheckedChange={(checked) => (settings.showFooter = !!checked)} />
      </SettingsValue>
      {!isSocket && (
        <SettingsValue label={t('settings native redirect label')}>
          <Input.Switch
            checked={settings.enableNativeRedirect}
            onCheckedChange={(checked) => (settings.enableNativeRedirect = !!checked)}
          />
        </SettingsValue>
      )}
      <SettingsValue label={t('settings custom slots')}>
        <Input.Switch
          checked={settings.customSlots}
          onCheckedChange={(checked) => (settings.customSlots = !!checked)}
        />
      </SettingsValue>
    </>
  );
};
