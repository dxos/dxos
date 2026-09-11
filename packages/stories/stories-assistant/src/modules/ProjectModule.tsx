//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import * as Project from '@dxos/compute/Project';
import { Filter } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { AttendableContainer } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';

/** How long a space is given to produce a project before the column says it has none. */
const PROJECT_SETTLE_DELAY = 2_000;

export const ProjectModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return <Loading data={{ space: !!space }} />;
  }

  // Keyed on the space: switching templates restarts the wait rather than inheriting the last one.
  return <ProjectModuleContainer key={space.id} space={space} />;
};

/**
 * The project column: the real article surface for the project in the current template's space.
 * A template that seeds none (a CRM space, say) says so, rather than spinning forever — the chat
 * and trace columns still work against the data it did seed.
 */
const ProjectModuleContainer = ({ space }: { space: Space }) => {
  const projects = useQuery(space.db, Filter.type(Project.Project));
  const project = projects.at(-1);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), PROJECT_SETTLE_DELAY);
    return () => clearTimeout(timer);
  }, []);

  if (!project) {
    return settled ? (
      <div className='grid place-items-center p-2 text-sm text-description'>
        No project in {space.properties.name ?? space.id}.
      </div>
    ) : (
      <Loading data={{ project: !!project }} />
    );
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
