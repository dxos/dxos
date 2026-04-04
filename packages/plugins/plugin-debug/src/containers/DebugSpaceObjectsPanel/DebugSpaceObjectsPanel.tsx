//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { ObjectsTree } from '@dxos/devtools';
import { type Database, Filter, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { useActiveSpace } from '@dxos/plugin-space';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Grid, Input, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export const DebugSpaceObjectsPanel = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <DebugSpaceObjectsPanelMain database={space.db} />;
};

const DebugSpaceObjectsPanelMain = ({ database }: { database: Database.Database }) => {
  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);

  const [selectedObject] = useQuery(
    database,
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
                <ObjectsTree db={database} onSelect={(entity) => setSelectedId(entity.id)} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
            {selectedObject && <Json.Data classNames='p-1' data={selectedObject} />}
          </Grid>
        </Panel.Content>
      </Panel.Root>
    </Clipboard.Provider>
  );
};
