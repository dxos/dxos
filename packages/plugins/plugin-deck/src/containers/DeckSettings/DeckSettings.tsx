//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Input, Select, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import {
  type DeckSettingsProps,
  type NewPlankPositioning,
  NewPlankPositions,
  type Overscroll,
  OverScrollToProps,
} from '../../types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsComponentProps = {
  settings: DeckSettingsProps;
  onSettingsChange: (fn: (current: DeckSettingsProps) => DeckSettingsProps) => void;
};

export const DeckSettings = ({ settings, onSettingsChange }: DeckSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('settings enable deck label')}>
            <Input.Switch
              checked={settings.enableDeck}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, enableDeck: checked }))}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('settings encapsulated planks label')}>
            <Input.Switch
              checked={settings.encapsulatedPlanks ?? false}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, encapsulatedPlanks: checked }))}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('select new plank positioning label')}>
            <Select.Root
              disabled={!settings.enableDeck}
              value={settings.newPlankPositioning ?? 'start'}
              onValueChange={(value) =>
                onSettingsChange((s) => ({ ...s, newPlankPositioning: value as NewPlankPositioning }))
              }
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title={t('settings overscroll label')}>
            <Select.Root
              disabled={!settings.enableDeck}
              value={settings.overscroll ?? 'none'}
              onValueChange={(value) => onSettingsChange((s) => ({ ...s, overscroll: value as Overscroll }))}
            >
              <Select.TriggerButton placeholder={t('select overscroll placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {OverScrollToProps.map((option) => (
                      <Select.Option key={option} value={option}>
                        {t(`settings overscroll ${option} label`)}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Settings.ItemInput>
          <Settings.ItemInput title={t('settings enable statusbar label')}>
            <Input.Switch
              checked={settings.enableStatusbar}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, enableStatusbar: checked }))}
            />
          </Settings.ItemInput>
          <Settings.ItemInput title={t('settings show hints label')}>
            <Input.Switch
              checked={settings.showHints}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, showHints: checked }))}
            />
          </Settings.ItemInput>
          {!isSocket && (
            <Settings.ItemInput title={t('settings native redirect label')}>
              <Input.Switch
                checked={settings.enableNativeRedirect}
                onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, enableNativeRedirect: checked }))}
              />
            </Settings.ItemInput>
          )}
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
