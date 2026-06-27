//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Assistant, AssistantCapabilities, type Ollama } from '#types';

import { AiServicePresets } from '../../processor';
import { OllamaModels } from './OllamaModels';

export type AssistantSettingsProps = AppSurface.SettingsProps<Assistant.Settings>;

// The per-provider model-default options must match the chat picker (usePresets), which lists the
// curated presets for edge/LM Studio and the installed models for Ollama.
const presetOptions = (provider: string) =>
  AiServicePresets.filter((preset) => preset.provider === provider).map((preset) => ({
    value: preset.model,
    label: preset.label ?? preset.model,
  }));

// Stable fallback so `useAtomValue` is always called with a valid atom when the manager is absent.
const emptyStateAtom = Atom.make<Ollama.ModelsState>({ kind: 'idle', models: [], loaded: [], pulls: {} });

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  // The Ollama default offers installed models (desktop) so the configured default is resolvable.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const ollamaState = useAtomValue(ollamaManager?.state ?? emptyStateAtom);
  const ollamaOptions = useMemo(
    () => ollamaState.models.map((model) => ({ value: `ai.ollama.model.${model.name}`, label: model.name })),
    [ollamaState.models],
  );

  // Show DXOS as the concrete default when no provider has been chosen yet (the unset value resolves
  // to `edge` at the chat layer); avoids a blank/"Default" provider in the dropdown.
  const values = useMemo(() => ({ ...settings, modelProvider: settings.modelProvider ?? 'edge' }), [settings]);

  // Form `fieldMap` is keyed by dotted JSON path, so nested struct leaves are addressed directly.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      // The bundled sidecar (manager present) is the "Built-in" provider; a user-run server is "Ollama".
      // `defaultLabel: null` drops the sentinel "Default" option — a provider is always concrete.
      modelProvider: createSelectField({
        defaultLabel: null,
        options: [
          { value: 'edge', label: t('settings.provider.edge.label') },
          {
            value: 'ollama',
            label: t(ollamaManager ? 'settings.provider.builtin.label' : 'settings.provider.ollama.label'),
          },
          { value: 'lmstudio', label: t('settings.provider.lmstudio.label') },
        ],
      }),
      'modelDefaults.edge': createSelectField({ options: presetOptions('dxos-remote') }),
      'modelDefaults.ollama': createSelectField({ options: ollamaOptions }),
      'modelDefaults.lmstudio': createSelectField({ options: presetOptions('lm-studio') }),
    }),
    [t, ollamaManager, ollamaOptions],
  );

  return (
    <Form.Root
      variant='settings'
      schema={Assistant.Settings}
      readonly={!onSettingsChange}
      values={values}
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
