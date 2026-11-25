//
// Copyright 2026 DXOS.org
//

import React, { memo, useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as ObjectCard from '@dxos/app-toolkit/ObjectCard';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useObject, useQuery, useResolveRef, useSpaces } from '@dxos/react-client/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

/** One artifact as a card: its icon and label, then whatever preview its type contributes. */
const ArtifactCard = memo(({ data }: { data: Obj.Unknown | undefined; index: number }) => {
  const [object] = useObject(data);
  const cardData = useMemo<AppSurface.ObjectCardData | undefined>(() => (data ? { subject: data } : undefined), [data]);
  if (!data || !object || !cardData) {
    return null;
  }

  return (
    <ObjectCard.Root data-testid='project-panel.artifact'>
      <ObjectCard.Header subject={object} lines={2}>
        {Obj.getLabel(object)}
      </ObjectCard.Header>
      <Surface.Surface type={AppSurface.CardContent} data={cardData} limit={1} />
    </ObjectCard.Root>
  );
});

ArtifactCard.displayName = 'ArtifactCard';

/**
 * The space's project beside the conversation: its task list on top, as the tasks plugin renders a task set, and a
 * mosaic of the documents the agents have written beneath it, each as a card that previews it.
 */
export const ProjectPanel = () => {
  const [space] = useSpaces();
  const db = space?.db;
  const [project] = useQuery(db, Filter.type(Project.Project));
  const taskSet = useResolveRef(project?.taskSet);
  const artifacts = useQuery(db, Filter.type(Markdown.Document));
  const [name] = useObject(project, 'name');

  return (
    // As wide as one chat column (`ChatPlane`'s `--chat-plane-width`), which is set on the plane and so out of reach here.
    <Panel.Root classNames='w-[min(32vw,40rem)] shrink-0 border-e border-separator' data-testid='project-panel'>
      <Panel.Header asChild>
        <Toolbar.Root>
          <Toolbar.Text classNames='truncate'>{name ?? 'Project'}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root classNames='dx-grow'>
          <ScrollArea.Viewport>
            <div className='flex flex-col gap-2 p-2'>
              {project && taskSet && (
                <div data-testid='project-panel.tasks'>
                  <Surface.Surface
                    type={AppSurface.Section}
                    data={{ subject: taskSet, attendableId: project.id, filter: false, editor: false }}
                    limit={1}
                  />
                </div>
              )}
              {artifacts.length > 0 && (
                // No `Masonry.Content`: its own scroll area would fight the panel's, which scrolls the whole column.
                <Masonry.Root Tile={ArtifactCard} centered={false}>
                  <Masonry.Viewport items={artifacts} getId={(object) => object.id} scroll={false} />
                </Masonry.Root>
              )}
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
