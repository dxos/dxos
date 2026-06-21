//
// Copyright 2025 DXOS.org
//

// Plugin settings surface — renders the plugin's settings in the global settings panel.
// Uses the `Form` composite from `@dxos/react-ui-form` with `variant='settings'` for consistent
// structure: `Form.Viewport > Form.Section > Form.FieldSet` (auto-generated from schema).
//
// The component receives typed `settings` and `onSettingsChange` via
// `AppSurface.SettingsArticleProps` — it never touches the atom directly.
// The `useSettingsState` hook is called in the surface component (react-surface.tsx).

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type SampleSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const SampleSettings = ({ settings, onSettingsChange }: SampleSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      readonly={!onSettingsChange}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={t('plugin.name')}>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

export default SampleSettings;
