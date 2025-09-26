//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface } from '@dxos/app-framework';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { type ItemProps, Project } from './Project';

const ProjectItem = ({ item, projectionModel }: ItemProps) => {
  return <Surface role='card--intrinsic' data={{ subject: item, projection: projectionModel }} limit={1} />;
};

export const ProjectContainer = ({ project }: { project: DataType.Project; role: string }) => {
  const handleAddColumn = useCallback(() => console.log('[project container]', 'To implement: handle add column'), []);
  return (
    <StackItem.Content>
      <Project.Root Item={ProjectItem} onAddColumn={handleAddColumn}>
        <Project.Content project={project} />
      </Project.Root>
    </StackItem.Content>
  );
};

export default ProjectContainer;
