//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { FunctionDef, type FunctionTrigger, type FunctionTriggerType, TriggerSpec } from '@dxos/functions/types';
import { create } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';

import { Section } from './PromptTemplate';

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

export const TriggerEditor = () => {
  const [trigger, setTrigger] = useState<Partial<FunctionTrigger>>({});

  const linkedFunction = useMemo(() => {
    return functions.find((fn) => fn.uri === trigger.function);
  }, [trigger]);

  const handleSelectFunction = (value: string) => {
    const foundFunction = functions.find((fn) => fn.uri === value);

    if (foundFunction) {
      setTrigger({ ...trigger, function: foundFunction.uri });
    }
  };

  const handleSelectTriggerType = (triggerType: string) => {
    let spec: TriggerSpec;

    switch (triggerType as FunctionTriggerType) {
      case 'subscription': {
        spec = { type: 'subscription', filter: [] };
        break;
      }
      case 'timer': {
        spec = { type: 'timer', cron: '0 0 * * *' };
        break;
      }
      case 'webhook': {
        spec = { type: 'webhook', method: 'GET' };
        break;
      }
      case 'websocket': {
        spec = { type: 'websocket', url: '' };
        break;
      }
    }

    if (spec) {
      setTrigger({ ...trigger, spec });
    }
  };

  return (
    <div className='flex flex-col my-2 gap-4'>
      <DensityProvider density='fine'>
        <Section title='Trigger Setup'>
          <div role='none' className='p-2 flex flex-col gap-2'>
            <div className='none flex flex-row gap-2'>
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

              <div role='none' className='flex flex-col align-start gap-2 p-2'>
                <Select.Root value={trigger.spec?.type} onValueChange={handleSelectTriggerType}>
                  <Select.TriggerButton placeholder={'Select trigger'} />
                  <Select.Portal>
                    <Select.Content>
                      <Select.Viewport>
                        {triggerTypes.map((t) => (
                          <Select.Option key={t} value={t}>
                            {t}
                          </Select.Option>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>
            </div>

            {linkedFunction && <p className='text-sm fg-description'>{linkedFunction.description}</p>}
          </div>
        </Section>
        <Section title='parameters'>
          <div className='p-2'>
            {trigger.spec && (
              <TriggerSpec spec={trigger.spec} setSpec={(spec) => setTrigger((t) => ({ ...t, spec }))} />
            )}
          </div>
        </Section>
      </DensityProvider>
    </div>
  );
};

const TriggerSpec = ({ spec, setSpec }: { spec: TriggerSpec; setSpec: (spec: TriggerSpec) => void }) => {
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
            <Input.TextInput value={spec.cron} onChange={(e) => setSpec({ ...spec, cron: e.target.value })} />
          </Input.Root>
        </div>
      );

    case 'webhook':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>Method</Input.Label>
            <Input.TextInput value={spec.method} onChange={(e) => setSpec({ ...spec, method: e.target.value })} />
          </Input.Root>
        </div>
      );

    case 'websocket':
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>URL</Input.Label>
            <Input.TextInput value={spec.url} onChange={(e) => setSpec({ ...spec, url: e.target.value })} />
          </Input.Root>
        </div>
      );

    default:
      return null;
  }
};
