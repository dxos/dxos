//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { ObjectsTree } from '@dxos/devtools';
import { type Entity, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type EntityId } from '@dxos/keys';
import { Grid, Icon, Input, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export type DebugSpaceObjectsPanelProps = AppSurface.SpaceArticleProps & {
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};

export const DebugSpaceObjectsPanel = ({ space, onOpen, canOpen }: DebugSpaceObjectsPanelProps) => {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [filter, setFilter] = useState('');
  // TODO(burdon): Guard.
  const [selectedObject] = useQuery(
    space.db,
    selectedId ? Query.select(Filter.id(selectedId)) : Query.select(Filter.nothing()),
  );

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Input
            placeholder='Search...'
            aria-label='Search'
            noAutoFill
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            end={<Icon icon='ph--magnifying-glass--regular' />}
          />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Grid rows={2} classNames='divide-y divide-separator-subtle'>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <ObjectsTree
                db={space.db}
                filter={filter}
                onSelect={(entity) => setSelectedId(entity.id)}
                onOpen={onOpen}
                canOpen={canOpen}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          {selectedObject && <JsonHighlighter classNames='p-1' data={selectedObject} />}
        </Grid>
      </Panel.Body>
    </Panel.Root>
  );
};

DebugSpaceObjectsPanel.displayName = 'DebugSpaceObjectsPanel';
