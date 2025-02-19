//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { THREAD_PLUGIN } from '../meta';
import type { ThreadSettingsProps } from '../types';

export const ThreadSettings = ({ settings }: { settings: ThreadSettingsProps }) => {
  const { t } = useTranslation(THREAD_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings standalone label')}>
        <Input.Switch checked={settings.standalone} onCheckedChange={(checked) => (settings.standalone = !!checked)} />
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
