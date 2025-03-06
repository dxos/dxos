//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { SPACE_PLUGIN } from '../meta';
import { type SpaceSettingsProps } from '../types';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch checked={settings.showHidden} onCheckedChange={(checked) => (settings.showHidden = !!checked)} />
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
