//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { ChainPromptType } from '@braneframe/types';
import {
  FunctionDef,
  type FunctionTrigger,
  type FunctionTriggerType,
  type TriggerSpec,
  type TimerTrigger,
  type SubscriptionTrigger,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '@dxos/functions/types';
import { Filter, type Space, create, useQuery } from '@dxos/react-client/echo';
import { Input, Select } from '@dxos/react-ui';

import { PromptTemplate, Section } from './PromptTemplate';

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const functions = useQuery(space, Filter.schema(FunctionDef));

  const linkedFunction = useMemo(() => {
    return functions.find((fn) => fn.uri === trigger.function);
  }, [trigger.function, functions]);

  const handleSelectFunction = (value: string) => {
    const foundFunction = functions.find((fn) => fn.uri === value);
    if (foundFunction) {
      trigger.function = foundFunction.uri;
    }
  };

  const handleSelectTriggerType = (triggerType: string) => {
    switch (triggerType as FunctionTriggerType) {
      case 'subscription': {
        trigger.spec = { type: 'subscription', filter: [] };
        break;
      }
      case 'timer': {
        trigger.spec = { type: 'timer', cron: '0 0 * * *' };
        break;
      }
      case 'webhook': {
        trigger.spec = { type: 'webhook', method: 'GET' };
        break;
      }
      case 'websocket': {
        trigger.spec = { type: 'websocket', url: '' };
        break;
      }
    }
  };

  // Initialize prompt for GPT function.
  useEffect(() => {
    if (trigger.function === 'dxos.org/function/gpt') {
      // TODO(Zan): Change the default prompt.
      const prompt = create(ChainPromptType, { template: 'Say hello in German. {input-1}', inputs: [] });
      trigger.meta = { ...trigger.meta, prompt };
    }
  }, [trigger.function]);

  return (
    <div className='flex flex-col my-2 gap-4'>
      <Section title='Trigger Setup'>
        <div role='none' className='flex flex-col gap-2 p-2'>
          <div role='none' className='flex flex-row items-center gap-2'>
            <Input.Root>
              <Input.Label>Function</Input.Label>
              <Select.Root value={linkedFunction?.uri} onValueChange={handleSelectFunction}>
                <Select.TriggerButton placeholder={'Select function'} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {functions.map(({ id, uri }) => (
                        <Select.Option key={id} value={uri}>
                          {uri}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </Input.Root>

            <div role='none' className='flex flex-row items-center gap-2'>
              <Input.Root>
                <Input.Label>Trigger Type</Input.Label>
                <Select.Root value={trigger.spec?.type} onValueChange={handleSelectTriggerType}>
                  <Select.TriggerButton placeholder={'Select trigger'} />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {triggerTypes.map((trigger) => (
                          <Select.Option key={trigger} value={trigger}>
                            {trigger}
                          </Select.Option>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </Input.Root>
            </div>
          </div>

          {linkedFunction && <p className='text-sm fg-description'>{linkedFunction.description}</p>}
        </div>
        <div className='p-2 flex flex-col gap-2'>
          {trigger.spec && <TriggerSpec spec={trigger.spec} />}
          <TriggerMeta trigger={trigger} />
        </div>
      </Section>
    </div>
  );
};

const TriggerSpecSubscription = ({ spec }: { spec: SubscriptionTrigger }) => (
  <div className='flex flex-col gap-2'>
    <Input.Root>
      <Input.Label>Filter</Input.Label>
      <p>TODO: Schema Filter Here</p>
    </Input.Root>
  </div>
);

const TriggerSpecTimer = ({ spec }: { spec: TimerTrigger }) => (
  <div className='flex flex-row items-center gap-2'>
    <Input.Root>
      <Input.Label>Cron</Input.Label>
      <Input.TextInput value={spec.cron} onChange={(event) => (spec.cron = event.target.value)} />
    </Input.Root>
  </div>
);

const TriggerSpecWebhook = ({ spec }: { spec: WebhookTrigger }) => (
  <div className='flex flex-row items-center gap-2'>
    <Input.Root>
      <Input.Label>Method</Input.Label>
      <Input.TextInput value={spec.method} onChange={(event) => (spec.method = event.target.value)} />
    </Input.Root>
  </div>
);

const TriggerSpecWebsocket = ({ spec }: { spec: WebsocketTrigger }) => (
  <div className='flex flex-row items-center gap-2'>
    <Input.Root>
      <Input.Label>URL</Input.Label>
      <Input.TextInput value={spec.url} onChange={(event) => (spec.url = event.target.value)} />
    </Input.Root>
  </div>
);

const triggerRenderers: {
  [key in FunctionTriggerType]: React.ComponentType<{ spec: any }>;
} = {
  subscription: TriggerSpecSubscription,
  timer: TriggerSpecTimer,
  webhook: TriggerSpecWebhook,
  websocket: TriggerSpecWebsocket,
};

const TriggerSpec = ({ spec }: { spec: TriggerSpec }) => {
  const Renderer = triggerRenderers[spec.type];
  return Renderer ? <Renderer spec={spec} /> : null;
};

const TriggerMeta = ({ trigger }: { trigger: Partial<FunctionTrigger> }) => {
  if (!trigger || !trigger.function) {
    return null;
  }

  // TODO(zan): Wire up the meta editor for each function.
  if (trigger.function === 'dxos.org/function/gpt') {
    const meta = trigger.meta as any;

    if (meta?.prompt === undefined) {
      return null;
    }

    return (
      <div>
        <PromptTemplate prompt={meta.prompt} commandEditable={false} />
      </div>
    );
  }

  return <p>Meta for {trigger.function}</p>;
};
