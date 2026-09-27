//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import { useSessionTimeline } from '@dxos/plugin-assistant/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Banner, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Gantt, type GanttAxis, type GanttLane, sessionTimelineToGantt } from '@dxos/react-ui-trace';
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
  /** Called with the chat behind a lane the reader picks — a session's, or a task's session. */
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
  onSelectChat,
}: ProjectPipelineProps) => {
  const { t } = useTranslation(meta.profile.key);
  const chats = useProjectChats(space, project);
  const timeline = useSessionTimeline(space, { chats, tasks });

  // The chart hands back its own lane shape, which carries no chat; the timeline's lane of the same
  // id does, so the pick is resolved through it.
  const handleLaneSelect = useCallback(
    (lane: GanttLane) => {
      const chatId = timeline.lanes.find((candidate) => candidate.id === lane.id)?.sessionId;
      const chat = chatId && chats.find((candidate) => candidate.id === chatId);
      if (chat) {
        onSelectChat?.(chat);
      }
    },
    [timeline.lanes, chats, onSelectChat],
  );

  if (timeline.lanes.length === 0) {
    return <Banner.Empty label={t('no-sessions.message')} />;
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
      onLaneSelect={onSelectChat && handleLaneSelect}
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
