//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';

import { ResearchInputQueue } from '../testing';
import { type ModuleProps } from './types';

export const ResearchOutputModule = ({ space }: ModuleProps) => {
  const [researchInput] = useQuery(space.db, Filter.type(ResearchInputQueue));
  const feed = researchInput?.feed.target;
  const objects = useQuery(
    space.db,
    feed ? Query.select(Filter.everything()).from(feed) : Query.select(Filter.nothing()),
  );

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>Research Output</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical'>
          <ScrollArea.Viewport classNames='flex flex-col gap-4 p-4'>
            {objects.map((object) => (
              <Card.Root key={object.id}>
                <Surface.Surface type={AppSurface.CardContent} data={{ subject: object }} limit={1} />
              </Card.Root>
            ))}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
