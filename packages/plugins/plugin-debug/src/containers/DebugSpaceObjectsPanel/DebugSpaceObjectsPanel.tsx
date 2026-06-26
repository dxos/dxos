//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { type Entity, Filter, Obj, Query } from '@dxos/echo';
import { type EntityId } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Grid, Input, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';

export type DebugSpaceObjectsPanelProps = AppSurface.SpaceArticleProps & {
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};

export const DebugSpaceObjectsPanel = ({ space, onOpen, canOpen }: DebugSpaceObjectsPanelProps) => {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [selectedObject] = useQuery(
    space.db,
    selectedId ? Query.select(Filter.id(selectedId)) : Query.select(Filter.nothing()),
  );

  return (
    <Clipboard.Provider>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput disabled placeholder='Search...' />
            </Input.Root>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Grid rows={2} classNames='divide-y divide-separator'>
            <ScrollArea.Root>
              <ScrollArea.Viewport>
                <ObjectsTree db={space.db} onSelect={(entity) => setSelectedId(entity.id)} onOpen={onOpen} canOpen={canOpen} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
            {selectedObject && <JsonHighlighter classNames='p-1' data={selectedObject} />}
          </Grid>
        </Panel.Content>
      </Panel.Root>
    </Clipboard.Provider>
  );
};
