//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { useObject } from '@dxos/react-client/echo';
import { Input, Tag, type ThemedClassName } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';
import { composable, composableProps } from '@dxos/ui-theme';

export type TaskListProps = ThemedClassName<{
  plan: Plan.Plan;
}>;

export const TaskList = composable<HTMLDivElement, TaskListProps>(({ plan, ...props }, forwardedRef) => {
  const [snapshot] = useObject(plan);
  const tasks = snapshot?.tasks ?? [];

  return (
    <RowList.Root>
      <RowList.Viewport {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
        <RowList.Content aria-label='Tasks'>
          {tasks.map((task) => (
            <Row key={task.id} id={task.id} classNames='py-1'>
              <Input.Root>
                <div className='flex items-center gap-2'>
                  <Input.Checkbox checked={task.status === 'done'} disabled />
                  <Input.Label classNames='truncate flex-1'>{task.title}</Input.Label>
                  {task.status === 'in-progress' && <Tag palette='warning'>pending</Tag>}
                </div>
              </Input.Root>
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
});
