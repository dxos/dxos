//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';
import { CardMasonry } from '@dxos/plugin-space/components';
import { Next, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

export type TaskArtifactsProps = {
  task: Task.Task;
};

/**
 * What the task produced (`Task.artifacts`), as compact cards in the same grid as its attachments.
 * Absent rather than empty for a task with no artifacts.
 */
export const TaskArtifacts = ({ task }: TaskArtifactsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The property, not the whole task: the query re-emits on membership only, so an artifact recorded
  // on the open task would otherwise not reach the grid until the reader selected away and back.
  const [artifacts] = useObject(task, 'artifacts');
  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  return (
    <Next.Container asChild gutter='inherit' gap='md'>
      <section data-testid='tasksPlugin.artifacts'>
        <Next.Typography asChild tone='subdued'>
          <h2>{t('task-artifacts.label')}</h2>
        </Next.Typography>
        <CardMasonry objects={artifacts} size='compact' inline />
      </section>
    </Next.Container>
  );
};
