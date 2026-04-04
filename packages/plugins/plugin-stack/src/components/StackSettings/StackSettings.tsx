//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type StackSettingsProps } from '../../types';

export const StackSettings = ({ settings }: { settings: StackSettingsProps }) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Root>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Group>
          <SettingsForm.ItemInput title={t('settings-separation.label')}>
            <Input.Switch
              checked={settings.separation}
              onCheckedChange={(checked) => (settings.separation = !!checked)}
            />
          </SettingsForm.ItemInput>
        </SettingsForm.Group>
      </SettingsForm.Section>
    </SettingsForm.Root>
  );
};
