//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import * as Settings from '../../types/Settings';

export type ExcalidrawSettingsProps = AppSurface.SettingsProps<Settings.Settings>;

export const ExcalidrawSettings = ({ settings, onSettingsChange }: ExcalidrawSettingsProps) => {
  return (
    <Form.Root
      variant='settings'
      schema={Settings.Settings}
      readonly={!onSettingsChange}
      values={settings}
      onValuesChanged={(values) => onSettingsChange?.((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name}>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

ExcalidrawSettings.displayName = 'ExcalidrawSettings';
