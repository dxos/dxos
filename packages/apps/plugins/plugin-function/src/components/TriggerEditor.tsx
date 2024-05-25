//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useMemo } from 'react';

import { PromptTemplate } from '@braneframe/plugin-chain';
import { ChainPromptType } from '@braneframe/types';
import {
  FunctionDef,
  type FunctionTrigger,
  type FunctionTriggerType,
  type SubscriptionTrigger,
  type TimerTrigger,
  type TriggerSpec,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '@dxos/functions/types';
import { create, Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const functions = useQuery(space, Filter.schema(FunctionDef));
  const linkedFunction = useMemo(
    () => functions.find((fn) => fn.uri === trigger.function),
    [trigger.function, functions],
  );

  // Initialize prompt for GPT function.
  useEffect(() => {
    if (trigger.function === 'dxos.org/function/gpt') {
      // TODO(Zan): Change the default prompt (see plugin-chain presets).
      const prompt = create(ChainPromptType, { template: 'Translate the message into {language}.', inputs: [] });
      trigger.meta = { ...trigger.meta, prompt };
    }
  }, [trigger.function]);

  const handleSelectFunction = (value: string) => {
    const match = functions.find((fn) => fn.uri === value);
    if (match) {
      trigger.function = match.uri;
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

  return (
    <DensityProvider density='fine'>
      <div className='flex flex-col my-2'>
        <table className='w-full table-fixed'>
          <tbody>
            <InputRow label='Function'>
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
            </InputRow>
            <InputRow>
              <div className='p-2 pb-4'>
                {linkedFunction && <p className='text-sm fg-description'>{linkedFunction.description}</p>}
              </div>
            </InputRow>
            <InputRow label='Type'>
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
            </InputRow>
            {trigger.spec && <TriggerSpec spec={trigger.spec} />}
            {trigger.function && (
              <InputRow label='Meta'>
                <TriggerMeta trigger={trigger} />
              </InputRow>
            )}
          </tbody>
        </table>
      </div>
    </DensityProvider>
  );
};

//
// Trigger specs
//

// TODO(burdon): Type selector.
const TriggerSpecSubscription = ({ spec }: { spec: SubscriptionTrigger }) => (
  <>
    <InputRow label='Filter'>
      <Select.Root>
        <Select.TriggerButton placeholder={'Select type'} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport></Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </InputRow>
  </>
);

const TriggerSpecTimer = ({ spec }: { spec: TimerTrigger }) => (
  <>
    <InputRow label='Cron'>
      <Input.TextInput value={spec.cron} onChange={(event) => (spec.cron = event.target.value)} />
    </InputRow>
  </>
);

const methods = ['GET', 'POST'];

const TriggerSpecWebhook = ({ spec }: { spec: WebhookTrigger }) => (
  <>
    <InputRow label='Method'>
      <Select.Root value={spec.method} onValueChange={(value) => (spec.method = value)}>
        <Select.TriggerButton placeholder={'type'} />
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {methods.map((method) => (
                <Select.Option key={method} value={method}>
                  {method}
                </Select.Option>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </InputRow>
  </>
);

const TriggerSpecWebsocket = ({ spec }: { spec: WebsocketTrigger }) => (
  <>
    <InputRow label='Endpoint'>
      <Input.TextInput value={spec.url} onChange={(event) => (spec.url = event.target.value)} placeholder='https://' />
    </InputRow>
  </>
);

// TODO(burdon): Generalize and reuse forms in other plugins (extract to react-ui-form?)
const InputRow = ({ label, children }: PropsWithChildren<{ label?: string }>) => (
  <Input.Root>
    <tr>
      <td className='w-[100px] px-2 text-right align-top pt-3'>
        <Input.Label classNames='text-xs'>{label}</Input.Label>
      </td>
      <td className='p-1'>{children}</td>
    </tr>
  </Input.Root>
);

//
// Meta
//

const triggerRenderers: {
  [key in FunctionTriggerType]: React.ComponentType<{ spec: any }>;
} = {
  subscription: TriggerSpecSubscription,
  timer: TriggerSpecTimer,
  webhook: TriggerSpecWebhook,
  websocket: TriggerSpecWebsocket,
};

const TriggerSpec = ({ spec }: { spec: TriggerSpec }) => {
  const Component = triggerRenderers[spec.type];
  return Component ? <Component spec={spec} /> : null;
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

    return <PromptTemplate prompt={meta.prompt} commandEditable={false} />;
  }

  return null;
};
