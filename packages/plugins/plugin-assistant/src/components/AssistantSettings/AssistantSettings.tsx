//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Assistant, LLM_PROVIDERS } from '#types';

// TODO(burdon): Factor out default Selector.
const DEFAULT_VALUE = '__default';

const LLM_PROVIDER_LABELS = {
  edge: 'DXOS',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
} as const;

export type AssistantSettingsProps = AppSurface.SettingsArticleProps<Assistant.Settings>;

export const AssistantSettings = ({ settings, onSettingsChange }: AssistantSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('settings.title', { ns: meta.id })}>
        <SettingsForm.Item
          title={t('settings.custom-prompts.label')}
          description={t('settings.custom-prompts.description')}
        >
          <Input.Switch
            disabled={!onSettingsChange}
            checked={!!settings.customPrompts}
            onCheckedChange={(checked) => onSettingsChange?.((s) => ({ ...s, customPrompts: checked }))}
          />
        </SettingsForm.Item>

        <SettingsForm.Item
          title={t('settings.llm-provider.label')}
          description={t('settings.llm-provider.description')}
        >
          <Select.Root
            disabled={!onSettingsChange}
            value={settings.llmProvider ?? 'edge'}
            onValueChange={(value) => {
              onSettingsChange?.((s) => ({
                ...s,
                llmProvider: value === DEFAULT_VALUE ? undefined : (value as any),
              }));
            }}
          >
            <Select.TriggerButton disabled={!onSettingsChange} placeholder={t('settings.llm-provider.label')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Option value={DEFAULT_VALUE}>{t('settings.default.label')}</Select.Option>
                  {LLM_PROVIDERS.map((model) => (
                    <Select.Option key={model} value={model}>
                      {LLM_PROVIDER_LABELS[model]}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>

        <SettingsForm.Item
          title={t('settings.edge-llm-model.label')}
          description={t('settings.edge-llm-model.description')}
        >
          <Select.Root
            disabled={!onSettingsChange}
            value={settings.edgeModel ?? DEFAULT_VALUE}
            onValueChange={(value) => {
              onSettingsChange?.((s) => ({ ...s, edgeModel: value === DEFAULT_VALUE ? undefined : value }));
            }}
          >
            <Select.TriggerButton disabled={!onSettingsChange} placeholder={t('settings.default-llm-model.label')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Option value={DEFAULT_VALUE}>{t('settings.default.label')}</Select.Option>
                  {DEFAULT_EDGE_MODELS.map((model) => (
                    <Select.Option key={model} value={model}>
                      {model}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>

        <SettingsForm.Item
          title={t('settings.ollama-llm-model.label')}
          description={t('settings.ollama-llm-model.description')}
        >
          <Select.Root
            disabled={!onSettingsChange}
            value={settings.ollamaModel ?? DEFAULT_VALUE}
            onValueChange={(value) => {
              onSettingsChange?.((s) => ({ ...s, ollamaModel: value === DEFAULT_VALUE ? undefined : value }));
            }}
          >
            <Select.TriggerButton disabled={!onSettingsChange} placeholder={t('settings.default-llm-model.label')} />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Option value={DEFAULT_VALUE}>{t('settings.default.label')}</Select.Option>
                  {DEFAULT_OLLAMA_MODELS.map((model) => (
                    <Select.Option key={model} value={model}>
                      {model}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </SettingsForm.Item>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
