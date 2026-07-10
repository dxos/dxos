//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Button, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type SupportSettingsProps = AppSurface.SettingsProps<Settings.Settings> & {
  onShowWelcome?: () => void;
};

export const SupportSettings = ({ settings, onSettingsChange, onShowWelcome }: SupportSettingsProps) => {
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
            {onShowWelcome && (
              <Form.Row label={t('show-welcome.label')}>
                <Button onClick={onShowWelcome}>{t('show-welcome.label')}</Button>
              </Form.Row>
            )}
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SupportSettings.displayName = 'SupportSettings';
