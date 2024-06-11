//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEventHandler, type FC, type PropsWithChildren, useEffect, useMemo } from 'react';

import { ChainPresets, chainPresets, PromptTemplate } from '@braneframe/plugin-chain';
import { type ChainPromptType, DocumentType, FileType, MessageType, SketchType, StackType } from '@braneframe/types';
import { GameType } from '@dxos/chess-app/types';
import { create } from '@dxos/echo-schema';
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
import { distinctBy, safeParseInt } from '@dxos/util';

type TriggerId = string;

const stateInitialValues = {
  schemas: [
    // TODO(burdon): Get all schema from API.
    DocumentType,
    FileType,
    GameType,
    MessageType,
    SketchType,
    StackType,
  ] as any[],
  selectedSchema: {} as Record<TriggerId, any>,
};

const state = create<typeof stateInitialValues>(stateInitialValues);

const triggerTypes: FunctionTriggerType[] = ['subscription', 'timer', 'webhook', 'websocket'];

export const TriggerEditor = ({ space, trigger }: { space: Space; trigger: FunctionTrigger }) => {
  const query = useQuery(space, Filter.schema(FunctionDef));
  const fn = useMemo(() => query.find((fn) => fn.uri === trigger.function), [trigger.function, query]);

  useEffect(() => {
    void space.db.schema
      .listDynamic()
      .then((schemas) => {
        // TODO(Zan): We should solve double adding of stored schemas in the schema registry.
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
      const extension = metaExtensions[trigger.function];
      if (extension?.initialValue) {
        trigger.meta = extension.initialValue();
      }
    }
  }, [trigger.function, trigger.meta]);

  const handleSelectFunction = (value: string) => {
    const match = query.find((fn) => fn.uri === value);
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
        // TODO(burdon): The `init` property is currently mail worker specific.
        trigger.spec = { type: 'websocket', url: '', init: { type: 'sync' } };
        break;
      }
    }
  };

  return (
    <DensityProvider density='fine'>
      <div className='flex flex-col my-2'>
        <table className='is-full table-fixed'>
          <tbody>
            <InputRow label='Function'>
              <Select.Root value={fn?.uri} onValueChange={handleSelectFunction}>
                <Select.TriggerButton placeholder={'Select function'} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {query.map(({ id, uri }) => (
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
              <div className='px-2'>{fn && <p className='text-sm fg-description'>{fn.description}</p>}</div>
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
          <tbody>
            {trigger.spec && <TriggerSpec space={space} spec={trigger.spec} />}
            <InputRow label='Enabled'>
              {/* TODO(burdon): Hack to make the switch the same height as other controls. */}
              <div className='flex items-center h-8'>
                <Input.Switch checked={trigger.enabled} onCheckedChange={(checked) => (trigger.enabled = !!checked)} />
              </div>
            </InputRow>
          </tbody>
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
  [key in FunctionTriggerType]: React.FC<TriggerSpecProps<any>>;
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

//
// Trigger meta.
//

const TriggerMeta = ({ trigger }: { trigger: FunctionTrigger }) => {
  const meta = useMemo(() => (trigger?.function ? metaExtensions[trigger.function] : undefined), [trigger.function]);

  const Component = meta?.component;
  if (Component && trigger.meta) {
    return <Component meta={trigger.meta} />;
  }

  return null;
};

type MetaProps<T> = { meta: T } & { triggerId?: string };
type MetaExtension<T> = {
  initialValue?: () => T;
  component: FC<MetaProps<T>>;
};

// TODO(burdon): Possible to build form from function meta schema.

type ChessMeta = { level?: number };

const ChessMetaProps = ({ meta }: MetaProps<ChessMeta>) => {
  return (
    <>
      <InputRow label='Level'>
        <Input.TextInput
          type='number'
          value={meta.level ?? 1}
          onChange={(event) => (meta.level = safeParseInt(event.target.value))}
          placeholder='Engine strength.'
        />
      </InputRow>
    </>
  );
};

type EmailWorkerMeta = { account?: string };

const EmailWorkerMetaProps = ({ meta }: MetaProps<EmailWorkerMeta>) => {
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

type ChainPromptMeta = { model?: string; prompt?: ChainPromptType };

const ChainPromptMetaProps = ({ meta, triggerId }: MetaProps<ChainPromptMeta>) => {
  const schema = triggerId ? state.selectedSchema[triggerId] : undefined;
  return (
    <>
      <InputRow label='Model'>
        <Input.TextInput
          value={meta.model ?? ''}
          onChange={(event) => (meta.model = event.target.value)}
          placeholder='llama2'
        />
      </InputRow>
      <InputRow label='Presets'>
        <ChainPresets
          presets={chainPresets}
          onSelect={(preset) => {
            meta.prompt = preset.prompt();
          }}
        />
      </InputRow>
      {meta.prompt && (
        <InputRow label='Prompt'>
          <PromptTemplate prompt={meta.prompt} schema={schema} />
        </InputRow>
      )}
    </>
  );
};

type EmbeddingMeta = { model?: string; prompt?: ChainPromptType };

const EmbeddingMetaProps = ({ meta }: MetaProps<EmbeddingMeta>) => {
  return (
    <>
      <InputRow label='Model'>
        <Input.TextInput
          value={meta.model ?? ''}
          onChange={(event) => (meta.model = event.target.value)}
          placeholder='llama2'
        />
      </InputRow>
    </>
  );
};

const metaExtensions: Record<string, MetaExtension<any>> = {
  'dxos.org/function/chess': {
    initialValue: () => ({ level: 2 }),
    component: ChessMetaProps,
  } satisfies MetaExtension<ChessMeta>,

  'dxos.org/function/email-worker': {
    initialValue: () => ({ account: 'hello@dxos.network' }),
    component: EmailWorkerMetaProps,
  } satisfies MetaExtension<EmailWorkerMeta>,

  'dxos.org/function/gpt': {
    initialValue: () => ({ model: 'llama2' }),
    component: ChainPromptMetaProps,
  } satisfies MetaExtension<ChainPromptMeta>,

  'dxos.org/function/embedding': {
    initialValue: () => ({ model: 'llama2' }),
    component: EmbeddingMetaProps,
  } satisfies MetaExtension<EmbeddingMeta>,
};

//
// Utils.
//

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
