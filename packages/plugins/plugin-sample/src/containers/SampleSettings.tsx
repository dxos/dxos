//
// Copyright 2025 DXOS.org
//

// Plugin settings surface — renders the plugin's settings in the global settings panel.
// Uses `Settings` layout components from `@dxos/react-ui-form` for consistent structure:
// `Settings.Viewport > Settings.Section > Settings.FieldSet` (auto-generated from schema).
//
// The component receives typed `settings` and `onSettingsChange` via
// `AppSurface.SettingsArticleProps` — it never touches the atom directly.
// The `useSettingsState` hook is called in the surface component (react-surface.tsx).

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type SampleSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const SampleSettings = ({ settings, onSettingsChange }: SampleSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('plugin.name')}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Settings.Settings}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};

export default SampleSettings;
