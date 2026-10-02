//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { ObjectsTree } from '@dxos/devtools';
import { type Entity, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { type EntityId } from '@dxos/keys';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Field from '@dxos/react-ui/Field';
import * as Grid from '@dxos/react-ui/Grid';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Toolbar from '@dxos/react-ui/Toolbar';

export type DebugSpaceObjectsPanelProps = AppSurface.SpaceArticleProps & {
  onOpen?: (object: Obj.Unknown) => void;
  canOpen?: (entity: Entity.Snapshot) => boolean;
};

export const DebugSpaceObjectsPanel = ({ space, onOpen, canOpen }: DebugSpaceObjectsPanelProps) => {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  // TODO(burdon): Guard.
  const [selectedObject] = useQuery(
    space.db,
    selectedId ? Query.select(Filter.id(selectedId)) : Query.select(Filter.nothing()),
  );

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Field.Root>
            <Field.Input disabled placeholder='Search...' />
          </Field.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Grid.Root rows={2} classNames='divide-y divide-subdued-separator'>
          <ScrollArea.Root>
            <ScrollArea.Viewport>
              <ObjectsTree
                db={space.db}
                onSelect={(entity) => setSelectedId(entity.id)}
                onOpen={onOpen}
                canOpen={canOpen}
              />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          {selectedObject && <JsonHighlighter classNames='p-1' data={selectedObject} />}
        </Grid.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

DebugSpaceObjectsPanel.displayName = 'DebugSpaceObjectsPanel';
