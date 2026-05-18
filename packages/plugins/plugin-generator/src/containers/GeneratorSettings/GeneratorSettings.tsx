//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type GeneratorSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const GeneratorSettings = ({ settings, onSettingsChange }: GeneratorSettingsProps) => {
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

export default GeneratorSettings;
