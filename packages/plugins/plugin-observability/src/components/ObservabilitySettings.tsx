//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { ObservabilityOperation } from '../types';

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
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <Message.Root valence='info' classNames='container-max-width mbe-cardSpacingBlock'>
          <Message.Content>{t('observability description')}</Message.Content>
        </Message.Root>
        <ControlGroup>
          <ControlItemInput title={t('observability enabled label')}>
            <Input.Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => invokePromise(ObservabilityOperation.Toggle, { state: !!checked })}
            />
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};
