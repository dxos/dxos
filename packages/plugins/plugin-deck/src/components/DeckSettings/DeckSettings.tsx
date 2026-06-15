//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

const isSocket = !!(globalThis as any).__args;

export type DeckSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

export const DeckSettings = ({ settings, onSettingsChange }: DeckSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Settings.Settings}
          visible={(path) => path !== 'enableNativeRedirect' || !isSocket}
          values={settings}
          onValuesChanged={(values) => onSettingsChange?.(() => values)}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
