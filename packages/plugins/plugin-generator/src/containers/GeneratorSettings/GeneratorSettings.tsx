//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { Settings } from '#types';

const PROVIDER_SECTIONS: Array<{ id: 'heygen' | 'gemini'; title: string }> = [
  { id: 'heygen', title: 'HeyGen' },
  { id: 'gemini', title: 'Gemini (Veo)' },
];

export type GeneratorSettingsProps = AppSurface.SettingsArticleProps<Settings.Settings>;

/**
 * Per-provider settings panel. We explicitly render one `Section` per provider
 * (rather than letting `SettingsForm.FieldSet` auto-render the nested struct)
 * because the auto-renderer doesn't use struct titles as headings, which leaves
 * the user with multiple unlabelled "API key" inputs.
 */
export const GeneratorSettings = ({ settings, onSettingsChange }: GeneratorSettingsProps) => {
  const handleProviderChange = useCallback(
    (id: 'heygen' | 'gemini', value: Settings.ProviderSettings) => {
      onSettingsChange?.((current) => ({
        ...current,
        providers: {
          ...current.providers,
          [id]: value,
        },
      }));
    },
    [onSettingsChange],
  );

  return (
    <SettingsForm.Viewport>
      {PROVIDER_SECTIONS.map(({ id, title }) => (
        <SettingsForm.Section key={id} title={title}>
          <SettingsForm.FieldSet
            readonly={!onSettingsChange}
            schema={Settings.ProviderSettings}
            values={settings?.providers?.[id] ?? {}}
            onValuesChanged={(value) => handleProviderChange(id, value)}
          />
        </SettingsForm.Section>
      ))}
    </SettingsForm.Viewport>
  );
};

export default GeneratorSettings;
