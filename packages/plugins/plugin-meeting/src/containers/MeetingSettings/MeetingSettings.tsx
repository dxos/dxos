//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Meeting } from '../../types';

export type MeetingSettingsComponentProps = {
  settings: Meeting.Settings;
  onSettingsChange: (fn: (current: Meeting.Settings) => Meeting.Settings) => void;
};

export const MeetingSettings = ({ settings, onSettingsChange }: MeetingSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('entity extraction label')} description={t('entity extraction description')}>
            <Input.Switch
              checked={!!settings.entityExtraction}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, entityExtraction: checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
