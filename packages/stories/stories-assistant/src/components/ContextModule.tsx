//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Agent } from '@dxos/assistant-toolkit';
import { Filter, Obj, type Ref } from '@dxos/echo';
import { Assistant } from '@dxos/plugin-assistant';
import { useContextBinder } from '@dxos/plugin-assistant/hooks';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

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
  // `useObject(agent)` returns a reactive snapshot that changes identity on any (incl. nested)
  // mutation — e.g. an artifact pushed by the agent process. We read artifact refs from the LIVE
  // `agent` (snapshot refs don't resolve), but key the memo on the snapshot so a newly-pushed
  // artifact re-renders. `agent.artifacts` is mutated in place, so depending on it directly would
  // NOT recompute (same array reference) — that was why a new doc only appeared after a force-update.
  const [agentSnapshot] = useObject(agent);
  const artifacts = agent?.artifacts ?? [];

  const items = useMemo<ContextItem[]>(
    () => [
      ...objects.map((object) => ({
        kind: 'object' as const,
        id: `object:${object.id}`,
        object,
      })),
      ...artifacts.map((artifact, index) => ({
        kind: 'artifact' as const,
        // Stable id that does not change when the ref resolves (avoids Masonry remount churn).
        id: `artifact:${index}`,
        name: artifact.name,
        data: artifact.data,
      })),
    ],
    [objects, artifacts, agentSnapshot],
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
  // Masonry may render a tile with no data transiently (e.g. during HMR remount); guard against it.
  const artifactRef = data?.kind === 'artifact' ? data.data : undefined;
  // Subscribe + trigger async load. Use the LIVE `ref.target` (populated once loaded) as the subject,
  // NOT `useObject`'s snapshot return: the card Surface filter requires `Obj.isObject(subject)`,
  // which a snapshot fails — so passing a snapshot yields no candidate and the Surface renders blank.
  useObject(artifactRef);

  if (!data) {
    return null;
  }

  // Fall back to the debug view while a ref is still resolving (or fails to resolve).
  const subject = data.kind === 'object' ? data.object : artifactRef?.target;
  if (!subject) {
    return <DebugTile data={data} />;
  }

  // Render via a card Surface (PreviewPlugin provides the generic `card--content` fallback).
  return (
    <Card.Root>
      <Surface.Surface type={AppSurface.CardContent} limit={1} data={{ subject }} />
    </Card.Root>
  );
};

const DebugTile = ({ data }: { data: ContextItem }) => {
  return (
    <Card.Root>
      <Card.Body>
        <Card.Row fullWidth classNames='max-h-50'>
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
