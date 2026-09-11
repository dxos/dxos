//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useSettingsState } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Settings } from '#types';

export type SupportSettingsProps = AppSurface.SettingsData;

export const SupportSettings = ({ subject }: SupportSettingsProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return (
    <Form.Root
      schema={Settings.Settings}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => updateSettings((current) => ({ ...current, ...values }))}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.FieldSet label={meta.profile.name ?? meta.profile.key}>
            <Form.Fields />
          </Form.FieldSet>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

SupportSettings.displayName = 'SupportSettings';
