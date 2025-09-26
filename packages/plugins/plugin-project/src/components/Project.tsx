//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type FC } from 'react';

import { Obj } from '@dxos/echo';
import { Stack } from '@dxos/react-ui-stack';
import { DataType, type ProjectionModel } from '@dxos/schema';

import { AddColumn } from './AddColumn';
import { ViewColumn } from './ViewColumn';

type ItemProps = { item: Obj.Any; projectionModel?: ProjectionModel };

const itemNoOp = ({ item }: ItemProps) => <span>{item.id}</span>;

type ProjectContextValue = {
  Item: FC<ItemProps>;
  // TODO(wittjosiah): Support adding items.
  //   If the created item doesn't match the current query, it will not be visible.
  // onAddItem?: (schema: Schema.Schema.AnyNoContext) => void;
  onAddColumn?: () => void;
};
type ProjectRootProps = ProjectContextValue;

const PROJECT_NAME = 'ProjectRoot';

const [ProjectRoot, useProject] = createContext<ProjectContextValue>(PROJECT_NAME, {
  Item: itemNoOp,
});

type ProjectContentProps = {
  project: DataType.Project;
};

const ProjectContent = ({ project }: ProjectContentProps) => {
  // NOTE: This doesn’t encompass column types which the Project schema.
  const views = project.collections.map((ref) => ref.target).filter((object) => Obj.instanceOf(DataType.View, object));

  return (
    <Stack orientation='horizontal' size='contain' rail={false}>
      {views.map((view) => {
        return <ViewColumn key={view.id} view={view} />;
      })}
      <AddColumn />
    </Stack>
  );
};

export const Project = {
  Root: ProjectRoot,
  Content: ProjectContent,
};

export { useProject };

export type { ItemProps, ProjectContextValue, ProjectRootProps };
