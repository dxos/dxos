//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Banner, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { ObservabilityOperation, Settings } from '#types';

export type ObservabilitySettingsProps = AppSurface.SettingsData;

/**
 * Edits are routed through the operations rather than written to the atom directly, so a toggle
 * takes effect on the running services and reaches the settings space.
 */
export const ObservabilitySettings = ({ subject }: ObservabilitySettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { settings } = useSettingsState<Settings.Settings>(subject.atom);
  const { invokePromise } = useOperationInvoker();

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => {
        if (values.enabled !== undefined && values.enabled !== settings.enabled) {
          void invokePromise(ObservabilityOperation.SetEnabled, { state: values.enabled });
        }
        if (values.aiContentCapture !== undefined && values.aiContentCapture !== settings.aiContentCapture) {
          void invokePromise(ObservabilityOperation.SetAiContentCapture, { state: values.aiContentCapture });
        }
      }}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Banner.Root valence='info'>
              <Banner.Content>
                <Banner.Body>{t('observability.description')}</Banner.Body>
              </Banner.Content>
            </Banner.Root>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ObservabilitySettings.displayName = 'ObservabilitySettings';
