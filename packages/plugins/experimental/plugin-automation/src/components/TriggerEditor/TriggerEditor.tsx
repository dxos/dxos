//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEventHandler, type FC, useEffect, useMemo } from 'react';

import {
  FunctionTriggerSchema,
  type FunctionTriggerType,
  type FunctionTrigger,
  type SubscriptionTrigger,
  type TimerTrigger,
  type TriggerType,
  type TriggerKind,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '@dxos/functions/types';
import { invariant } from '@dxos/invariant';
import { ScriptType } from '@dxos/plugin-script/types';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { Form, SelectInput } from '@dxos/react-ui-form';
import { distinctBy } from '@dxos/util';

import { InputRow } from './Form';
import { getFunctionMetaExtension, state } from './meta';
import { useLocalTriggerManager } from '../../hooks';
import { AUTOMATION_PLUGIN } from '../../meta';

const triggerTypes: TriggerKind[] = ['timer', 'webhook', 'websocket', 'subscription'];

export type TriggerEditorProps = {
  space: Space;
  trigger: FunctionTrigger;
};

export const TriggerEditor = ({ space, trigger }: TriggerEditorProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const script = useMemo(() => scripts.find((script) => script.id === trigger.function), [trigger.function, scripts]);
  useLocalTriggerManager(space);

  const triggerLabels: Record<TriggerKind, string> = {
    subscription: t('trigger type subscription'),
    timer: t('trigger type timer'),
    webhook: t('trigger type webhook'),
    websocket: t('trigger type websocket'),
  };

  useEffect(() => {
    void space.db.schemaRegistry
      .query()
      .then((schemas) => {
        // TODO(zan): We should solve double adding of stored schemas in the schema registry.
        state.schemas = distinctBy([...state.schemas, ...schemas], (schema) => schema.typename).sort((a, b) =>
          a.typename < b.typename ? -1 : 1,
        );
      })
      .catch(() => {});
  }, [space]);

  // Keen an enriched version of the schema in memory so we can share it with prompt editor.
  useEffect(() => {
    const spec = trigger.spec;
    invariant(spec);
    if (spec.type === 'subscription') {
      if (spec.filter) {
        const type = spec.filter.type;
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
      const extension = getFunctionMetaExtension(trigger, script);
      trigger.meta = extension?.initialValue?.();
    }
  }, [trigger.function, trigger.meta]);

  const handleSelectFunction = (value: string) => {
    const match = scripts.find((fn) => fn.id === value);
    if (match) {
      trigger.function = match.id;
    }
  };

  const handleSelectTriggerType = (triggerType: string) => {
    switch (triggerType as TriggerKind) {
      case 'subscription': {
        trigger.spec = { type: 'subscription', filter: {} };
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

  const TriggerMeta = getFunctionMetaExtension(trigger, script)?.component;

  const test = true;
  if (test) {
    const object: FunctionTriggerType = {
      spec: {
        // type: 'timer',
        type: 'subscription',
        // cron: '0 0 * * *'
        filter: { type: 'dxos.org/type/Event' },
      },
    };

    return (
      <Form<FunctionTriggerType>
        schema={FunctionTriggerSchema}
        values={object}
        filter={(props) => props.filter((p) => p.name !== 'meta')}
        Custom={{
          ['function' satisfies keyof FunctionTriggerType]: (props) => (
            <SelectInput<FunctionTriggerType>
              {...props}
              // TODO(burdon): Query for functions.
              options={[].map((value) => ({
                value,
                label: value,
              }))}
            />
          ),
          ['spec.type' as const]: (props) => (
            <SelectInput<FunctionTriggerType>
              {...props}
              options={['timer', 'subscription'].map((value) => ({
                value,
                label: value,
              }))}
            />
          ),
        }}
      />
    );
  }

  return (
    <div className='flex flex-col py-1'>
      <table className='is-full table-fixed'>
        <tbody>
          <InputRow label={t('function select label')}>
            <Select.Root value={script?.id} onValueChange={handleSelectFunction}>
              <Select.TriggerButton classNames='w-full' placeholder={t('function select placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {scripts.map(({ id, name }) => (
                      <Select.Option key={id} value={id}>
                        {name ?? id}
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
          <InputRow label={t('trigger select label')}>
            <Select.Root value={trigger.spec?.type} onValueChange={handleSelectTriggerType}>
              <Select.TriggerButton placeholder={t('trigger select placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {triggerTypes.map((trigger) => (
                      <Select.Option key={trigger} value={trigger}>
                        {triggerLabels[trigger]}
                      </Select.Option>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </InputRow>
        </tbody>
        <tbody>
          {trigger.spec && <TriggerType space={space} spec={trigger.spec} />}
          <InputRow label={t('function enabled')}>
            {/* TODO(burdon): Hack to make the switch the same height as other controls. */}
            <div className='flex items-center h-8'>
              <Input.Switch checked={trigger.enabled} onCheckedChange={(checked) => (trigger.enabled = !!checked)} />
            </div>
          </InputRow>
        </tbody>
        {TriggerMeta && trigger.meta && (
          <tbody>
            <tr>
              <td />
              <td className='py-2'>
                <div className='border-b border-separator' />
              </td>
            </tr>
            <TriggerMeta meta={trigger.meta} />
          </tbody>
        )}
      </table>
    </div>
  );
};

//
// Trigger specs
//

const TriggerSpecSubscription = ({ spec }: TriggerSpecProps<SubscriptionTrigger>) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  if (!spec.filter) {
    return null;
  }

  const handleValueChange = (typename: string) => {
    spec.filter = { type: typename };
  };

  return (
    <>
      <InputRow label={t('trigger filter')}>
        <Select.Root value={spec.filter?.type} onValueChange={handleValueChange}>
          <Select.TriggerButton classNames='w-full' placeholder={'Select type'} />
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

const TriggerSpecTimer = ({ spec }: TriggerSpecProps<TimerTrigger>) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <>
      <InputRow label={t('trigger cron')}>
        <Input.TextInput value={spec.cron} onChange={(event) => (spec.cron = event.target.value)} />
      </InputRow>
    </>
  );
};

const methods = ['GET', 'POST'];

const TriggerSpecWebhook = ({ spec }: TriggerSpecProps<WebhookTrigger>) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  return (
    <>
      <InputRow label={t('trigger method')}>
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
};

const TriggerSpecWebsocket = ({ spec }: TriggerSpecProps<WebsocketTrigger>) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);

  const handleChangeInit: ChangeEventHandler<HTMLInputElement> = (event) => {
    try {
      spec.init = JSON.parse(event.target.value);
    } catch (err) {
      // Ignore.
    }
  };

  return (
    <>
      <InputRow label={t('trigger method')}>
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

type TriggerSpecProps<T = TriggerType> = { space: Space; spec: T };

const triggerRenderers: {
  [key in TriggerKind]: FC<TriggerSpecProps<any>>;
} = {
  subscription: TriggerSpecSubscription,
  timer: TriggerSpecTimer,
  webhook: TriggerSpecWebhook,
  websocket: TriggerSpecWebsocket,
};

const TriggerType = ({ space, spec }: TriggerSpecProps) => {
  const Component = triggerRenderers[spec.type];
  return Component ? <Component space={space} spec={spec} /> : null;
};
