//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';

import { SpaceAction, SPACE_PLUGIN } from '../meta';
import { type SpaceSettingsProps } from '../types';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const dispatch = useIntentDispatcher();

  return (
    <>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch
          checked={settings.showHidden}
          onCheckedChange={(checked) =>
            dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.TOGGLE_HIDDEN,
              data: { state: !!checked },
            })
          }
        />
      </DeprecatedFormInput>
    </>
  );
};
