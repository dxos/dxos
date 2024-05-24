//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { ChainPromptType } from '@braneframe/types';
import { FunctionDef, type FunctionTrigger, type FunctionTriggerType, TriggerSpec } from '@dxos/functions/types';
import { create } from '@dxos/react-client/echo';
import { Input, Select } from '@dxos/react-ui';

import { PromptTemplate, Section } from './PromptTemplate';

const functions: FunctionDef[] = [
  create(FunctionDef, {
    uri: 'dxos.org/function/email-worker',
    route: '/email-worker',
    handler: 'email-worker',
    description: 'Email Sync with Cloudflare Worker',
  }),

  create(FunctionDef, {
    uri: 'dxos.org/function/gpt',
    route: '/gpt',
    handler: 'gpt',
    description: 'GPT Chat',
  }),
];

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ trigger }: { trigger: FunctionTrigger }) => {
  const linkedFunction = useMemo(() => {
    return functions.find((fn) => fn.uri === trigger.function);
  }, [trigger]);

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

  useEffect(() => {
    console.log(JSON.stringify(trigger));
  }, [JSON.stringify(trigger)]);

  // Initialize prompt for GPT function.
  useEffect(() => {
    if (trigger.function === 'dxos.org/function/gpt') {
      const prompt = create(ChainPromptType, { template: 'Say hello in German.', inputs: [] });
      trigger.meta = { ...trigger.meta, prompt };
    }
  }, [trigger.function]);

  return (
    <div className='flex flex-col my-2 gap-4'>
      <Section title='Trigger Setup'>
        <div role='none' className='flex flex-col gap-2 p-2'>
          <div className='none flex flex-row gap-2'>
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

            <div role='none' className='flex align-start gap-2 p-2'>
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

const TriggerSpec = ({ spec }: { spec: TriggerSpec }) => {
  switch (spec.type) {
    case 'subscription':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>Filter</Input.Label>
            <p>TODO: Schema Filter Here</p>
          </Input.Root>
        </div>
      );

    case 'timer':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>Cron</Input.Label>
            <Input.TextInput
              value={spec.cron}
              onChange={(event) => {
                spec.cron = event.target.value;
              }}
            />
          </Input.Root>
        </div>
      );

    case 'webhook':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>Method</Input.Label>
            <Input.TextInput
              value={spec.method}
              onChange={(event) => {
                spec.method = event.target.value;
              }}
            />
          </Input.Root>
        </div>
      );

    case 'websocket':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>URL</Input.Label>
            <Input.TextInput
              value={spec.url}
              onChange={(event) => {
                spec.url = event.target.value;
              }}
            />
          </Input.Root>
        </div>
      );

    default:
      return null;
  }
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
