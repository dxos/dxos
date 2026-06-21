//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';

export type SpacetimeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const SpacetimeSettings = ({ settings, onSettingsChange }: SpacetimeSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.profile.key })}></SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
