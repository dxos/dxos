//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';
import { Flex, useTranslation } from '@dxos/react-ui';
import { type Task } from '@dxos/types';

import { meta } from '#meta';

export type TaskArtifactsProps = {
  task: Task.Task;
  /** The plank the grid renders in, so a card's actions resolve against the right node. */
  attendableId?: string;
};

/**
 * The objects a task produced (`Task.artifacts`), laid out with the same `CardMasonry` grid a
 * project's artifacts and a record's related objects use. Renders nothing when empty.
 */
export const TaskArtifacts = ({ task, attendableId }: TaskArtifactsProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [refs] = useObject(task, 'artifacts');
  if (!refs || refs.length === 0) {
    return null;
  }

  return (
    <Flex column gap='sm' classNames='p-2' data-testid='tasksPlugin.artifacts'>
      <h2 className='text-sm text-subdued'>{t('task-artifacts.label')}</h2>
      <Surface.Surface type={AppSurface.CardMasonry} data={{ objects: refs, attendableId }} limit={1} />
    </Flex>
  );
};
