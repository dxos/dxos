//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type AppSurface, useUpdateRow } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type PwaSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

/**
 * The web's update panel, and the permanent home for an update the refresh toast is easy to miss.
 *
 * Deliberately the same `useUpdateRow` the desktop app renders: both platforms contribute the same
 * `UpdateManager`, so the only thing that differs is which one answered.
 */
export const PwaSettings = () => {
  const { t } = useTranslation(meta.profile.key);
  const manager = useCapability(AppCapabilities.UpdateManager);
  const { description, button } = useUpdateRow({ manager, t });

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.Field label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Field>
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

PwaSettings.displayName = 'PwaSettings';
