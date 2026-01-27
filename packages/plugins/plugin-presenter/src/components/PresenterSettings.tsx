//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { type PresenterSettingsProps } from '../types';

export type PresenterSettingsComponentProps = {
  settings: PresenterSettingsProps;
  onSettingsChange: (fn: (current: PresenterSettingsProps) => PresenterSettingsProps) => void;
};

export const PresenterSettings = ({ settings, onSettingsChange }: PresenterSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('present collections label')}>
            <Input.Switch
              checked={settings.presentCollections}
              onCheckedChange={(checked) => onSettingsChange((s) => ({ ...s, presentCollections: !!checked }))}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
