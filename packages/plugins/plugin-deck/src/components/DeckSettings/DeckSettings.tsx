//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Settings } from '../../types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const DeckSettings = ({ settings, onSettingsChange }: DeckSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('settings-enable-deck.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enableDeck}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enableDeck: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-encapsulated-planks.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.encapsulatedPlanks ?? false}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, encapsulatedPlanks: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('select-new-plank-positioning.label')}>
          <Select.Root
            disabled={!settings.enableDeck || !onSettingsChange}
            value={settings.newPlankPositioning ?? 'start'}
            onValueChange={(value) =>
              onSettingsChange?.((s) => ({ ...s, newPlankPositioning: value as Settings.NewPlankPositioning }))
            }
          >
            <Select.TriggerButton
              disabled={!onSettingsChange}
              placeholder={t('select-new-plank-positioning.placeholder')}
            />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {Settings.NewPlankPositions.map((position) => (
                    <Select.Option key={position} value={position}>
                      {t(`settings-new-plank-position.${position}.label`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-overscroll.label')}>
          <Select.Root
            disabled={!settings.enableDeck || !onSettingsChange}
            value={settings.overscroll ?? 'none'}
            onValueChange={(value) => onSettingsChange?.((s) => ({ ...s, overscroll: value as Settings.Overscroll }))}
          >
            <Select.TriggerButton placeholder={t('select-overscroll.placeholder')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {Settings.OverScrollToProps.map((option) => (
                    <Select.Option key={option} value={option}>
                      {t(`settings-overscroll.${option}.label`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-enable-statusbar.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enableStatusbar}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enableStatusbar: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings-show-hints.label')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.showHints}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showHints: checked }))}
          />
        </SettingsForm.Item>
        {!isSocket && (
          <SettingsForm.Item title={t('settings-native-redirect.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.enableNativeRedirect}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enableNativeRedirect: checked }))}
            />
          </SettingsForm.Item>
        )}
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
