//
// Copyright 2024 DXOS.org
//

import { ArrowClockwise } from '@phosphor-icons/react';
import React from 'react';

import { ObservabilityAction } from '@braneframe/plugin-observability/meta';
import { SettingsValue } from '@braneframe/plugin-settings';
import { useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, Select, useTranslation } from '@dxos/react-ui';

import { DECK_PLUGIN } from '../meta';
import {
  type NewPlankPositioning,
  NewPlankPositions,
  type DeckSettingsProps,
  type Overscroll,
  OverscrollOptions,
} from '../types';

const isSocket = !!(globalThis as any).__args;

export const LayoutSettings = ({ settings }: { settings: DeckSettingsProps }) => {
  const { t } = useTranslation(DECK_PLUGIN);
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
      {settings.disableDeck && (
        <Button variant='ghost' classNames='p-0 gap-2' onClick={() => window.location.reload()}>
          <ArrowClockwise />
          <p className='text-sm font-medium'>{t('reload required message')}</p>
        </Button>
      )}
      <SettingsValue label={t('select new plank positioning label')}>
        <Select.Root
          value={settings.newPlankPositioning ?? 'start'}
          onValueChange={(value) => (settings.newPlankPositioning = value as NewPlankPositioning)}
        >
          <Select.TriggerButton placeholder={t('select new plank positioning placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {NewPlankPositions.map((position) => (
                  <Select.Option key={position} value={position}>
                    {t(`settings new plank position ${position} label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>
      <SettingsValue label={t('settings overscroll label')}>
        <Select.Root
          value={settings.overscroll ?? 'none'}
          onValueChange={(value) => (settings.overscroll = value as Overscroll)}
        >
          <Select.TriggerButton placeholder={t('select overscroll placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {OverscrollOptions.map((option) => (
                  <Select.Option key={option} value={option}>
                    {t(`settings overscroll ${option} label`)}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>
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
      <SettingsValue label={t('settings flat deck')}>
        <Input.Switch checked={settings.flatDeck} onCheckedChange={(checked) => (settings.flatDeck = !!checked)} />
      </SettingsValue>
    </>
  );
};
