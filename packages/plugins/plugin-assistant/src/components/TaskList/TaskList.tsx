//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useObject } from '@dxos/echo-react';
import { Icon, Tag, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Outline } from '@dxos/types';

export type TaskListProps = ThemedClassName<{
  outline: Outline.Outline;
  /** Title of the item currently being worked by a delegated sub-agent, if any. */
  activeTitle?: string;
}>;

/**
 * Renders the conversation's working checklist (the outline's markdown `- [ ]` lines).
 * Durable promoted tasks keep richer state; the checklist is the at-a-glance view.
 */
// TODO(burdon): Re-correlate live sub-agent activity (trace lines) via a Process annotation
//  carrying the task ref — the pid no longer lives on the task.
export const TaskList = composable<HTMLDivElement, TaskListProps>(
  ({ outline, activeTitle, ...props }, forwardedRef) => {
    const [text] = useObject(outline.content);
    const items = useMemo(() => Outline.parseChecklist(text?.content ?? ''), [text?.content]);
    if (items.length === 0) {
      return null;
    }

    return (
      <Listbox.Root>
        <Listbox.Viewport {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
          <Listbox.Content aria-label='Tasks'>
            {items.map((item) => (
              <TaskListItem key={item.title} item={item} active={item.title === activeTitle} />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
    );
  },
);

type TaskListItemProps = {
  item: Outline.ChecklistItem;
  active?: boolean;
};

const TaskListItem = ({ item, active }: TaskListItemProps) => {
  return (
    <Listbox.Item id={item.title} classNames='py-0'>
      <div className='flex items-center gap-2 min-w-0'>
        <Icon
          icon={item.done ? 'ph--check--regular' : 'ph--circle--regular'}
          classNames={item.done ? 'text-success-text' : undefined}
          size={4}
        />
        <span className='sr-only'>{item.done ? 'done' : 'to do'}</span>
        <span className='truncate flex-1'>{item.title}</span>
        {active && <Tag hue='info'>working</Tag>}
      </div>
    </Listbox.Item>
  );
};
