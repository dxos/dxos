//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit';
import { type Ref, Filter, Obj } from '@dxos/echo';
import { Assistant } from '@dxos/plugin-assistant';
import { useContextBinder } from '@dxos/plugin-assistant/hooks';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { JsonHighlighter, Syntax } from '@dxos/react-ui-syntax-highlighter';

import { type ModuleProps } from './types';

export const ContextModule = ({ space }: ModuleProps) => {
  // Objects bound to the feed (the agent-independent context: `session.addContext` → `binder.bind`).
  // TODO(burdon): Reconcile objects vs. artifacts.
  const chats = useQuery(space?.db, Filter.type(Assistant.Chat));
  const feedTarget = chats.at(-1)?.feed.target;
  const binder = useContextBinder(space, feedTarget);
  const objects = useBoundObjects(binder);

  // The agent's artifacts (added via the add-artifact tool) are tracked on the agent, not in the
  // bound context objects above, so surface them separately. Subscribe via `useObject` so a
  // newly-pushed artifact re-renders (useQuery alone only tracks the result set), but read the
  // artifacts from the LIVE `agent` — useObject returns a detached snapshot whose refs don't resolve.
  const [agent] = useQuery(space?.db, Filter.type(Agent.Agent));
  useObject(agent);
  const artifacts = agent?.artifacts ?? [];

  const items = useMemo<ContextItem[]>(
    () => [
      ...objects.map((object, index) => ({
        kind: 'object' as const,
        id: object.id,
        object,
      })),
      ...artifacts.map((artifact, index) => ({
        kind: 'artifact' as const,
        id: artifact.data.target?.id ?? `artifact-${index}`,
        name: artifact.name,
        data: artifact.data,
      })),
    ],
    [objects, artifacts],
  );

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>
            Context Objects ({objects.length}); Artifacts ({artifacts.length})
          </Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Masonry.Root Tile={Tile}>
        <Panel.Content asChild>
          <Masonry.Content padding thin classNames='p-1'>
            <Masonry.Viewport items={items} getId={(item) => item.id} />
          </Masonry.Content>
        </Panel.Content>
      </Masonry.Root>
    </Panel.Root>
  );
};

/**
 * Subscribes to the objects bound to the chat's feed context. The binder exposes a reactive atom,
 * but `getObjects()` is a one-shot read; subscribing here re-renders when a process binds a new
 * object to context (no Agent object required).
 */
const useBoundObjects = (binder: ReturnType<typeof useContextBinder>): Obj.Unknown[] => {
  const [objects, setObjects] = useState<Obj.Unknown[]>([]);
  useEffect(() => {
    if (!binder) {
      setObjects([]);
      return;
    }
    setObjects(binder.getObjects());
    return binder.subscribeObjects(setObjects);
  }, [binder]);
  return objects;
};

type ContextItem =
  | { kind: 'object'; id: string; object: Obj.Unknown }
  | { kind: 'artifact'; id: string; name: string; data: Ref.Ref<Obj.Unknown> };

const Tile = ({ data }: { data: ContextItem }) => {
  // For an artifact, dereference its ref (async-loads + subscribes and RETURNS the resolved
  // snapshot); reading `ref.target` directly is a synchronous working-set read that stays undefined
  // until loaded. For an object we already hold the live instance.
  const [resolved] = useObject(data.kind === 'artifact' ? data.data : data.object);
  const subject = data.kind === 'object' ? data.object : resolved;
  if (!subject) {
    return (
      <Card.Root>
        <Card.Body>
          <Card.Row fullWidth>
            <JsonHighlighter data={data} classNames='text-xs' />
          </Card.Row>
        </Card.Body>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Surface.Surface type={AppSurface.Card} limit={1} data={{ subject }} />
    </Card.Root>
  );
};

const DebugTile = ({ data }: { data: ContextItem }) => {
  return (
    <Card.Root>
      <Card.Body>
        <Card.Row fullWidth classNames='max-h-60'>
          <Syntax.Root data={data}>
            <Syntax.Content>
              <Syntax.Viewport>
                <Syntax.Code classNames='text-xs' />
              </Syntax.Viewport>
            </Syntax.Content>
          </Syntax.Root>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};
