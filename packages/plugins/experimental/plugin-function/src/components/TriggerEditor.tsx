//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEventHandler, type FC, useEffect, useMemo } from 'react';

import {
  type FunctionTrigger,
  type FunctionTriggerType,
  type SubscriptionTrigger,
  type TimerTrigger,
  type TriggerSpec,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '@dxos/functions/types';
import { ScriptType } from '@dxos/plugin-script/types';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';
import { distinctBy } from '@dxos/util';

import { InputRow } from './Form';
import { getMeta, state } from './meta';

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const script = useMemo(() => scripts.find((script) => script.id === trigger.function), [trigger.function, scripts]);

  useEffect(() => {
    void space.db.schema
      .list()
      .then((schemas) => {
        // TODO(zan): We should solve double adding of stored schemas in the schema registry.
        state.schemas = distinctBy([...state.schemas, ...schemas], (schema) => schema.typename).sort((a, b) =>
          a.typename < b.typename ? -1 : 1,
        );
      })
      .catch();
  }, [space]);

  // Keen an enriched version of the schema in memory so we can share it with prompt editor.
  useEffect(() => {
    const spec = trigger.spec;
    if (spec.type === 'subscription') {
      if (spec.filter && spec.filter.length > 0) {
        const type = spec.filter[0].type;
        const foundSchema = state.schemas.find((schema) => schema.typename === type);
        if (foundSchema) {
          state.selectedSchema[trigger.id] = foundSchema;
        }
      }
    }
    // TODO(burdon): API issue.
  }, [JSON.stringify(trigger.spec), state.schemas]);

  useEffect(() => {
    if (!trigger.meta) {
      const extension = getMeta(trigger);
      if (extension?.initialValue) {
        trigger.meta = extension.initialValue();
      }
    }
  }, [trigger.function, trigger.meta]);

  const handleSelectFunction = (value: string) => {
    const match = scripts.find((fn) => fn.id === value);
    if (match) {
      trigger.function = match.id;
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
        // TODO(burdon): The `init` property is currently mail worker specific.
        trigger.spec = { type: 'websocket', url: '', init: { type: 'sync' } };
        break;
      }
    }
  };

  const TriggerMeta = trigger.meta?.component;

  return (
    <DensityProvider density='fine'>
      <div className='flex flex-col my-2'>
        <table className='is-full table-fixed'>
          <tbody>
            <InputRow label='Function'>
              <Select.Root value={script?.id} onValueChange={handleSelectFunction}>
                <Select.TriggerButton placeholder={'Select function'} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {scripts.map(({ id, name }) => (
                        <Select.Option key={id} value={id}>
                          {name ?? 'Unnamed'}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </InputRow>
            {script?.description?.length && (
              <InputRow>
                <div className='px-2'>
                  <p className='text-sm text-description'>{script?.description?.length}</p>
                </div>
              </InputRow>
            )}
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
          <tbody>
            {trigger.spec && <TriggerSpec space={space} spec={trigger.spec} />}
            <InputRow label='Enabled'>
              {/* TODO(burdon): Hack to make the switch the same height as other controls. */}
              <div className='flex items-center h-8'>
                <Input.Switch checked={trigger.enabled} onCheckedChange={(checked) => (trigger.enabled = !!checked)} />
              </div>
            </InputRow>
          </tbody>
          {TriggerMeta && (
            <tbody>
              <tr>
                <td />
                <td className='py-2'>
                  <div className='border-b border-separator' />
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

const TriggerSpecSubscription = ({ spec }: TriggerSpecProps<SubscriptionTrigger>) => {
  if (!spec.filter) {
    return null;
  }

  const handleSelectSchema = (typename: string) => {
    spec.filter = [{ type: typename }];
  };

  return (
    <>
      <InputRow label='Filter'>
        <Select.Root
          value={spec.filter.length > 0 ? spec.filter[0].type : undefined}
          onValueChange={handleSelectSchema}
        >
          <Select.TriggerButton placeholder={'Select type'} />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {state.schemas.map(({ typename }: any) => (
                  <Select.Option key={typename} value={typename}>
                    {typename}
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </InputRow>
    </>
  );
};

const TriggerSpecTimer = ({ spec }: TriggerSpecProps<TimerTrigger>) => (
  <>
    <InputRow label='Cron'>
      <Input.TextInput value={spec.cron} onChange={(event) => (spec.cron = event.target.value)} />
    </InputRow>
  </>
);

const methods = ['GET', 'POST'];

const TriggerSpecWebhook = ({ spec }: TriggerSpecProps<WebhookTrigger>) => (
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

const TriggerSpecWebsocket = ({ spec }: TriggerSpecProps<WebsocketTrigger>) => {
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
        <Input.TextInput value={JSON.stringify(spec.init)} onChange={handleChangeInit} placeholder='Initial message.' />
      </InputRow>
    </>
  );
};

//
// Trigger spec.
//

type TriggerSpecProps<T = TriggerSpec> = { space: Space; spec: T };

const triggerRenderers: {
  [key in FunctionTriggerType]: FC<TriggerSpecProps<any>>;
} = {
  subscription: TriggerSpecSubscription,
  timer: TriggerSpecTimer,
  webhook: TriggerSpecWebhook,
  websocket: TriggerSpecWebsocket,
};

const TriggerSpec = ({ space, spec }: TriggerSpecProps) => {
  const Component = triggerRenderers[spec.type];
  return Component ? <Component space={space} spec={spec} /> : null;
};
