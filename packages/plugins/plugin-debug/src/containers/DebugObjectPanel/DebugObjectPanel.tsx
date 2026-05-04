//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { ObjectsTree } from '@dxos/devtools';
import { Filter, Json, Obj, Query } from '@dxos/echo';
import type { ObjectId } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Input, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

export type DebugObjectPanelProps = Pick<
  AppSurface.ObjectArticleProps<Obj.Unknown, {}, Obj.Unknown>,
  'role' | 'companionTo'
>;

export const DebugObjectPanel = ({ role, companionTo }: DebugObjectPanelProps) => {
  const db = Obj.getDatabase(companionTo);
  const [selectedId, setSelectedId] = useState<ObjectId | null>(null);
  const [depth, setDepth] = useState(0);
  const [selectedObject] = useQuery(
    db,
    Query.select(Filter.id(selectedId ?? companionTo.id)).options({ deleted: 'include' }),
  );
  const refReplacer = useMemo(() => (db ? Json.createRefReplacer({ db, depth }) : undefined), [db, depth]);

  return (
    <Clipboard.Provider>
      <Panel.Root role={role}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <div role='none' className={mx('grid divide-y divide-separator', db && 'grid-rows-[1fr_2fr]')}>
            {db && (
              <ScrollArea.Root>
                <ScrollArea.Viewport>
                  <ObjectsTree db={db} root={companionTo} onSelect={(entity) => setSelectedId(entity.id)} />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
            <Syntax.Root data={selectedObject} replacer={refReplacer}>
              <Panel.Root>
                <Panel.Toolbar asChild>
                  <Toolbar.Root classNames='grid grid-cols-[1fr_3rem]'>
                    <Syntax.Filter />
                    <Input.Root>
                      <Input.TextInput
                        variant='subdued'
                        type='number'
                        min={0}
                        step={1}
                        aria-label='Ref depth'
                        value={depth}
                        onChange={(event) => setDepth(Math.max(0, Number(event.target.value) || 0))}
                      />
                    </Input.Root>
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
