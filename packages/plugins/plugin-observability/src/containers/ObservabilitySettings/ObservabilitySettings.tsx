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
 * Edits are routed through {@link ObservabilityOperation.SetEnabled} rather than written to the atom
 * directly, so enabling/disabling observability takes effect on the running services.
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
      onValuesChanged={(values) =>
        void invokePromise(ObservabilityOperation.SetEnabled, { state: { ...settings, ...values }.enabled })
      }
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
