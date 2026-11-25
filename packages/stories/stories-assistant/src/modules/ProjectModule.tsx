//
// Copyright 2026 DXOS.org
//

import React, { memo, useEffect, useMemo, useState } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Space, useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import { Loading } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/** How long a space is given to produce a project before the column says it has none. */
const PROJECT_SETTLE_DELAY = 2_000;

export type ProjectModuleData = {
  /**
   * How the project is shown: the projects plugin's article (`article`, the default), or its task list above a mosaic
   * of the space's documents (`board`), which needs only the tasks and markdown plugins.
   */
  view?: 'article' | 'board';
};

export const ProjectModule = ({ data }: Surface.ComponentProps<ProjectModuleData>) => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  // Keyed on the space: switching templates restarts the wait rather than inheriting the last one.
  return <ProjectModuleContainer key={space.id} space={space} view={data?.view ?? 'article'} />;
};

/**
 * The project column: the real article surface for the project in the current template's space.
 * A template that seeds none (a CRM space, say) says so, rather than spinning forever — the chat
 * and trace columns still work against the data it did seed.
 */
const ProjectModuleContainer = ({ space, view }: { space: Space; view: NonNullable<ProjectModuleData['view']> }) => {
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const project = projects.at(-1);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), PROJECT_SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, []);

  if (!project) {
    return settled ? (
      <div className='grid place-items-center p-2 text-sm text-fg-muted'>
        No project in {space.properties.name ?? space.id}.
      </div>
    ) : (
      <Loading data={{ project: !!project }} />
    );
  }

  if (view === 'board') {
    return <ProjectBoard space={space} project={project} />;
  }

  // The article's toolbar is enabled only while its `attendableId` has attention, and `ModuleContainer`
  // makes each cell attendable under its *positional* id, so without this the toolbar stays disabled.
  // The id is the project's graph path, as the deck's plank uses in the app — the article hands it
  // to `LayoutOperation.Open` as a pivot and to `OpenObjectForm` as a target node. `contents` keeps
  // the attendable out of the layout, so the cell's height chain is unaffected.
  const attendableId = GraphPath.getObjectPathFromObject(project);

  return (
    <AttendableContainer id={attendableId} classNames='contents'>
      <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId }} limit={1} />
    </AttendableContainer>
  );
};

/** One document as a card: its icon and label, then whatever preview its type contributes. */
const DocumentCard = memo(({ data }: { data: Obj.Unknown | undefined; index: number }) => {
  const [object] = useObject(data);
  const cardData = useMemo<AppSurface.ObjectCardData | undefined>(() => (data ? { subject: data } : undefined), [data]);
  if (!data || !object || !cardData) {
    return null;
  }

  return (
    <ObjectCard.Root data-testid='project-module.document'>
      <ObjectCard.Header subject={object} lines={2}>
        {Obj.getLabel(object)}
      </ObjectCard.Header>
      <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />
    </ObjectCard.Root>
  );
});

DocumentCard.displayName = 'DocumentCard';

/**
 * The project's task list on top, as the tasks plugin renders a task set, and a mosaic of every document in the space
 * beneath it, so documents agents write show up whether or not they are filed under the project.
 */
const ProjectBoard = ({ space, project }: { space: Space; project: Project.Project }) => {
  const taskSet = useResolveRef(project.taskSet);
  const documents = useQuery(space.db, Filter.type(Markdown.Document));
  const [name] = useObject(project, 'name');

  return (
    <Panel.Root data-testid='project-module.board'>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Toolbar.Text classNames='truncate'>{name ?? 'Project'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root classNames='dx-grow'>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-2 p-2'>
              {taskSet && (
                <Surface.Surface
                  type={AppSurface.Section}
                  data={{ subject: taskSet, attendableId: project.id, filter: false, editor: false }}
                  limit={1}
                />
              )}
              {documents.length > 0 && (
                // No `Masonry.Content`: its own scroll area would fight the board's, which scrolls the whole column.
                <Masonry.Root Tile={DocumentCard} centered={false}>
                  <Masonry.Viewport items={documents} getId={(object) => object.id} scroll={false} />
                </Masonry.Root>
              )}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
