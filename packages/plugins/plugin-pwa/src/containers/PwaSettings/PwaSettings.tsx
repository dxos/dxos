//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type AppSurface, SettingsScope, useUpdateRow } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type PwaSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

/** The web counterpart of NativeSettings: same row, same capability, whichever platform contributed it. */
export const PwaSettings = () => {
  const { t } = useTranslation(meta.profile.key);
  const manager = useCapability(AppCapabilities.UpdateManager);
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

PwaSettings.displayName = 'PwaSettings';
