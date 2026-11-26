//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  outliner,
} from '@dxos/ui-editor';

export type TasksModuleData = {
  /**
   * Where the task list lives: the space's first markdown document, edited as an outline (`document`, the default),
   * or the task set of the space's project, as the tasks plugin renders it (`project`).
   */
  source?: 'document' | 'project';
};

/** The active space's task list. */
export const TasksModule = ({ data }: Surface.ComponentProps<TasksModuleData>) => {
  const space = ToolkitHooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return data.source === 'project' ? <ProjectTasks space={space} /> : <DocumentTasks space={space} />;
};

const DocumentTasks = ({ space }: { space: Space }) => {
  const themeMode = Hooks.useThemeMode();
  const [document] = useQuery(space.db, Filter.type(Markdown.Document));
  if (!document?.content.target) {
    return null;
  }

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root classNames='border-b border-separator-subtle'>
          <Toolbar.Text>{Obj.getLabel(document)}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <Editor.Root>
          <Editor.View
            id={document.id}
            classNames='h-full p-2 overflow-hidden'
            extensions={[
              createThemeExtensions({ themeMode }),
              createDataExtensions({ id: document.id, text: Doc.createAccessor(document.content.target, ['content']) }),
              createBasicExtensions({ readOnly: false }),
              createMarkdownExtensions(),
              outliner(),
            ]}
          />
        </Editor.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

const ProjectTasks = ({ space }: { space: Space }) => {
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const project = projects.at(-1);
  return project ? <ProjectTaskSet project={project} /> : null;
};

/** The project's task set, under the project's name. */
const ProjectTaskSet = ({ project }: { project: Project.Project }) => {
  const taskSet = useResolveRef(project.taskSet);
  const [name] = useObject(project, 'name');
  return (
    <Panel.Root data-testid='tasks-module.project'>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Toolbar.Text classNames='truncate'>{name ?? 'Project'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root classNames='dx-grow'>
          <ScrollArea.Viewport>
            {taskSet && (
              <Surface.Surface
                type={AppSurface.Section}
                data={{ subject: taskSet, attendableId: project.id, filter: false, editor: false }}
                limit={1}
              />
            )}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
