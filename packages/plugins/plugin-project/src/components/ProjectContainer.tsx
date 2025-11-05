//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { type ItemProps, Project } from './Project';

export type ProjectContainerProps = { project: DataType.Project.Project; role: string };

export const ProjectContainer = ({ project }: ProjectContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const attendableId = fullyQualifiedId(project);
  const { hasAttention } = useAttention(attendableId);

  const handleColumnAdd = useCallback(
    () =>
      dispatch(
        createIntent(DeckAction.ChangeCompanion, {
          primary: attendableId,
          companion: `${attendableId}${ATTENDABLE_PATH_SEPARATOR}settings`,
        }),
      ),
    [dispatch, attendableId],
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
