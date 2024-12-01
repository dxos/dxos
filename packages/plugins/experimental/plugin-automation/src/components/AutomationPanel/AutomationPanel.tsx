//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type ReactiveObject, S } from '@dxos/echo-schema';
import { FunctionTriggerSchema, FunctionTrigger, type FunctionTriggerType } from '@dxos/functions';
import { create, Filter, useQuery, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, useTranslation } from '@dxos/react-ui';
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
export const AutomationPanel = ({ space }: AutomationPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const triggers = useQuery(space, Filter.schema(FunctionTrigger));
  const [trigger, setTrigger] = useState<FunctionTriggerType>();
  const [selected, setSelected] = useState<FunctionTrigger>();

  const handleSelect = (trigger: FunctionTrigger) => {
    const { id: _, ...values } = trigger;
    setTrigger(values);
    setSelected(trigger);
  };

  const handleAdd = () => {
    setTrigger(create(FunctionTriggerSchema, {}));
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
            {triggers?.map((trigger) => (
              <List.Item<FunctionTrigger>
                key={trigger.id}
                item={trigger}
                classNames={mx(grid, ghostHover, 'items-center')}
              >
                <Input.Root>
                  <Input.Switch checked={trigger.enabled} onCheckedChange={(checked) => (trigger.enabled = checked)} />
                </Input.Root>
                <List.ItemTitle classNames='px-2 cursor-pointer' onClick={() => handleSelect(trigger)}>
                  {trigger.function}
                </List.ItemTitle>
                <List.ItemDeleteButton onClick={() => handleDelete(trigger)} />
              </List.Item>
            ))}
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
