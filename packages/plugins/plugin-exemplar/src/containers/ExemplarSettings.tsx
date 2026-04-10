//
// Copyright 2025 DXOS.org
//

// Plugin settings surface — renders the plugin's settings in the global settings panel.
// Uses `Settings` layout components from `@dxos/react-ui-form` for consistent structure:
// `Settings.Viewport > Settings.Section > Settings.Item`.
//
// The component receives typed `settings` and `onSettingsChange` via
// `AppSurface.SettingsArticleProps` — it never touches the atom directly.
// The `useSettingsState` hook is called in the surface component (react-surface.tsx).

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import type { Settings } from '#types';

export type ExemplarSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const ExemplarSettings = ({ settings, onSettingsChange }: ExemplarSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('plugin.name')}>
        <SettingsForm.Item title={t('show-status-indicator-setting.label')}>
          <Input.Switch
            checked={settings.showStatusIndicator ?? true}
            onCheckedChange={(checked) =>
              onSettingsChange?.((current) => ({ ...current, showStatusIndicator: !!checked }))
            }
          />
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};

export default ExemplarSettings;
