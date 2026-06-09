//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type SupportSettingsProps = {
  onShowWelcome?: () => void;
};

export const SupportSettings = ({ onShowWelcome }: SupportSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item title={t('show-welcome.label')} description={t('show-welcome.description')}>
          <Button onClick={onShowWelcome}>{t('show-welcome.label')}</Button>
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
