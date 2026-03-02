//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Filter, Obj, Query } from '@dxos/echo';
import { Clipboard, Input, Layout, Toolbar } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { useQuery } from '@dxos/react-client/echo';
import { ObjectsTree } from '@dxos/devtools';
import { dbg } from '@dxos/log';
import type { ObjectId } from '@dxos/keys';
import { mx } from '@dxos/ui-theme';

export type DebugObjectPanelProps = {
  object: Obj.Unknown;
};

export const DebugObjectPanel = ({ object }: DebugObjectPanelProps) => {
  const db = Obj.getDatabase(object);
  const dxn = Obj.getDXN(object)?.toString() ?? '';

  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);
  const [selectedObject] = useQuery(
    db,
    Query.select(Filter.id(selectedId ?? object.id)).options({ deleted: 'include' }),
  );

  return (
    <Clipboard.Provider>
      <Layout.Main>
        <div className={mx('grid h-full overflow-hidden divide-y divide-separator grid-rows-[1fr_1fr]')}>
          {db && (
            <div>
              <ObjectsTree db={db} root={object} onSelect={(entity) => setSelectedId(entity.id)} />
            </div>
          )}
          <Json data={selectedObject} />
        </div>
      </Layout.Main>
    </Clipboard.Provider>
  );
};
