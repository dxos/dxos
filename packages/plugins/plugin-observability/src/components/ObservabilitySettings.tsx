//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';
import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { OBSERVABILITY_PLUGIN } from '../meta';
import { ObservabilityAction } from '../types';

export const ObservabilitySettingsSchema = Schema.mutable(
  Schema.Struct({
    enabled: Schema.Boolean,
    // TODO(wittjosiah): Separate settings for each observability feature.
    // metrics?: boolean;
    // telemetry?: boolean;
    // errors?: boolean;
  }),
);

export type ObservabilitySettingsProps = Schema.Schema.Type<typeof ObservabilitySettingsSchema>;

export const ObservabilitySettings = ({ settings }: { settings: ObservabilitySettingsProps }) => {
  const { t } = useTranslation(OBSERVABILITY_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return (
    <ControlPage>
      <ControlSection title={t('observability enabled label')}>
        <Message.Root valence='info' classNames='container-max-width mbe-cardSpacingBlock'>
          <Message.Content>{t('observability description')}</Message.Content>
        </Message.Root>
        <ControlGroup>
          <ControlItemInput title={t('observability enabled label')}>
            <Input.Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => dispatch(createIntent(ObservabilityAction.Toggle, { state: !!checked }))}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
