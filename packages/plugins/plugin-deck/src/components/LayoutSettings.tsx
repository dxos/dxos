//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { FormInput } from '@dxos/react-ui-data';

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

  return (
    <>
      <FormInput label={t('select new plank positioning label')}>
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
      </FormInput>
      <FormInput label={t('settings overscroll label')}>
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
      </FormInput>
      <FormInput label={t('settings show hints label')}>
        <Input.Switch checked={settings.showHints} onCheckedChange={(checked) => (settings.showHints = checked)} />
      </FormInput>
      {!isSocket && (
        <FormInput label={t('settings native redirect label')}>
          <Input.Switch
            checked={settings.enableNativeRedirect}
            onCheckedChange={(checked) => (settings.enableNativeRedirect = checked)}
          />
        </FormInput>
      )}
      <FormInput label={t('settings custom slots')}>
        <Input.Switch checked={settings.customSlots} onCheckedChange={(checked) => (settings.customSlots = checked)} />
      </FormInput>
      <FormInput label={t('settings flat deck')}>
        <Input.Switch checked={settings.flatDeck} onCheckedChange={(checked) => (settings.flatDeck = checked)} />
      </FormInput>
    </>
  );
};
