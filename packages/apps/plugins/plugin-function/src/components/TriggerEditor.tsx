//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEventHandler, type FC, type PropsWithChildren, useEffect, useMemo } from 'react';

import { ChainPresets, chainPresets, PromptTemplate } from '@braneframe/plugin-chain';
import { type ChainPromptType } from '@braneframe/types';
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
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const functions = useQuery(space, Filter.schema(FunctionDef));
  const linkedFunction = useMemo(
    () => functions.find((fn) => fn.uri === trigger.function),
    [trigger.function, functions],
  );

  // Initialize meta.
  useEffect(() => {
    if (!trigger.meta) {
      const extension = metaExtensions[trigger.function];
      if (extension && extension.initialValue) {
        trigger.meta = extension.initialValue();
      }
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
        // TODO(burdon): Currently mail worker specific.
        trigger.spec = { type: 'websocket', url: '', init: { type: 'sync' } };
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
            <InputRow label='Enabled'>
              <Input.Switch checked={trigger.enabled} onCheckedChange={(checked) => (trigger.enabled = !!checked)} />
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
          </tbody>
          <tbody>{trigger.spec && <TriggerSpec spec={trigger.spec} />}</tbody>
          {trigger.function && (
            <tbody>
              <tr>
                <td />
                <td className='py-2'>
                  <div className='border-b separator-separator' />
                </td>
              </tr>
              <TriggerMeta trigger={trigger} />
            </tbody>
          )}
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

const TriggerSpecWebsocket = ({ spec }: { spec: WebsocketTrigger }) => {
  const handleChangeInit: ChangeEventHandler<HTMLInputElement> = (event) => {
    try {
      spec.init = JSON.parse(event.target.value);
    } catch (err) {
      // Ignore.
    }
  };

  return (
    <>
      <InputRow label='Endpoint'>
        <Input.TextInput
          value={spec.url}
          onChange={(event) => (spec.url = event.target.value)}
          placeholder='https://'
        />
      </InputRow>
      <InputRow label='Init'>
        <Input.TextInput
          value={JSON.stringify(spec.init)}
          onChange={handleChangeInit}
          placeholder='{ "type": "sync" }'
        />
      </InputRow>
    </>
  );
};

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
  if (!trigger || !trigger.function || !trigger.meta) {
    return null;
  }

  // TODO(burdon): Isn't triggered when function changes.
  const { component: Component } = metaExtensions[trigger.function] ?? {};
  if (Component) {
    return <Component meta={trigger.meta as any} />;
  }

  return null;
};

//
// Meta extensions
//

type MetaProps<T> = { meta: T };
type MetaExtension<T> = {
  initialValue?: () => T;
  component: FC<MetaProps<T>>;
};

const EmailWorkerMeta = ({ meta }: MetaProps<{ account?: string }>) => {
  return (
    <>
      <InputRow label='Account'>
        <Input.TextInput
          value={meta.account ?? ''}
          onChange={(event) => (meta.account = event.target.value)}
          placeholder='https://'
        />
      </InputRow>
    </>
  );
};

const ChainPromptMeta = ({ meta }: MetaProps<{ prompt?: ChainPromptType }>) => {
  return (
    <>
      <InputRow label='Presets'>
        <ChainPresets presets={chainPresets} onSelect={(preset) => (meta.prompt = preset.prompt())} />
      </InputRow>
      {meta.prompt && (
        <InputRow label='Prompt'>
          <PromptTemplate prompt={meta.prompt} commandEditable={false} />
        </InputRow>
      )}
    </>
  );
};

const metaExtensions: Record<string, MetaExtension<any>> = {
  'dxos.org/function/email-worker': {
    initialValue: () => ({ account: 'hello@dxos.network' }),
    component: EmailWorkerMeta,
  },

  'dxos.org/function/gpt': {
    component: ChainPromptMeta,
  },
};
