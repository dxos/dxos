//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type GeneratorSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const GeneratorSettings = ({ settings, onSettingsChange }: GeneratorSettingsProps) => {
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

export default GeneratorSettings;
