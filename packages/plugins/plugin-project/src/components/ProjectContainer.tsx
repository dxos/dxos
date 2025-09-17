//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { Project } from './Project';

export const ProjectContainer = ({ project }: { project: DataType.Project; role: string }) => {
  return (
    <StackItem.Content>
      <Project project={project} />
    </StackItem.Content>
  );
};
