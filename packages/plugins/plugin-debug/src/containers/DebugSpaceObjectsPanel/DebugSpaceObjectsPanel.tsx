//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { type Database, Filter, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useQuery } from '@dxos/react-client/echo';
import { Clipboard, Container, Grid, Input, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export const DebugSpaceObjectsPanel = () => {
  const layout = useLayout();
  const client = useCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
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
      <Container.Main toolbar>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput disabled placeholder='Search...' />
          </Input.Root>
        </Toolbar.Root>
        <Grid rows={2} classNames='divide-y divide-separator'>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <ObjectsTree db={database} onSelect={(entity) => setSelectedId(entity.id)} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          {selectedObject && <Json classNames='p-1' data={selectedObject} />}
        </Grid>
      </Container.Main>
    </Clipboard.Provider>
  );
};
