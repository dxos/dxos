//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Form } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { Settings } from '#types';

export type ScriptSettingsProps = AppSurface.SettingsProps<
  Settings.Settings,
  {
    onAuthenticate?: () => void;
  }
>;

export const ScriptSettings = ({ settings, onSettingsChange, scope, onAuthenticate }: ScriptSettingsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);

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
          <Form.FieldSet label={meta.profile.name ?? meta.profile.key} actions={scope}>
            {/* TODO(wittjosiah): Hide outside of dev environments. */}
            <Form.Field
              standalone
              label={t('authenticate-action.label')}
              description={t('authenticate-action.description')}
            >
              <Button.Button disabled={!onSettingsChange} onClick={onAuthenticate}>
                {t('authenticate-button.label')}
              </Button.Button>
            </Form.Field>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ScriptSettings.displayName = 'ScriptSettings';
