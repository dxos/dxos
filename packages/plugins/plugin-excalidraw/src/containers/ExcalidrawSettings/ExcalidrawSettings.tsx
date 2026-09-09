//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type ExcalidrawSettingsProps = AppSurface.SettingsData;

export const ExcalidrawSettings = ({ subject }: ExcalidrawSettingsProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      values={settings}
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={meta.profile.name}>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ExcalidrawSettings.displayName = 'ExcalidrawSettings';
