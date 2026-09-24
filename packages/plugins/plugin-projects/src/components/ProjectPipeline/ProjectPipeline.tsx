//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import { useSessionTimeline } from '@dxos/plugin-assistant/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Flex, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Gantt, type GanttLane } from '@dxos/react-ui-trace';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

import { useProjectChats } from './useProjectChats.ts';

export type ProjectPipelineProps = {
  space: Space;
  project: Project.Project;
  /** The project's tasks, in the order the ledger shows them. */
  tasks: readonly Task.Task[];
  /** Called with the chat behind a lane the reader picks — a session's, or a task's session. */
  onSelectChat?: (chat: Chat.Chat) => void;
};

/**
 * The project's assistant sessions and the tasks they work, on a time axis, drawn under the ledger:
 * every chat filed under the project is a session, its checklist the task lanes beneath it, redrawn
 * as trace events arrive.
 */
export const ProjectPipeline = ({ space, project, tasks, onSelectChat }: ProjectPipelineProps) => {
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
    return (
      <Flex justify='center' classNames='p-4 text-subdued'>
        {t('no-sessions.message')}
      </Flex>
    );
  }

  // Named and totalled here rather than read off the ledger above: a ledger row is several lines
  // tall and a chart row is one, so nothing lines up between them.
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <Gantt.Root
          lanes={timeline.lanes}
          markers={timeline.markers}
          range={timeline.range}
          now={Date.now()}
          onLaneSelect={onSelectChat && handleLaneSelect}
          classNames='p-2'
          data-testid='projectsPlugin.pipeline.chart'
        >
          <Gantt.Legend />
          <Gantt.Chart />
          <Gantt.Meta />
        </Gantt.Root>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

ProjectPipeline.displayName = 'ProjectPipeline';
