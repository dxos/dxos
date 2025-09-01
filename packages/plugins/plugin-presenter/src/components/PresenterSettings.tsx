//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { PRESENTER_PLUGIN } from '../meta';
import { type PresenterSettingsProps } from '../types';

export const PresenterSettings = ({ settings }: { settings: PresenterSettingsProps }) => {
  const { t } = useTranslation(PRESENTER_PLUGIN);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: PRESENTER_PLUGIN })}>
        <ControlGroup>
          <ControlItemInput title={t('present collections label')}>
            <Input.Switch
              checked={settings.presentCollections}
              onCheckedChange={(checked) => (settings.presentCollections = !!checked)}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
