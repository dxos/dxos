//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEventHandler, type FC, useEffect, useMemo, useState } from 'react';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import type { AnyObjectData } from '@dxos/echo-schema';
import { createSubscriptionTrigger } from '@dxos/functions';
import {
  FunctionTrigger,
  type FunctionTriggerType,
  type SubscriptionTrigger,
  type TimerTrigger,
  type TriggerSpec,
  type WebhookTrigger,
  type WebsocketTrigger,
} from '@dxos/functions/types';
import { invariant } from '@dxos/invariant';
import { DXN, LOCAL_SPACE_TAG } from '@dxos/keys';
import { log } from '@dxos/log';
import { ScriptType, FunctionType } from '@dxos/plugin-script/types';
import { useClient, type Config } from '@dxos/react-client';
import { Filter, getObjectCore, type Space, useQuery } from '@dxos/react-client/echo';
import { DensityProvider, Input, Select } from '@dxos/react-ui';
import { distinctBy } from '@dxos/util';

import { InputRow } from './Form';
import { getMeta, state } from './meta';

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const client = useClient();
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const script = useMemo(() => scripts.find((script) => script.id === trigger.function), [trigger.function, scripts]);

  // TODO(burdon): Factor out, creating context for plugin (runs outside of component).
  const [registry] = useState(new Map<string, Context>());
  const triggers = useQuery(space, Filter.schema(FunctionTrigger));
  useEffect(() => {
    log.info('triggers', { triggers });

    // Mark-and-sweep removing disabled triggers.
    setTimeout(async () => {
      const deprecated = new Set(Array.from(registry.keys()));
      for (const trigger of triggers) {
        if (trigger.enabled) {
          if (registry.has(trigger.id)) {
            deprecated.delete(trigger.id);
            break;
          }

          const ctx = new Context();
          registry.set(trigger.id, ctx);
          await createSubscriptionTrigger(ctx, space, trigger.spec as SubscriptionTrigger, async (data) => {
            try {
              const script = await space.crud.query({ id: trigger.function }).first();
              const { objects: functions } = await space.crud.query({ __typename: FunctionType.typename }).run();
              const func = functions.find((fn) => referenceEquals(fn.source, trigger.function)) as
                | AnyObjectData
                | undefined;
              const funcSlug = func?.__meta.keys.find((key) => key.source === USERFUNCTIONS_META_KEY)?.id;
              if (!funcSlug) {
                log.warn('function not deployed', { scriptId: script.id, name: script.name });
                return 404;
              }

              const funcUrl = getFunctionUrl(client.config, funcSlug, space.id);

              const triggerData: AnyObjectData = getObjectCore(trigger).toPlainObject();
              const body = {
                event: 'trigger',
                trigger: triggerData,
                data,
              };

              let retryCount = 0;
              while (retryCount < MAX_RETRIES) {
                log.info('exec', { funcUrl, funcSlug, body, retryCount });
                const response = await fetch(funcUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(body),
                });

                log.info('response', { status: response.status, body: await response.text() });
                if (response.status === 409) {
                  retryCount++;
                  await sleep(RETRY_DELAY);
                  continue;
                }

                return response.status;
              }

              return 500;
            } catch (err) {
              return 400;
            }
          });
        }
      }

      for (const id of deprecated) {
        const ctx = registry.get(id);
        if (ctx) {
          void ctx.dispose();
          registry.delete(id);
        }
      }
    });

    return () => {
      for (const ctx of registry.values()) {
        void ctx.dispose();
      }
    };
  }, [triggers]);

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

const USERFUNCTIONS_META_KEY = 'dxos.org/service/function';

const getFunctionUrl = (config: Config, slug: string, spaceId?: string) => {
  const baseUrl = new URL('functions/', config.values.runtime?.services?.edge?.url);

  // Leading slashes cause the URL to be treated as an absolute path.
  const relativeUrl = slug.replace(/^\//, '');
  const url = new URL(`./${relativeUrl}`, baseUrl.toString());
  spaceId && url.searchParams.set('spaceId', spaceId);
  url.protocol = 'https';
  return url.toString();
};

// TODO(dmaretskyi): Factor out.

type ReferenceLike = { '/': string } | string;

const referenceEquals = (a: ReferenceLike, b: ReferenceLike): boolean => {
  const aDXN = toDXN(a);
  const bDXN = toDXN(b);
  return aDXN.toString() === bDXN.toString();
};

const toDXN = (ref: ReferenceLike): DXN => {
  if (typeof ref === 'string') {
    if (ref.startsWith('dxn:')) {
      return DXN.parse(ref);
    } else {
      return new DXN(DXN.kind.ECHO, [LOCAL_SPACE_TAG, ref]);
    }
  }

  invariant(typeof ref['/'] === 'string');
  return DXN.parse(ref['/']);
};
