//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';

export const ProjectModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  return <ProjectModuleContainer space={space} />;
};

/**
 * The project column: the real article surface for the project the current space template created.
 * A template that seeds no project (a CRM space, say) leaves this waiting — the chat and trace
 * columns still work against the data it did seed.
 */
const ProjectModuleContainer = ({ space }: { space: Space }) => {
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const project = projects.at(-1);
  if (!project) {
    return <Loading data={{ project: !!project }} />;
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: project, attendableId: project.id }} limit={1} />;
};
