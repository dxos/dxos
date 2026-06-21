//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { Input } from '@dxos/react-ui';
import { Settings, type SettingsFieldMap, type SettingsFieldProps } from '@dxos/react-ui-form';
import { type APIKey } from '@dxos/schema';

import { meta } from '#meta';

import { RECOGNIZED_API_KEY_DOMAINS, Settings as MapSettingsSchema } from '../../types/Settings';

export type MapSettingsProps = {
  settings: MapSettingsSchema;
  onSettingsChange: (settings: MapSettingsSchema) => void;
};

/**
 * Custom renderer for the `apiKeys` array field. Arrays are not handled by the
 * generic `Settings.FieldSet`, so each recognized domain gets a password input
 * bound to its matching `APIKey` entry; clearing an input removes the entry.
 */
const ApiKeysField = ({ value, onChange, readonly }: SettingsFieldProps<readonly APIKey[] | undefined>) => {
  const handleChange = useCallback(
    (domain: string, apiKey: string) => {
      const others = (value ?? []).filter((entry) => entry.domain !== domain);
      const trimmed = apiKey.trim();
      onChange(trimmed.length > 0 ? [...others, { name: domain, domain, apiKey: trimmed }] : others);
    },
    [value, onChange],
  );

  return (
    <div className='flex flex-col gap-trim-md'>
      {RECOGNIZED_API_KEY_DOMAINS.map((domain) => (
        <Input.Root key={domain}>
          <Input.Label classNames='text-description'>{domain}</Input.Label>
          <Input.TextInput
            type='password'
            disabled={readonly}
            value={value?.find((entry) => entry.domain === domain)?.apiKey ?? ''}
            onChange={(event) => handleChange(domain, event.target.value)}
          />
        </Input.Root>
      ))}
    </div>
  );
};

// `SettingsFieldMap<MapSettingsSchema>` forces array-typed keys into the nested-map branch and
// cannot type a custom renderer for an array field; the default map resolves the key to the
// `React.FC | nested` union, which accepts the field component.
const fieldMap: SettingsFieldMap = { apiKeys: ApiKeysField };

/**
 * Settings panel for Maps. Drives the schema-based form via `Settings.FieldSet`
 * and supplies a custom field renderer for the `apiKeys` array.
 */
export const MapSettings = ({ settings, onSettingsChange }: MapSettingsProps) => {
  return (
    <Settings.Viewport>
      <Settings.Section title={meta.profile.name ?? meta.profile.key}>
        <Settings.FieldSet
          schema={MapSettingsSchema}
          values={settings}
          onValuesChanged={onSettingsChange}
          fieldMap={fieldMap}
        />
      </Settings.Section>
    </Settings.Viewport>
  );
};

export default MapSettings;
