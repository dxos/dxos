//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SettingsScope from '@dxos/app-toolkit/SettingsScope';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type ExcalidrawSettingsProps = AppSurface.SettingsData;

export const ExcalidrawSettings = ({ subject }: ExcalidrawSettingsProps) => {
  const { settings, updateSettings } = Hooks.useSettingsState<Settings.Settings>(subject.atom);

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={meta.profile.name} actions={<SettingsScope.Root prefix={meta.profile.key} />}>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ExcalidrawSettings.displayName = 'ExcalidrawSettings';
