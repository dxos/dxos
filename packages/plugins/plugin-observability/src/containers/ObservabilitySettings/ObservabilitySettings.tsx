//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as Banner from '@dxos/react-ui/Banner';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { ObservabilityOperation, Settings } from '#types';

export type ObservabilitySettingsProps = AppSurface.SettingsData;

/**
 * Edits are routed through {@link ObservabilityOperation.SetEnabled} rather than written to the atom
 * directly, so enabling/disabling observability takes effect on the running services.
 */
export const ObservabilitySettings = ({ subject }: ObservabilitySettingsProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { settings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);
  const { invokePromise } = Hooks.useOperationInvoker();

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
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={meta.profile.key} />}
          >
            <Banner.Root valence='info'>
              <Banner.Body>{t('observability.description')}</Banner.Body>
            </Banner.Root>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ObservabilitySettings.displayName = 'ObservabilitySettings';
