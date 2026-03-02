//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useLayout } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { Filter, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { parseId, useQuery } from '@dxos/react-client/echo';
import { Clipboard, Input, Toolbar, Container } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export const DebugSpaceObjectsPanel = () => {
  const layout = useLayout();
  const client = useCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
  if (!space) {
    return null;
  }
  const database = space.db;

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
        <div className='h-full overflow-hidden grid grid-rows-[1fr_1fr] divide-y divide-separator'>
          <div className='overflow-auto'>
            <ObjectsTree db={database} onSelect={(entity) => setSelectedId(entity.id)} />
          </div>
          <div className='overflow-auto'>{selectedObject && <Json classNames='p-1' data={selectedObject} />}</div>
        </div>
      </Container.Main>
    </Clipboard.Provider>
  );
};
