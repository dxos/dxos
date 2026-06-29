//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { type Process, type Trace } from '@dxos/compute';
import { useObject } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { Icon, Tag, type ThemedClassName } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { TextCrawl } from '@dxos/react-ui-components';
import { Listbox } from '@dxos/react-ui-list';

import { collectProcessActivityLines, deriveInFlightActivityLine } from '#execution-graph';
import { isTerminalActivityLine, useProcessEphemeralStatus } from '#hooks';

export type TaskListProps = ThemedClassName<{
  plan: Plan.Plan;
  space?: Space;
  /**
   * Supervisor conversation feed id; trace messages without a conversation id still match by pid.
   */
  conversationId?: string;
  traceMessages?: readonly Trace.Message[];
}>;

export const TaskList = composable<HTMLDivElement, TaskListProps>(
  ({ plan, space, conversationId, traceMessages, ...props }, forwardedRef) => {
    const [snapshot] = useObject(plan);
    const tasks = snapshot?.tasks ?? [];

    return (
      <Listbox.Root>
        <Listbox.Viewport {...composableProps(props, { classNames: 'dx-container' })} ref={forwardedRef}>
          <Listbox.Content aria-label='Tasks'>
            {tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                space={space}
                traceMessages={traceMessages}
                conversationId={conversationId}
              />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
    );
  },
);

type TaskListItemProps = {
  task: Plan.Task;
  space?: Space;
  traceMessages?: readonly Trace.Message[];
  conversationId?: string;
};

const TaskListItem = ({ task, space, traceMessages, conversationId }: TaskListItemProps) => {
  const durableLines = useMemo(() => {
    if (!task.agentPid || !traceMessages?.length) {
      return [];
    }
    const lines = collectProcessActivityLines(traceMessages, String(task.agentPid), { conversationId });
    if (task.status !== 'in-progress') {
      return lines;
    }
    return lines.filter((line) => !isTerminalActivityLine(line));
  }, [task.agentPid, task.status, traceMessages, conversationId]);

  const ephemeralLine = useProcessEphemeralStatus(
    task.delegated === true && task.status === 'in-progress' ? task.agentPid : undefined,
    space,
  );

  const inFlightLine = useMemo(() => {
    if (ephemeralLine || task.status !== 'in-progress' || !task.agentPid || !traceMessages?.length) {
      return undefined;
    }
    return deriveInFlightActivityLine(traceMessages, String(task.agentPid), { conversationId });
  }, [ephemeralLine, task.status, task.agentPid, traceMessages, conversationId]);

  const activityLines = useMemo(() => {
    if (ephemeralLine) {
      return [ephemeralLine];
    }
    if (inFlightLine) {
      return [inFlightLine];
    }
    return durableLines;
  }, [durableLines, ephemeralLine, inFlightLine]);

  const agentPid = task.agentPid;
  const showActivity = task.delegated === true && agentPid != null && activityLines.length > 0;

  return (
    <Listbox.Item id={task.id} classNames='py-0'>
      <div className='flex flex-col gap-0.5 min-w-0'>
        <div className='flex items-center gap-2 min-w-0'>
          <Icon
            icon={task.status === 'done' ? 'ph--check--regular' : 'ph--circle--regular'}
            classNames={task.status === 'done' ? 'text-success-text' : undefined}
            size={4}
          />
          <span className='sr-only'>
            {task.status === 'done' ? 'done' : task.status === 'in-progress' ? 'in progress' : 'to do'}
          </span>
          <span className='truncate flex-1'>{task.title}</span>
          {task.status === 'in-progress' && <Tag hue='info'>pending</Tag>}
          {task.agentPid && <Tag hue='info'>{Plan.formatAgentPidTag(task.agentPid)}</Tag>}
        </div>
        {showActivity && agentPid != null && <DelegatedTaskActivity agentPid={agentPid} lines={activityLines} />}
      </div>
    </Listbox.Item>
  );
};

type DelegatedTaskActivityProps = {
  agentPid: Process.ID;
  lines: string[];
};

const DelegatedTaskActivity = ({ agentPid, lines }: DelegatedTaskActivityProps) => {
  return (
    <div className='flex items-center gap-2 ps-6 min-w-0 text-placeholder'>
      <Icon icon='ph--brain--regular' size={3} classNames='shrink-0 opacity-70' />
      <TextCrawl
        key={`${String(agentPid)}:${lines.length}:${lines[lines.length - 1]}`}
        lines={lines}
        autoAdvance
        greedy
        size='sm'
        classNames='text-xs text-subdued min-w-0 flex-1'
      />
    </div>
  );
};
