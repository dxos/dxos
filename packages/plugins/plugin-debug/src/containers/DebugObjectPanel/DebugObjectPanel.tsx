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

export type DebugObjectPanelProps = {
  object: Obj.Unknown;
};

// TODO(burdon): Get schema and traverse references.
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
      <Layout.Main toolbar classNames='grid grid-cols- grid-rows-[auto_1fr_1fr]'>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput disabled value={dxn} />
            <Clipboard.IconButton value={dxn} />
          </Input.Root>
        </Toolbar.Root>
        <Json data={selectedObject} />
        <div className='border-t border-separator! min-h-100'>
          {db && <ObjectsTree db={db} root={object} onSelect={(entity) => setSelectedId(entity.id)} />}
        </div>
      </Layout.Main>
    </Clipboard.Provider>
  );
};
