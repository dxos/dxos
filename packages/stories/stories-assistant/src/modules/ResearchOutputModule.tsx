//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import { Filter, Query } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import * as Card from '@dxos/react-ui/Card';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ResearchInputQueue } from '../testing/schema.ts';

export const ResearchOutputModule = () => {
  const space = Hooks.useActiveSpace();
  if (!space) {
    return null;
  }

  return <ResearchOutputModuleContainer space={space} />;
};

const ResearchOutputModuleContainer = ({ space }: { space: Space }) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const objects = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>Research Output</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='flex flex-col gap-4 p-4'>
            {objects.map((object) => (
              <Card.Root key={object.id}>
                <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
              </Card.Root>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Body>
    </Panel.Root>
  );
};
