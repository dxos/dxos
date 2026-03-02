//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Clipboard, Input, Layout, Toolbar } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { parseId, useQuery } from '@dxos/react-client/echo';
import { ObjectsTree } from '@dxos/devtools';
import { dbg } from '@dxos/log';
import type { ObjectId } from '@dxos/keys';
import { useLayout } from '@dxos/app-toolkit/ui';
import { useCapability } from '@dxos/app-framework/ui';
import { ClientCapabilities } from '@dxos/plugin-client';

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
      <Layout.Main toolbar classNames='grid grid-cols- grid-rows-[auto_1fr_1fr]'>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput disabled placeholder='Search...' />
          </Input.Root>
        </Toolbar.Root>
        <div className='min-h-100'>{selectedObject && <Json data={selectedObject} />}</div>
        <div className='border-t border-separator! min-h-100 overflow-auto'>
          <ObjectsTree db={database} onSelect={(entity) => setSelectedId(entity.id)} />
        </div>
      </Layout.Main>
    </Clipboard.Provider>
  );
};
