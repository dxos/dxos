//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { useObject } from '@dxos/react-client/echo';
import { Icon, Tag, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';

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
            <Row key={task.id} id={task.id} classNames='py-0'>
              <div className='flex items-center gap-2'>
                <Icon
                  icon={task.status === 'done' ? 'ph--check--regular' : 'ph--circle--regular'}
                  classNames={task.status === 'done' ? 'text-success-text' : undefined}
                  size={4}
                />
                <span className='sr-only'>
                  {task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in progress' : 'to do'}
                </span>
                <span className='truncate flex-1'>{task.title}</span>
                {task.status === 'in-progress' && <Tag palette='info'>pending</Tag>}
              </div>
            </Row>
          ))}
        </RowList.Content>
      </RowList.Viewport>
    </RowList.Root>
  );
});
