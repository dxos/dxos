//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { Settings } from '../../types';

export type MeetingSettingsProps = SettingsSurfaceProps<Settings.Settings>;

export const MeetingSettings = ({ settings, onSettingsChange }: MeetingSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('entity-extraction.label')} description={t('entity-extraction.description')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={!!settings.entityExtraction}
              onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, entityExtraction: checked }))}
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
