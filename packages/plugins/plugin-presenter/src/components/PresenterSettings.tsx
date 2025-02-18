//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

import { PRESENTER_PLUGIN } from '../meta';
import { type PresenterSettingsProps } from '../types';

export const PresenterSettings = ({ settings }: { settings: PresenterSettingsProps }) => {
  const { t } = useTranslation(PRESENTER_PLUGIN);

  return (
    <StackItem.Content toolbar={false} role='article' classNames='p-4 block overflow-y-auto'>
      <DeprecatedFormInput label={t('present collections label')}>
        <Input.Switch
          checked={settings.presentCollections}
          onCheckedChange={(checked) => (settings.presentCollections = !!checked)}
        />
      </DeprecatedFormInput>
    </StackItem.Content>
  );
};
