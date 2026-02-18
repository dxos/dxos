//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type PresenterSettingsProps } from '../types';

export type PresenterSettingsComponentProps = {
  settings: PresenterSettingsProps;
  onSettingsChange: (fn: (current: PresenterSettingsProps) => PresenterSettingsProps) => void;
};

export const PresenterSettings = ({ settings, onSettingsChange }: PresenterSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Settings.Group>
          <Settings.ItemInput title={t('present collections label')}>
            <Input.Switch
              checked={settings.presentCollections}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, presentCollections: !!checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
