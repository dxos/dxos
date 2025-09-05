//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { FunctionTrigger, FunctionType, ScriptType } from '@dxos/functions';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, getSpace, useQuery } from '@dxos/react-client/echo';
import { Clipboard, IconButton, Input, Separator, useTranslation } from '@dxos/react-ui';
import { ControlItem, controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { AUTOMATION_PLUGIN } from '../../meta';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';

const grid = 'grid grid-cols-[40px_1fr_32px] min-bs-[2.5rem]';

export type AutomationPanelProps = {
  space: Space;
  object?: Obj.Any;
  initialTrigger?: FunctionTrigger;
  onDone?: () => void;
};

// TODO(burdon): Factor out common layout with ViewEditor.
export const AutomationPanel = ({ space, object, initialTrigger, onDone }: AutomationPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const client = useClient();
  const triggers = useQuery(space, Filter.type(FunctionTrigger));
  const functions = useQuery(space, Filter.type(FunctionType));
  const scripts = useQuery(space, Filter.type(ScriptType));

  const [trigger, setTrigger] = useState<FunctionTrigger | undefined>(initialTrigger);
  const [selected, setSelected] = useState<FunctionTrigger>();

  const handleSelect = (trigger: FunctionTrigger) => {
    setTrigger(trigger);
    setSelected(trigger);
  };

  const handleAdd = () => {
    setTrigger(Obj.make(FunctionTrigger, {}));
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
      space.db.add(Obj.make(FunctionTrigger, trigger));
    }

    setTrigger(undefined);
    setSelected(undefined);
    onDone?.();
  };

  const handleCancel: TriggerEditorProps['onCancel'] = () => {
    setTrigger(undefined);
    onDone?.();
  };

  if (trigger) {
    return (
      <ControlItem title={t('trigger editor title')}>
        <TriggerEditor space={space} trigger={trigger} onSave={handleSave} onCancel={handleCancel} />
      </ControlItem>
    );
  }

  return (
    <div className={controlItemClasses}>
      {triggers.length > 0 && (
        <List.Root<FunctionTrigger> items={triggers} isItem={Schema.is(FunctionTrigger)} getId={(field) => field.id}>
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
                        <Clipboard.IconButton
                          label={t(copyAction.translationKey)}
                          value={copyAction.contentProvider()}
                        />
                      )}
                    </div>

                    <List.ItemDeleteButton onClick={() => handleDelete(trigger)} />
                  </List.Item>
                );
              })}
            </div>
          )}
        </List.Root>
      )}
      {triggers.length > 0 && <Separator classNames='mlb-4' />}
      <IconButton icon='ph--plus--regular' label={t('new trigger label')} onClick={handleAdd} />
    </div>
  );
};

const getCopyAction = (client: Client, trigger: FunctionTrigger | undefined) => {
  if (trigger?.spec?.kind === 'email') {
    return { translationKey: 'trigger copy email', contentProvider: () => `${getSpace(trigger)!.id}@dxos.network` };
  }

  if (trigger?.spec?.kind === 'webhook') {
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

const getFunctionName = (scripts: ScriptType[], functions: FunctionType[], trigger: FunctionTrigger) => {
  // TODO(wittjosiah): Truncation should be done in the UI.
  //   Warning that the List component is currently a can of worms.
  const shortId = trigger.function && `${trigger.function.dxn.toString().slice(0, 16)}…`;
  const functionObject = functions.find((fn) => fn === trigger.function?.target);
  return functionObject?.name ?? shortId;
};
