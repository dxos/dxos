//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const DeckSettings = ({ settings, onSettingsChange }: DeckSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('settings.enable-deck.label')} description={t('settings.enable-deck.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enableDeck}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enableDeck: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item
          title={t('settings.encapsulated-planks.label')}
          description={t('settings.encapsulated-planks.description')}
        >
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.encapsulatedPlanks ?? false}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, encapsulatedPlanks: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item
          title={t('settings.enable-statusbar.label')}
          description={t('settings.enable-statusbar.description')}
        >
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.enableStatusbar}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, enableStatusbar: checked }))}
          />
        </SettingsForm.Item>
        <SettingsForm.Item title={t('settings.show-hints.label')} description={t('settings.show-hints.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.showHints}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, showHints: checked }))}
          />
        </SettingsForm.Item>
        {!isSocket && (
          <SettingsForm.Item
            title={t('settings.native-redirect.label')}
            description={t('settings.native-redirect.description')}
          >
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
