//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type StackSettingsProps } from '../types';

export const StackSettings = ({ settings }: { settings: StackSettingsProps }) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('settings separation label')}>
            <Input.Switch
              checked={settings.separation}
              onCheckedChange={(checked) => (settings.separation = !!checked)}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
