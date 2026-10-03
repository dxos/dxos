//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import * as Hooks from '@dxos/plugin-assistant/Hooks';
import { type Space } from '@dxos/react-client/echo';
import { Gantt, type GanttAxis, type GanttLane, sessionTimelineToGantt } from '@dxos/react-ui-trace';
import * as Empty from '@dxos/react-ui/Empty';
import * as UiHooks from '@dxos/react-ui/Hooks';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

import { useProjectChats } from './useProjectChats.ts';

export type ProjectPipelineProps = {
  space: Space;
  project: Project.Project;
  /** The project's tasks, in the order the ledger shows them. */
  tasks: readonly Task.Task[];
  /** `time` fits the run to the pane; `unit` steps per event and scrolls to follow the newest. */
  axis?: GanttAxis;
  /** Called by the chart's axis toggle; the toggle is hidden without it. */
  onAxisChange?: (axis: GanttAxis) => void;
  /** Called with the task behind a task lane the reader picks. */
  onSelectTask?: (taskId: string) => void;
  /** Called with the chat behind a session lane the reader picks, and a task lane's with no `onSelectTask`. */
  onSelectChat?: (chat: Chat.Chat) => void;
};

/**
 * The project's assistant sessions and the tasks they work, on a time axis, drawn under the ledger:
 * every chat filed under the project is a session, its checklist the task lanes beneath it, redrawn
 * as trace events arrive.
 */
export const ProjectPipeline = ({
  space,
  project,
  tasks,
  axis = 'time',
  onAxisChange,
  onSelectTask,
  onSelectChat,
}: ProjectPipelineProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const chats = useProjectChats(space, project);
  const timeline = Hooks.useSessionTimeline(space, { chats, tasks });

  // The chart hands back its own lane shape, which carries no chat; the timeline's lane of the same
  // id does, so the pick is resolved through it.
  const handleLaneSelect = useCallback(
    (lane: GanttLane) => {
      const source = timeline.lanes.find((candidate) => candidate.id === lane.id);
      if (source?.taskId && onSelectTask) {
        onSelectTask(source.taskId);
        return;
      }
      const chat = source?.sessionId && chats.find((candidate) => candidate.id === source.sessionId);
      if (chat) {
        onSelectChat?.(chat);
      }
    },
    [timeline.lanes, chats, onSelectTask, onSelectChat],
  );

  if (timeline.lanes.length === 0) {
    return <Empty.Empty>{t('no-sessions.message')}</Empty.Empty>;
  }

  // The timeline speaks of sessions and tasks; the chart speaks of groups and lanes. One mapping at
  // the boundary keeps either vocabulary free to change without the other.
  const chart = sessionTimelineToGantt(timeline);

  // Named and totalled here rather than read off the ledger above: a ledger row is several lines
  // tall and a chart row is one, so nothing lines up between them.
  return (
    <Gantt.Root
      {...chart}
      range={timeline.range}
      axis={axis}
      onAxisChange={onAxisChange}
      now={Date.now()}
      onLaneSelect={onSelectTask || onSelectChat ? handleLaneSelect : undefined}
      classNames='p-1'
      data-testid='projectsPlugin.pipeline.chart'
    >
      <Gantt.Legend>
        <Gantt.AxisToggle />
      </Gantt.Legend>
      <Gantt.Meta />
      <Gantt.Chart />
    </Gantt.Root>
  );
};

ProjectPipeline.displayName = 'ProjectPipeline';
