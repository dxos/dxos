//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type ScriptPluginSettingsProps = AppSurface.SettingsArticleProps<
  Settings.Settings,
  {
    onAuthenticate?: () => void;
  }
>;

export const ScriptPluginSettings = ({ settings, onSettingsChange, onAuthenticate }: ScriptPluginSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        {/* TODO(wittjosiah): Hide outside of dev environments. */}
        <SettingsForm.Item title={t('authenticate-action.label')} description={t('authenticate-action.description')}>
          <Button disabled={!onSettingsChange} onClick={onAuthenticate}>
            {t('authenticate-button.label')}
          </Button>
        </SettingsForm.Item>
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
