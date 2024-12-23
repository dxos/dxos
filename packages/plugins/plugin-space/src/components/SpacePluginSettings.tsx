//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction, type SpaceSettingsProps } from '../types';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return (
    <>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch
          checked={settings.showHidden}
          onCheckedChange={(checked) => dispatch(createIntent(SpaceAction.ToggleHidden, { state: !!checked }))}
        />
      </DeprecatedFormInput>
    </>
  );
};
