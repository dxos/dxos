//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { ObjectsTree } from '@dxos/devtools';
import { Filter, Obj, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Grid, Panel, ScrollArea } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';

export type DebugObjectPanelProps = {
  object: Obj.Unknown;
};

export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  const db = Obj.getDatabase(object);

  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);
  const [selectedObject] = useQuery(
    db,
    Query.select(Filter.id(selectedId ?? object.id)).options({ deleted: 'include' }),
  );

  return (
    <Clipboard.Provider>
      <Panel.Root>
        <Panel.Content asChild>
          <Grid rows={db ? 2 : 1} classNames='divide-y divide-separator'>
            {db && (
              <ScrollArea.Root>
                <ScrollArea.Viewport>
                  <ObjectsTree db={db} root={object} onSelect={(entity) => setSelectedId(entity.id)} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
            <Json data={selectedObject} />
          </Grid>
        </Panel.Content>
      </Panel.Root>
    </Clipboard.Provider>
  );
};
