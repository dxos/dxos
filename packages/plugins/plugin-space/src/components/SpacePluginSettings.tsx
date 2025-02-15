//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { SPACE_PLUGIN } from '../meta';
import { type SpaceSettingsProps } from '../types';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <StackItem.Content toolbar={false} role='article' classNames='p-4 block overflow-y-auto'>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch checked={settings.showHidden} onCheckedChange={(checked) => (settings.showHidden = !!checked)} />
      </DeprecatedFormInput>
    </StackItem.Content>
  );
};
