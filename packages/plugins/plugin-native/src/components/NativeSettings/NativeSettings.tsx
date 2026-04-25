//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

import { ShortcutInput } from './ShortcutInput';

export type NativeSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const NativeSettings = ({ settings, onSettingsChange }: NativeSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const shortcut = settings.spotlightShortcut ?? Settings.DEFAULT_SPOTLIGHT_SHORTCUT;

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title')}>
        <SettingsForm.Item
          title={t('settings.spotlight-shortcut.label')}
          description={t('settings.spotlight-shortcut.description')}
        >
          <ShortcutInput
            value={shortcut}
            onChange={(next) => onSettingsChange?.((current) => ({ ...current, spotlightShortcut: next }))}
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
