//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/assistant';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { ASSISTANT_PLUGIN } from '../../meta';
import { type AssistantSettingsProps } from '../../types';

// TODO(burdon): Factor out.
const DEFAULT_VALUE = '__default';

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

      <DeprecatedFormInput label={t('settings llm provider label')}>
        <Input.Switch
          checked={!!settings.llmProvider}
          onCheckedChange={(checked) => (settings.llmProvider = checked ? 'ollama' : 'edge')}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings edge llm model label')}>
        <Select.Root
          value={settings.edgeModel ?? DEFAULT_VALUE}
          onValueChange={(value) => {
            settings.edgeModel = value === DEFAULT_VALUE ? undefined : value;
          }}
        >
          <Select.TriggerButton placeholder={t('settings default llm model label')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={DEFAULT_VALUE}>{t('settings default label')}</Select.Option>
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

      <DeprecatedFormInput label={t('settings ollama llm model label')}>
        <Select.Root
          value={settings.ollamaModel ?? DEFAULT_VALUE}
          onValueChange={(value) => {
            settings.ollamaModel = value === DEFAULT_VALUE ? undefined : value;
          }}
        >
          <Select.TriggerButton placeholder={t('settings default llm model label')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                <Select.Option value={DEFAULT_VALUE}>{t('settings default label')}</Select.Option>
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
