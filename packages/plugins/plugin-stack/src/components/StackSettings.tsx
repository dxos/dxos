//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { STACK_PLUGIN } from '../meta';
import { type StackSettingsProps } from '../types';

export const StackSettings = ({ settings }: { settings: StackSettingsProps }) => {
  const { t } = useTranslation(STACK_PLUGIN);

  return (
    <ControlPage>
      <ControlSection title={t('stack settings title', { ns: STACK_PLUGIN })}>
        <ControlGroup>
          <ControlItemInput title={t('settings separation label')}>
            <Input.Switch
              checked={settings.separation}
              onCheckedChange={(checked) => (settings.separation = !!checked)}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
