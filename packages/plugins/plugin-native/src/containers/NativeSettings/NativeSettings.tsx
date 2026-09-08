//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface, useUpdateRow } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { NativeCapabilities, Settings } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

/**
 * Update status comes from the update-manager capability, so this panel takes no settings props.
 *
 * The row itself is shared with the web (`useUpdateRow`): both platforms contribute the same
 * `UpdateManager`, and updates should not read differently depending on which app you opened.
 */
export const NativeSettings = () => {
  const { t } = useTranslation(meta.profile.key);
  const manager = useCapability(NativeCapabilities.UpdateManager);
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

NativeSettings.displayName = 'NativeSettings';
