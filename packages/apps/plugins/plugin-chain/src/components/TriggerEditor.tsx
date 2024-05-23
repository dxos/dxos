//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { FunctionDef, FunctionTrigger } from '@dxos/functions/types';
import { type Space, create } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';

import { Section } from './PromptTemplate';

const functions: FunctionDef[] = [
  create(FunctionDef, {
    uri: 'dxos.org/function/email-worker',
    route: '/email-worker',
    handler: 'email-worker',
    description: 'Email Sync with Cloudflare Worker',
  }),
];

const triggers: FunctionTrigger[] = [
  create(FunctionTrigger, {
    function: 'dxos.org/function/email-worker',
    meta: { account: 'hello@dxos.network' },
    spec: {
      type: 'websocket',
      url: 'https://hub.dxos.network/api/mailbox/hello@dxos.network',
      init: { type: 'sync' },
    },
  }),
];

export const TriggerEditor = ({ space }: { space: Space | undefined }) => {
  const [selectedFunction, setFunction] = useState<string>();

  const handleSelectFunction = (value: string) => {
    setFunction(value);
  };

  const availableTriggers = useMemo(
    () => triggers.filter(({ function: fn }) => fn === selectedFunction),
    [selectedFunction],
  );

  const [selectedTrigger, setTrigger] = useState<FunctionTrigger>();

  const handleSelectTrigger = (value: string) => {
    const foundTrigger = triggers.find((t) => t.id === value);
    if (foundTrigger) {
      setTrigger(foundTrigger);
    }
  };

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col my-2 gap-4'>
      <DensityProvider density='fine'>
        <Section title='Functions'>
          <div role='none' className='p-2'>
            <Select.Root value={selectedFunction} onValueChange={handleSelectFunction}>
              <Select.TriggerButton placeholder={'Select function'} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {functions.map(({ id, uri, description }) => (
                      <Select.Option key={id} value={uri}>
                        {description}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
        </Section>
        {selectedFunction && (
          <Section title='Select a trigger'>
            <div role='none' className='flex flex-col align-start gap-2 p-2'>
              <Select.Root value={selectedTrigger?.id} onValueChange={handleSelectTrigger}>
                <Select.TriggerButton placeholder={'Select trigger'} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {availableTriggers.map(({ id, spec }) => (
                        <Select.Option key={id} value={id}>
                          {spec.type}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
              {selectedTrigger && <TriggerMeta trigger={selectedTrigger} />}
            </div>
          </Section>
        )}
      </DensityProvider>
    </div>
  );
};

const TriggerMeta = ({ trigger }: { trigger: FunctionTrigger }) => {
  switch (trigger.spec.type) {
    case 'websocket':
      // TODO(Zan): Wire these fields up.
      return (
        <div className='flex flex-col gap-2'>
          <Input.Root>
            <Input.Label>URL</Input.Label>
            <Input.TextInput value={trigger.spec.url} />
          </Input.Root>
        </div>
      );

    default:
      return null;
  }
};
