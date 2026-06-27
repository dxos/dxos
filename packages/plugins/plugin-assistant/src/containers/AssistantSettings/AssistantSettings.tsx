//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_LMSTUDIO_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Assistant } from '#types';

import { OllamaModels } from './OllamaModels';

export type AssistantSettingsProps = AppSurface.SettingsProps<Assistant.Settings>;

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Form `fieldMap` is keyed by dotted JSON path, so nested struct leaves are addressed directly.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      'modelDefaults.edge': createSelectField({ options: DEFAULT_EDGE_MODELS }),
      'modelDefaults.ollama': createSelectField({ options: DEFAULT_OLLAMA_MODELS }),
      'modelDefaults.lmstudio': createSelectField({ options: DEFAULT_LMSTUDIO_MODELS }),
    }),
    [],
  );

  return (
    <Form.Root
      variant='settings'
      schema={Assistant.Settings}
      readonly={!onSettingsChange}
      values={settings}
      onValuesChanged={(values) => onSettingsChange?.(() => values)}
    >
      <Form.Viewport scroll>
        <Form.Content>
          <Form.Section title={meta.profile.name ?? meta.profile.key}>
            <Form.FieldSet fieldMap={fieldMap} />
          </Form.Section>
          <OllamaModels />
        </Form.Content>
      </Form.Viewport>
    </Form.Root>
  );
};
