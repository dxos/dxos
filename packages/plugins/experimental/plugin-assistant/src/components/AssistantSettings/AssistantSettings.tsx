//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/assistant';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { ASSISTANT_PLUGIN } from '../../meta';
import { type AssistantSettingsProps } from '../../types';

export const AssistantSettings = ({ settings }: { settings: AssistantSettingsProps }) => {
  const { t } = useTranslation(ASSISTANT_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings custom prompts label')}>
        <Input.Switch
          checked={!!settings.customPrompts}
          onCheckedChange={(checked) => (settings.customPrompts = checked)}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings edge llm model label')}>
        <Select.Root
          value={settings.edgeModel ?? 'default'}
          onValueChange={(value) => {
            settings.edgeModel = value;
          }}
        >
          <Select.TriggerButton placeholder={t('settings default llm model label')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={''}>{t('settings default')}</Select.Option>
                {DEFAULT_EDGE_MODELS.map((model) => (
                  <Select.Option key={model} value={model}>
                    {model}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings llm provider label')}>
        <Input.Switch
          checked={!!settings.llmProvider}
          onCheckedChange={(checked) => (settings.llmProvider = checked ? 'ollama' : 'edge')}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings ollama llm model label')}>
        <Select.Root
          value={settings.ollamaModel ?? 'default'}
          onValueChange={(value) => {
            settings.ollamaModel = value;
          }}
        >
          <Select.TriggerButton placeholder={t('settings default llm model label')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={''}>{t('settings default')}</Select.Option>
                {DEFAULT_OLLAMA_MODELS.map((model) => (
                  <Select.Option key={model} value={model}>
                    {model}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </DeprecatedFormInput>
    </DeprecatedFormContainer>
  );
};
