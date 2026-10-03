//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Project from '@dxos/compute/Project';
import { Filter, type Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import * as ProjectOperation from '@dxos/plugin-projects/ProjectOperation';
import { useSpaces } from '@dxos/react-client/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import { Loading } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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
  const { invokePromise } = Hooks.useOperationInvoker();
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
        <Panel.Body>
          <div role='alert'>{error}</div>
        </Panel.Body>
      </Panel.Root>
    );
  }

  if (!project) {
    return (
      <Panel.Root>
        <Panel.Header>
          <Toolbar.Root>
            <Button.Button data-testid='projects.story.setup' onClick={() => handleCreate(mailbox)}>
              Set up project
            </Button.Button>
          </Toolbar.Root>
        </Panel.Header>
      </Panel.Root>
    );
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />;
};
