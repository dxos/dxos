//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Project } from '@dxos/compute';
import { Filter, type Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { Mailbox } from '@dxos/plugin-inbox';
import { ProjectOperation } from '@dxos/plugin-projects/types';
import { useSpaces } from '@dxos/react-client/echo';
import { Button, Panel, Toolbar } from '@dxos/react-ui';
import { Loading } from '@dxos/react-ui/testing';

export type ProjectModuleProps = {
  /** Project template to scaffold from; the story's subject mailbox is passed to `appliesTo`/`scaffold`. */
  templateId: string;
};

/**
 * Creates a project from a template and renders its real article surface.
 *
 * The button is the story's entry point rather than a seeded project, because scaffolding through
 * `ProjectOperation.Create` is what the story exercises — the template resolution, the owned-graph
 * cascade, and the article rendering that follows. Setup failures render in place instead of
 * rejecting unobserved.
 */
export const ProjectModule = ({ data }: { data: ProjectModuleProps }) => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const [project] = useQuery(space?.db, Filter.type(Project.Project));
  const { invokePromise } = useOperationInvoker();
  const [error, setError] = useState<string>();

  const handleCreate = useCallback(
    (subject: Obj.Unknown) => {
      if (!space) {
        return;
      }
      invokePromise(ProjectOperation.Create, { templateId: data.templateId, subject }, { spaceId: space.id }).catch(
        (cause: unknown) => setError(String(cause)),
      );
    },
    [space, data.templateId, invokePromise],
  );

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  if (error) {
    return (
      <Panel.Root>
        <Panel.Content>
          <div role='alert'>{error}</div>
        </Panel.Content>
      </Panel.Root>
    );
  }

  if (!project) {
    return (
      <Panel.Root>
        <Panel.Toolbar>
          <Toolbar.Root>
            <Button data-testid='projects.story.setup' onClick={() => handleCreate(mailbox)}>
              Set up project
            </Button>
          </Toolbar.Root>
        </Panel.Toolbar>
      </Panel.Root>
    );
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />;
};
