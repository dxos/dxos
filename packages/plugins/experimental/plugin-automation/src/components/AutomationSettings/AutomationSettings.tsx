//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DEFAULT_LLM_MODELS } from '@dxos/assistant';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { AUTOMATION_PLUGIN } from '../../meta';
import { type AutomationSettingsProps } from '../../types';

export const AutomationSettings = ({ settings }: { settings: AutomationSettingsProps }) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('settings custom prompts label')}>
        <Input.Switch
          checked={!!settings.customPrompts}
          onCheckedChange={(checked) => (settings.customPrompts = checked)}
        />
      </DeprecatedFormInput>

      <DeprecatedFormInput label={t('settings llm model label')}>
        <Select.Root
          value={settings.llmModel ?? 'default'}
          onValueChange={(value) => {
            settings.llmModel = value;
          }}
        >
          <Select.TriggerButton placeholder={t('settings default llm model label')} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {DEFAULT_LLM_MODELS.map((model) => (
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
