//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { Surface } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation } from '@dxos/plugin-deck/types';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { type Project as ProjectType } from '@dxos/types';

import { type ItemProps, Project } from './Project';

export type ProjectContainerProps = { project: ProjectType.Project; role: string };

export const ProjectContainer = ({ project }: ProjectContainerProps) => {
  const { invokePromise } = useOperationInvoker();
  const attendableId = Obj.getDXN(project).toString();
  const { hasAttention } = useAttention(attendableId);

  const handleColumnAdd = useCallback(
    () =>
      invokePromise(DeckOperation.ChangeCompanion, {
        primary: attendableId,
        companion: `${attendableId}${ATTENDABLE_PATH_SEPARATOR}settings`,
      }),
    [invokePromise, attendableId],
  );

  return (
    <StackItem.Content toolbar>
      <Project.Root Item={ProjectItem} onAddColumn={handleColumnAdd}>
        <Project.Toolbar disabled={!hasAttention} />
        <Project.Content project={project} />
      </Project.Root>
    </StackItem.Content>
  );
};

const ProjectItem = ({ item, projectionModel }: ItemProps) => {
  return (
    <Surface
      role='card--intrinsic'
      data={{
        subject: item,
        projection: projectionModel,
      }}
      limit={1}
    />
  );
};

export default ProjectContainer;
