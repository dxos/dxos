//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useCapability } from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { SettingsScope } from '@dxos/app-toolkit/SettingsScope';
import { useUpdateRow } from '@dxos/app-toolkit/UpdateRow';
import { Form } from '@dxos/react-ui-form';
import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { NativeCapabilities, Settings } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

/** Update status comes from the update-manager capability, so this panel takes no settings props. */
export const NativeSettings = () => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const manager = useCapability(NativeCapabilities.UpdateManager);
  const { description, button } = useUpdateRow({ manager, t });

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope prefix={meta.profile.key} />}
          >
            <Form.Field standalone label={t('settings.updates.label')} description={description}>
              {button}
            </Form.Field>
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

NativeSettings.displayName = 'NativeSettings';
