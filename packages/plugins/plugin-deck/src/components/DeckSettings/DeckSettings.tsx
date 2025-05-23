//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { DECK_PLUGIN } from '../../meta';
import {
  type DeckSettingsProps,
  type NewPlankPositioning,
  NewPlankPositions,
  type Overscroll,
  OverscrollOptions,
} from '../../types';

const isSocket = !!(globalThis as any).__args;

export const DeckSettings = ({ settings }: { settings: DeckSettingsProps }) => {
  const { t } = useTranslation(DECK_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings enable deck label')}>
        <Input.Switch checked={settings.enableDeck} onCheckedChange={(checked) => (settings.enableDeck = checked)} />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('select new plank positioning label')}>
        <Select.Root
          disabled={!settings.enableDeck}
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
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('settings overscroll label')}>
        <Select.Root
          disabled={!settings.enableDeck}
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
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('settings enable statusbar label')}>
        <Input.Switch
          checked={settings.enableStatusbar}
          onCheckedChange={(checked) => (settings.enableStatusbar = checked)}
        />
      </DeprecatedFormInput>
      <DeprecatedFormInput label={t('settings show hints label')}>
        <Input.Switch checked={settings.showHints} onCheckedChange={(checked) => (settings.showHints = checked)} />
      </DeprecatedFormInput>
      {!isSocket && (
        <DeprecatedFormInput label={t('settings native redirect label')}>
          <Input.Switch
            checked={settings.enableNativeRedirect}
            onCheckedChange={(checked) => (settings.enableNativeRedirect = checked)}
          />
        </DeprecatedFormInput>
      )}
    </DeprecatedFormContainer>
  );
};
