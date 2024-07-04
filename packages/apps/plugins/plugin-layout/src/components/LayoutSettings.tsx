//
// Copyright 2023 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React from 'react';

import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import { SettingsValue } from '@braneframe/plugin-settings';
import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { LAYOUT_PLUGIN } from '../meta';
import { type LayoutSettingsProps } from '../types';

const isSocket = !!(globalThis as any).__args;

export const LayoutSettings = ({ settings }: { settings: LayoutSettingsProps }) => {
  const { t } = useTranslation(LAYOUT_PLUGIN);
  const dispatch = useIntentDispatcher();

  const handleDisableDeck = (checked: boolean) => {
    settings.disableDeck = !!checked;
    void dispatch({
      action: ObservabilityAction.SEND_EVENT,
      data: {
        name: 'layout.settings.deck',
        properties: {
          disabled: settings.disableDeck,
        },
      },
    });
  };

  return (
    <>
      <SettingsValue label={t('settings deck label')}>
        <Input.Switch checked={settings.disableDeck} onCheckedChange={handleDisableDeck} />
      </SettingsValue>
      {!settings.disableDeck && (
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
    </>
  );
};
