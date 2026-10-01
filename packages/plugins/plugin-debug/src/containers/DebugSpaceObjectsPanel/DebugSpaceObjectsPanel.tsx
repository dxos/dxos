//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { type Entity, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type EntityId } from '@dxos/keys';
import { Grid } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Next } from '@dxos/react-ui/next';

export type DebugSpaceObjectsPanelProps = AppSurface.SpaceArticleProps & {
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};

export const DebugSpaceObjectsPanel = ({ space, onOpen, canOpen }: DebugSpaceObjectsPanelProps) => {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  // TODO(burdon): Guard.
  const [selectedObject] = useQuery(
    space.db,
    selectedId ? Query.select(Filter.id(selectedId)) : Query.select(Filter.nothing()),
  );

  return (
    <Next.Panel.Root>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Field.Root>
            <Next.Input disabled placeholder='Search...' />
          </Next.Field.Root>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <Grid rows={2} classNames='divide-y divide-subdued-separator'>
          <Next.ScrollArea.Root>
            <Next.ScrollArea.Viewport>
              <ObjectsTree
                db={space.db}
                onSelect={(entity) => setSelectedId(entity.id)}
                onOpen={onOpen}
                canOpen={canOpen}
              />
            </Next.ScrollArea.Viewport>
          </Next.ScrollArea.Root>
          {selectedObject && <JsonHighlighter classNames='p-1' data={selectedObject} />}
        </Grid>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

DebugSpaceObjectsPanel.displayName = 'DebugSpaceObjectsPanel';
