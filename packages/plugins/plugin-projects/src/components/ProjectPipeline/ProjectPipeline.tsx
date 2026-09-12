//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Chat from '@dxos/assistant/Chat';
import type * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSessionTimeline } from '@dxos/plugin-assistant/hooks';
import { type Space } from '@dxos/react-client/echo';
import { Flex, ScrollArea, useTranslation } from '@dxos/react-ui';
import { Gantt } from '@dxos/react-ui-components';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

export type ProjectPipelineProps = {
  space: Space;
  project: Project.Project;
  /** The project's tasks, in the order the ledger shows them. */
  tasks: readonly Task.Task[];
};

/**
 * The project's assistant sessions and the tasks they work, on a time axis: every chat filed under
 * the project is a session lane, its checklist the task lanes beneath it, redrawn as trace events
 * arrive.
 */
export const ProjectPipeline = ({ space, project, tasks }: ProjectPipelineProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Every chat in the space, narrowed by the parent walk: a project's chats are filed under it, and
  // the query re-emits when one is added — which is exactly when a session begins.
  const allChats = useQuery(space.db, Filter.type(Chat.Chat));
  const chats = useMemo(
    () => allChats.filter((chat) => Chat.peekProject(chat)?.id === project.id),
    [allChats, project.id],
  );
  const timeline = useSessionTimeline(space, { chats, tasks });

  if (timeline.lanes.length === 0) {
    return (
      <Flex justify='center' classNames='p-4 text-subdued'>
        {t('no-sessions.message')}
      </Flex>
    );
  }

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>
        <Gantt
          lanes={timeline.lanes}
          markers={timeline.markers}
          range={timeline.range}
          now={Date.now()}
          classNames='p-4'
        />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

ProjectPipeline.displayName = 'ProjectPipeline';
