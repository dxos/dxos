//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

import { Settings as MapSettingsSchema } from '../../types/Settings';

export type MapSettingsProps = {
  settings: MapSettingsSchema;
  onSettingsChange: (settings: MapSettingsSchema) => void;
};

/**
 * Settings panel for Maps. `Form` renders the `apiKeys` array natively (its `ArrayField`), so no custom
 * field is needed for array support.
 */
export const MapSettings = ({ settings, onSettingsChange }: MapSettingsProps) => {
  return (
    <Form.Root
      schema={MapSettingsSchema}
      values={settings}
      variant='settings'
      onValuesChanged={(values) => onSettingsChange({ ...settings, ...values })}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.FieldSet />
          </Form.Section>
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};

export default MapSettings;
