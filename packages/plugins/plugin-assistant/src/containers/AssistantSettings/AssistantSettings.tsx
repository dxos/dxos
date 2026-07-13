//
// Copyright 2023 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { Provider } from '@dxos/ai';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type DXN } from '@dxos/keys';
import { useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, createSelectField } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { Assistant, AssistantCapabilities, Ollama } from '#types';

import { presetsForProvider, resolveProvider } from '../../processor';
import { OllamaModels } from './OllamaModels';

export type AssistantSettingsProps = AppSurface.SettingsProps<Assistant.Settings>;

// The per-provider model-default options must match the chat picker (usePresets): the catalog models
// served by the provider, restricted to installed models when `installed` is supplied (local sidecar).
const presetOptions = (provider: DXN.DXN, installed?: ReadonlySet<string>) =>
  presetsForProvider(provider)
    .filter((preset) => !installed || installed.has(preset.backend))
    .map((preset) => ({ value: preset.model, label: preset.label }));

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.profile.key);

  // The Ollama manager is the bundled sidecar (desktop only). Its presence selects the local
  // provider: the managed `built-in` vs. an external `ollama` server.
  const ollamaManager = useOptionalCapability(AssistantCapabilities.OllamaManager);
  const localProvider = ollamaManager ? Provider.builtIn : Provider.ollama;
  const localProviderKey = ollamaManager ? 'built-in' : 'ollama';

  // Installed models reported by the bundled sidecar; restricts the local default to present models.
  const localModels = useAtomValue(ollamaManager?.state ?? Ollama.emptyState);
  const installed = useMemo(() => new Set(localModels.models.map((model) => model.name)), [localModels]);

  // Reconcile a stored provider with the runtime (`ollama` → `built-in` on desktop) so the
  // dropdown shows a concrete, available selection rather than blank.
  const values = useMemo(
    () => ({ ...settings, modelProvider: resolveProvider(settings.modelProvider, !!ollamaManager) }),
    [settings, ollamaManager],
  );

  // Form `fieldMap` is keyed by dotted JSON path, so nested struct leaves are addressed directly.
  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      // `defaultLabel: null` drops the sentinel "Default" option — a provider is always concrete.
      'modelProvider': createSelectField({
        defaultLabel: null,
        options: [
          { value: Provider.edge.id, label: t('settings.provider.edge.label') },
          { value: localProvider.id, label: t(`settings.provider.${localProviderKey}.label`) },
          { value: Provider.lmStudio.id, label: t('settings.provider.lmstudio.label') },
        ],
      }),
      'modelDefaults.edge': createSelectField({ options: presetOptions(Provider.edge.id) }),
      // `built-in` and `ollama` share the `ollama` default key; the managed sidecar restricts to installed.
      'modelDefaults.ollama': createSelectField({
        options: presetOptions(localProvider.id, ollamaManager ? installed : undefined),
      }),
      'modelDefaults.lmstudio': createSelectField({ options: presetOptions(Provider.lmStudio.id) }),
    }),
    [t, localProvider, localProviderKey, ollamaManager, installed],
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

AssistantSettings.displayName = 'AssistantSettings';
