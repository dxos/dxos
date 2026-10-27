//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';
import * as UiHooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';
import { NativeCapabilities, Settings } from '#types';

export type NativeSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

/** Update status comes from the update-manager capability, so this panel takes no settings props. */
export const NativeSettings = () => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const manager = Hooks.useCapability(NativeCapabilities.UpdateManager);
  const { description, button } = ToolkitHooks.useUpdateRow({ manager, t });

  return (
    <Form.Root schema={Schema.Struct({})} values={{}} variant='settings'>
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet
            label={meta.profile.name ?? meta.profile.key}
            actions={<SettingsScope.Root prefix={meta.profile.key} />}
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
