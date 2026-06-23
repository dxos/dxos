//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Message, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type ObservabilitySettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const ObservabilitySettings = ({ settings, onSettingsChange }: ObservabilitySettingsProps) => {
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
          <Form.Section title={meta.profile.name}>
            <Message.Root valence='info'>
              <Message.Content>{t('observability.description')}</Message.Content>
            </Message.Root>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
