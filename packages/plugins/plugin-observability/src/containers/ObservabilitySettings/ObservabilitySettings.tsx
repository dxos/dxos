//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Input, Message, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { ObservabilityOperation } from '../../types';

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

export type ObservabilitySettingsComponentProps = {
  settings: ObservabilitySettingsProps;
  onSettingsChange: (fn: (current: ObservabilitySettingsProps) => ObservabilitySettingsProps) => void;
};

export const ObservabilitySettings = ({ settings }: ObservabilitySettingsComponentProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  // TODO(burdon): dx-container-max-width
  return (
    <Settings.Root>
      <Settings.Section title={t('settings title', { ns: meta.id })}>
        <Message.Root valence='info' classNames=' mb-form-padding'>
          <Message.Content>{t('observability description')}</Message.Content>
        </Message.Root>
        <Settings.Group>
          <Settings.ItemInput title={t('observability enabled label')}>
            <Input.Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => invokePromise(ObservabilityOperation.Toggle, { state: !!checked })}
            />
          </Settings.ItemInput>
        </Settings.Group>
      </Settings.Section>
    </Settings.Root>
  );
};
