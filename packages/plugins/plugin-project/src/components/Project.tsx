//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { Stack } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { ViewCollectionColumn } from './ViewCollectionColumn';

export type ProjectProps = { project: DataType.Project };

export const Project = ({ project }: ProjectProps) => {
  // Note of course that this doesn’t encompass column types which the Project schema
  const views = project.collections.map((ref) => ref.target).filter((object) => Obj.instanceOf(DataType.View, object));

  return (
    <Stack orientation='horizontal' size='contain' rail={false}>
      {views.map((view) => {
        return <ViewCollectionColumn key={view.id} view={view} />;
      })}
    </Stack>
  );
};
