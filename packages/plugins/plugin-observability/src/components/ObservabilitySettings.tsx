//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { parseIntentPlugin, useResolvePlugin } from '@dxos/app-framework';
import { SettingsValue } from '@dxos/plugin-settings';
import { Input, Message, useTranslation } from '@dxos/react-ui';

import { OBSERVABILITY_PLUGIN, ObservabilityAction } from '../meta';

export type ObservabilitySettingsProps = {
  enabled?: boolean;
  // TODO(wittjosiah): Separate settings for each observability feature.
  // metrics?: boolean;
  // telemetry?: boolean;
  // errors?: boolean;
};

export const ObservabilitySettings = ({ settings }: { settings: ObservabilitySettingsProps }) => {
  const { t } = useTranslation(OBSERVABILITY_PLUGIN);
  const intentPlugin = useResolvePlugin(parseIntentPlugin);

  return (
    <>
      {intentPlugin && (
        <SettingsValue
          label={t('observability enabled label')}
          secondary={
            <Message.Root valence='info'>
              <Message.Body>{t('observability description')}</Message.Body>
            </Message.Root>
          }
        >
          <Input.Switch
            checked={settings.enabled}
            onCheckedChange={(checked) =>
              intentPlugin.provides.intent.dispatch({
                plugin: OBSERVABILITY_PLUGIN,
                action: ObservabilityAction.TOGGLE,
                data: { state: !!checked },
              })
            }
          />
        </SettingsValue>
      )}
    </>
  );
};
