//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { FormInput } from '@dxos/react-ui-data';

import { STACK_PLUGIN } from '../meta';
import { type StackSettingsProps } from '../types';

export const StackSettings = ({ settings }: { settings: StackSettingsProps }) => {
  const { t } = useTranslation(STACK_PLUGIN);

  return (
    <>
      <FormInput label={t('settings separation label')}>
        <Input.Switch checked={settings.separation} onCheckedChange={(checked) => (settings.separation = !!checked)} />
      </FormInput>
    </>
  );
};
