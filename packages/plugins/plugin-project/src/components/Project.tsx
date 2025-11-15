//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type FC } from 'react';

import { type Obj } from '@dxos/echo';
import { Toolbar, type ToolbarRootProps, useTranslation } from '@dxos/react-ui';
import { Stack } from '@dxos/react-ui-stack';
import { type ProjectionModel } from '@dxos/schema';
import { type Project as ProjectType } from '@dxos/types';

import { meta } from '../meta';

import { ProjectColumn } from './ProjectColumn';

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
  project: ProjectType.Project;
};

const ProjectContent = ({ project }: ProjectContentProps) => {
  return (
    <Stack orientation='horizontal' size='contain' rail={false}>
      {project.columns.map((column) => {
        return <ProjectColumn key={column.view.dxn.toString()} column={column} />;
      })}
    </Stack>
  );
};

ProjectContent.displayName = 'Project.Content';

//
// Toolbar
//

export const ProjectToolbar = (props: ToolbarRootProps) => {
  const { t } = useTranslation(meta.id);
  const { onAddColumn } = useProject(ProjectToolbar.displayName);

  return (
    <Toolbar.Root {...props}>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add column label')} onClick={onAddColumn} />
    </Toolbar.Root>
  );
};

ProjectToolbar.displayName = 'Project.Toolbar';

//
// Project
//

export const Project = {
  Root: ProjectRoot,
  Content: ProjectContent,
  Toolbar: ProjectToolbar,
};

export { useProject };

export type { ItemProps, ProjectContextValue, ProjectRootProps };
