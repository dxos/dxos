//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';
import {
  FunctionType,
  FunctionTrigger,
  FunctionTriggerSchema,
  TriggerKind,
  type FunctionTriggerType,
  ScriptType,
} from '@dxos/functions';
import { type Client, useClient } from '@dxos/react-client';
import { create, Filter, useQuery, type Space, type ReactiveObject, getSpace } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation, Button } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { AUTOMATION_PLUGIN } from '../../meta';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';

const grid = 'grid grid-cols-[40px_1fr_32px] min-bs-[2.5rem]';

export type AutomationPanelProps = {
  space: Space;
  object?: ReactiveObject<any>;
};

// TODO(burdon): Factor out common layout with ViewEditor.
export const AutomationPanel = ({ space, object }: AutomationPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const client = useClient();
  const triggers = useQuery(space, Filter.schema(FunctionTrigger));
  const functions = useQuery(space, Filter.schema(FunctionType));
  const scripts = useQuery(space, Filter.schema(ScriptType));

  const [trigger, setTrigger] = useState<FunctionTriggerType>();
  const [selected, setSelected] = useState<FunctionTrigger>();

  const handleSelect = (trigger: FunctionTrigger) => {
    const { id: _, ...values } = trigger;
    setTrigger(values);
    setSelected(trigger);
  };

  const handleAdd = () => {
    setTrigger(create(FunctionTriggerSchema, { meta: {} }));
    setSelected(undefined);
  };

  const handleDelete = (trigger: FunctionTrigger) => {
    space.db.remove(trigger);
    setTrigger(undefined);
    setSelected(undefined);
  };

  const handleSave: TriggerEditorProps['onSave'] = (trigger) => {
    if (selected) {
      Object.assign(selected, trigger);
    } else {
      space.db.add(create(FunctionTrigger, trigger));
    }

    setTrigger(undefined);
    setSelected(undefined);
  };

  const handleCancel: TriggerEditorProps['onCancel'] = () => {
    setTrigger(undefined);
  };

  return (
    <div className='flex flex-col w-full divide-y divide-separator overflow-y-auto'>
      <List.Root<FunctionTrigger> items={triggers} isItem={S.is(FunctionTrigger)} getId={(field) => field.id}>
        {({ items: triggers }) => (
          <div role='list' className='flex flex-col w-full'>
            {triggers?.map((trigger) => {
              const copyAction = getCopyAction(client, trigger);
              return (
                <List.Item<FunctionTrigger>
                  key={trigger.id}
                  item={trigger}
                  classNames={mx(grid, ghostHover, 'items-center', 'px-2')}
                >
                  <Input.Root>
                    <Input.Switch
                      checked={trigger.enabled}
                      onCheckedChange={(checked) => (trigger.enabled = checked)}
                    />
                  </Input.Root>

                  <div className={'flex'}>
                    <List.ItemTitle
                      classNames='px-1 cursor-pointer w-0 shrink truncate'
                      onClick={() => handleSelect(trigger)}
                    >
                      {getFunctionName(scripts, functions, trigger) ?? '∅'}
                    </List.ItemTitle>

                    {/* TODO: a better way to expose copy action */}
                    {copyAction && (
                      <Button onClick={() => navigator.clipboard.writeText(copyAction.contentProvider())}>
                        {t(copyAction.translationKey)}
                      </Button>
                    )}
                  </div>

                  <List.ItemDeleteButton onClick={() => handleDelete(trigger)} />
                </List.Item>
              );
            })}
          </div>
        )}
      </List.Root>

      {trigger && <TriggerEditor space={space} trigger={trigger} onSave={handleSave} onCancel={handleCancel} />}

      {!trigger && (
        <div className='flex p-2 justify-center'>
          <IconButton icon='ph--plus--regular' label={t('new trigger')} onClick={handleAdd} />
        </div>
      )}
    </div>
  );
};

const getCopyAction = (client: Client, trigger: FunctionTrigger | undefined) => {
  if (trigger?.spec?.type === TriggerKind.Email) {
    return { translationKey: 'trigger copy email', contentProvider: () => `${getSpace(trigger)!.id}@dxos.network` };
  }

  if (trigger?.spec?.type === TriggerKind.Webhook) {
    return { translationKey: 'trigger copy url', contentProvider: () => getWebhookUrl(client, trigger) };
  }

  return undefined;
};

const getWebhookUrl = (client: Client, trigger: FunctionTrigger) => {
  const spaceId = getSpace(trigger)!.id;
  const edgeUrl = new URL(client.config.values.runtime!.services!.edge!.url!);
  const isSecure = edgeUrl.protocol.startsWith('https') || edgeUrl.protocol.startsWith('wss');
  edgeUrl.protocol = isSecure ? 'https' : 'http';
  return new URL(`/webhook/${spaceId}:${trigger.id}`, edgeUrl).toString();
};

const getFunctionName = (scripts: ScriptType[], functions: FunctionType[], trigger: FunctionTriggerType) => {
  const shortId = trigger.function && `${trigger.function?.slice(0, 16)}…`;
  const functionObject = functions.find((fn) => fn.name === trigger.function);
  if (!functionObject) {
    return shortId;
  }
  return scripts.find((s) => functionObject.source?.target?.id === s.id)?.name ?? shortId;
};
