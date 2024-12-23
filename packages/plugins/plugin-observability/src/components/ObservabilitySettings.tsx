//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormInput } from '@dxos/react-ui-form';

import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction } from '../types';

export type ObservabilitySettingsProps = {
  enabled?: boolean;
  // TODO(wittjosiah): Separate settings for each observability feature.
  // metrics?: boolean;
  // telemetry?: boolean;
  // errors?: boolean;
};

export const ObservabilitySettings = ({ settings }: { settings: ObservabilitySettingsProps }) => {
  const { t } = useTranslation(OBSERVABILITY_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return (
    <>
      <DeprecatedFormInput
        label={t('observability enabled label')}
        secondary={
          <Message.Root valence='info'>
            <Message.Body>{t('observability description')}</Message.Body>
          </Message.Root>
        }
      >
        <Input.Switch
          checked={settings.enabled}
          onCheckedChange={(checked) => dispatch(createIntent(ObservabilityAction.Toggle, { state: !!checked }))}
        />
      </DeprecatedFormInput>
    </>
  );
};
