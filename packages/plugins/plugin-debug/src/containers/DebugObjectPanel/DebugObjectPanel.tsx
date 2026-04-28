//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { Filter, Obj, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Grid, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

import { createRefReplacer } from './createRefReplacer';

export type DebugObjectPanelProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

export const DebugObjectPanel = ({ role, companionTo }: DebugObjectPanelProps) => {
  const db = Obj.getDatabase(companionTo);
  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);
  const [selectedObject] = useQuery(
    db,
    Query.select(Filter.id(selectedId ?? companionTo.id)).options({ deleted: 'include' }),
  );
  const refReplacer = useMemo(() => (db ? createRefReplacer({ db, depth: 1 }) : undefined), [db]);

  return (
    <Clipboard.Provider>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Grid rows={db ? 2 : 1} classNames='divide-y divide-separator'>
            {db && (
              <ScrollArea.Root>
                <ScrollArea.Viewport>
                  <ObjectsTree db={db} root={companionTo} onSelect={(entity) => setSelectedId(entity.id)} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
            <Syntax.Root data={selectedObject} replacer={refReplacer}>
              <Syntax.Content>
                <Syntax.Filter />
                <Syntax.Viewport>
                  <Syntax.Code />
                </Syntax.Viewport>
              </Syntax.Content>
            </Syntax.Root>
          </Grid>
        </Panel.Content>
      </Panel.Root>
    </Clipboard.Provider>
  );
};
