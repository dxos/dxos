//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type FC } from 'react';

import { Obj } from '@dxos/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { Stack } from '@dxos/react-ui-stack';
import { DataType, type ProjectionModel } from '@dxos/schema';

import { meta } from '../meta';

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

//
// Root
//

type ProjectRootProps = ProjectContextValue;

const PROJECT_ROOT = 'Project.Root';

const [ProjectRoot, useProject] = createContext<ProjectContextValue>(PROJECT_ROOT, {
  Item: itemNoOp,
});

ProjectRoot.displayName = PROJECT_ROOT;

//
// Content
//

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
    </Stack>
  );
};

ProjectContent.displayName = 'Project.Content';

//
// Menu
//

export const ProjectMenu = () => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = useProject(ProjectMenu.displayName);

  return (
    <Toolbar.Root>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add column label')} onClick={onAddColumn} />
    </Toolbar.Root>
  );
};

ProjectMenu.displayName = 'Project.Menu';

//
// Project
//

export const Project = {
  Root: ProjectRoot,
  Content: ProjectContent,
  Menu: ProjectMenu,
};

export { useProject };

export type { ItemProps, ProjectContextValue, ProjectRootProps };
