//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DEFAULT_EDGE_MODELS, DEFAULT_OLLAMA_MODELS } from '@dxos/ai';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type Assistant, LLM_PROVIDERS } from '../../types';
import { useTriggerRuntimeControls } from '../../hooks';
import { useLayout } from '@dxos/app-framework';
import { parseId } from '@dxos/client/echo';
import { useSpace } from '@dxos/react-client/echo';

// TODO(burdon): Factor out default Selector.
const DEFAULT_VALUE = '__default';

const LLM_PROVIDER_LABELS = {
  edge: 'DXOS',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
} as const;

export const AssistantSettings = ({ settings }: { settings: Assistant.Settings }) => {
  const { t } = useTranslation(meta.id);

  return (
    <ControlPage>
      <ControlSection title={t('settings title', { ns: meta.id })}>
        <ControlGroup>
          <ControlItemInput title={t('settings custom prompts label')}>
            <Input.Switch
              checked={!!settings.customPrompts}
              onCheckedChange={(checked) => (settings.customPrompts = checked)}
            />
          </ControlItemInput>

          <ControlItemInput title={t('settings llm provider label')}>
            <Select.Root
              value={settings.llmProvider ?? 'edge'}
              onValueChange={(value) => {
                settings.llmProvider = value === DEFAULT_VALUE ? undefined : (value as any);
              }}
            >
              <Select.TriggerButton placeholder={t('settings llm provider label')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    <Select.Option value={DEFAULT_VALUE}>{t('settings default label')}</Select.Option>
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
          </ControlItemInput>

          <ControlItemInput title={t('settings edge llm model label')}>
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>

          <ControlItemInput title={t('settings ollama llm model label')}>
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
                  <Select.Arrow />
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </ControlItemInput>
        </ControlGroup>
      </ControlSection>

      <ControlSection title={'Local triggers'} description={'Manage local trigger execution'}>
        <ControlGroup>
          <TriggersSettings />
        </ControlGroup>
      </ControlSection>
    </ControlPage>
  );
};

const TriggersSettings = () => {
  const layout = useLayout();
  const { spaceId } = parseId(layout.workspace);
  const space = useSpace(spaceId);
  const { triggers, isRunning, start, stop } = useTriggerRuntimeControls(space);
  const { t } = useTranslation(meta.id);

  return (
    <Input.Root>
      <div>{isRunning ? t('trigger dispatcher running') : t('trigger dispatcher stopped')}</div>
      <Input.Switch classNames='mis-2 mie-2' checked={isRunning} onCheckedChange={isRunning ? stop : start} />
    </Input.Root>
  );
};
