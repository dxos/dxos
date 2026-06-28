//
// Copyright 2023 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { OLLAMA_MODEL_PREFIX, type Provider } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Assistant, AssistantCapabilities, type Ollama } from '#types';

import { presetsForProvider, resolveProvider } from '../../processor';
import { OllamaModels } from './OllamaModels';

export type AssistantSettingsProps = AppSurface.SettingsProps<Assistant.Settings>;

// The per-provider model-default options must match the chat picker (usePresets), which lists the
// curated presets per provider (and installed models for the built-in sidecar).
const presetOptions = (provider: Provider) =>
  presetsForProvider(provider).map((preset) => ({ value: preset.model, label: preset.label }));

// Stable fallback so `useAtomValue` is always called with a valid atom when the manager is absent.
const emptyStateAtom = Atom.make<Ollama.ModelsState>({
  kind: 'idle',
  models: [],
  loaded: [],
  pulls: {},
  errors: {},
});

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  // The Ollama manager is the bundled sidecar (desktop only). Its presence selects the local
  // provider: the managed `built-in` (offering installed models) vs. an external `ollama` server.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const ollamaState = useAtomValue(ollamaManager?.state ?? emptyStateAtom);
  const localProvider: Provider = ollamaManager ? 'built-in' : 'ollama';
  const ollamaOptions = useMemo(
    () => ollamaState.models.map((model) => ({ value: `${OLLAMA_MODEL_PREFIX}${model.name}`, label: model.name })),
    [ollamaState.models],
  );

  // Reconcile a stored provider with the runtime (legacy `ollama` → `built-in` on desktop) so the
  // dropdown shows a concrete, available selection rather than blank.
  const values = useMemo(
    () => ({ ...settings, modelProvider: resolveProvider(settings.modelProvider, !!ollamaManager) }),
    [settings, ollamaManager],
  );

  // Form `fieldMap` is keyed by dotted JSON path, so nested struct leaves are addressed directly.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      // `defaultLabel: null` drops the sentinel "Default" option — a provider is always concrete.
      modelProvider: createSelectField({
        defaultLabel: null,
        options: [
          { value: 'edge', label: t('settings.provider.edge.label') },
          { value: localProvider, label: t(`settings.provider.${localProvider}.label`) },
          { value: 'lmstudio', label: t('settings.provider.lmstudio.label') },
        ],
      }),
      'modelDefaults.edge': createSelectField({ options: presetOptions('edge') }),
      // Built-in offers installed models; external Ollama offers the curated suggestions.
      [`modelDefaults.${localProvider}`]: createSelectField({
        options: localProvider === 'built-in' ? ollamaOptions : presetOptions('ollama'),
      }),
      'modelDefaults.lmstudio': createSelectField({ options: presetOptions('lmstudio') }),
    }),
    [t, localProvider, ollamaOptions],
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
