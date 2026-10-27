//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useObject } from '@dxos/echo-react';
import * as CardMasonry from '@dxos/plugin-space/CardMasonry';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Typography from '@dxos/react-ui/Typography';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  // The property, not the whole task: the query re-emits on membership only, so an artifact recorded
  // on the open task would otherwise not reach the grid until the reader selected away and back.
  const [artifacts] = useObject(task, 'artifacts');
  if (!artifacts || artifacts.length === 0) {
    return null;
  }

  return (
    <Layout.Container asChild gutter='inherit' gap='md'>
      <section data-testid='tasksPlugin.artifacts'>
        {/* Set as the form's field labels are, so the article's section headings read as one with them. */}
        <Typography.Text asChild tone='subtle' classNames='dx-label py-0'>
          <h2>{t('task-artifacts.label')}</h2>
        </Typography.Text>
        <CardMasonry.CardMasonry objects={artifacts} size='compact' inline />
      </section>
    </Layout.Container>
  );
};
