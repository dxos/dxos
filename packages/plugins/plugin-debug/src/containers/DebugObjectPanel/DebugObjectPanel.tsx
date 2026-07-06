//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { type Entity, Filter, Json, Obj, Query } from '@dxos/echo';
import type { EntityId } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

export type DebugObjectPanelProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
> & {
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};

export const DebugObjectPanel = ({ role, companionTo, onOpen, canOpen }: DebugObjectPanelProps) => {
  const db = Obj.getDatabase(companionTo);
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [selectedObject] = useQuery(
    db,
    Query.select(Filter.id(selectedId ?? companionTo.id)).options({ deleted: 'include' }),
  );

  return (
    <Clipboard.Provider>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <div className={mx('grid divide-y divide-separator', db && 'grid-rows-[1fr_2fr]')}>
            {db && (
              <ScrollArea.Root>
                <ScrollArea.Viewport>
                  <ObjectsTree
                    db={db}
                    root={companionTo}
                    onSelect={(entity) => setSelectedId(entity.id)}
                    onOpen={onOpen}
                    canOpen={canOpen}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
            <Syntax.Root
              data={selectedObject}
              getReplacer={(depth) => (db ? Json.createRefReplacer({ db, depth }) : undefined)}
            >
              <Panel.Root>
                <Panel.Toolbar asChild>
                  <Toolbar.Root classNames='grid grid-cols-[1fr_3rem]'>
                    <Syntax.Filter />
                    <Syntax.Depth />
                  </Toolbar.Root>
                </Panel.Toolbar>
                <Panel.Content asChild>
                  <Syntax.Viewport>
                    <Syntax.Code />
                  </Syntax.Viewport>
                </Panel.Content>
              </Panel.Root>
            </Syntax.Root>
          </div>
        </Panel.Content>
      </Panel.Root>
    </Clipboard.Provider>
  );
};
