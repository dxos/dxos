//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type ScriptSettingsProps = AppSurface.SettingsProps<
  Settings.Settings,
  {
    onAuthenticate?: () => void;
  }
>;

export const ScriptSettings = ({ settings, onSettingsChange, onAuthenticate }: ScriptSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      readonly={!onSettingsChange}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            {/* TODO(wittjosiah): Hide outside of dev environments. */}
            <Form.Row label={t('authenticate-action.label')} description={t('authenticate-action.description')}>
              <Button disabled={!onSettingsChange} onClick={onAuthenticate}>
                {t('authenticate-button.label')}
              </Button>
            </Form.Row>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ScriptSettings.displayName = 'ScriptSettings';
