//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_LMSTUDIO_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm, createSelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Assistant } from '#types';

export type AssistantSettingsProps = AppSurface.SettingsArticleProps<Assistant.Settings>;

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const fieldMap = useMemo(
    () => ({
      modelDefaults: {
        edge: createSelectField({ options: DEFAULT_EDGE_MODELS }),
        ollama: createSelectField({ options: DEFAULT_OLLAMA_MODELS }),
        lmstudio: createSelectField({ options: DEFAULT_LMSTUDIO_MODELS }),
      },
    }),
    [],
  );

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.FieldSet
          readonly={!onSettingsChange}
          schema={Assistant.Settings}
          fieldMap={fieldMap}
          values={settings}
          onValuesChanged={onSettingsChange}
        />
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
