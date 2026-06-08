//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type SupportSettingsProps = {
  welcomeDismissed?: boolean;
  onWelcomeDismissedChange?: (dismissed: boolean) => void;
  onShowWelcome?: () => void;
};

export const SupportSettings = ({
  welcomeDismissed,
  onWelcomeDismissedChange,
  onShowWelcome,
}: SupportSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.FieldSet
          readonly={!onWelcomeDismissedChange}
          schema={Settings.Settings}
          values={{ showWelcome: !welcomeDismissed }}
          onValuesChanged={(values) => onWelcomeDismissedChange?.(!values.showWelcome)}
        />
        <Button onClick={onShowWelcome}>{t('show-welcome.button')}</Button>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
