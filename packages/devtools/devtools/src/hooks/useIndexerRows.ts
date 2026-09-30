//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { createEdgeIdentity } from '@dxos/client/edge';
import { Context } from '@dxos/context';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type IndexerHeadsResponse } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState, useSpaces } from '@dxos/react-client/echo';

import { getSpaceDisplayName } from './getSpaceDisplayName.ts';

/** Polled rather than subscribed: the indexer has no push channel to the client. */
const POLL_INTERVAL = 5_000;

export type IndexerRow = {
  spaceId: SpaceId;
  name: string;
  /** Local documents whose heads the indexer has not indexed (missing, behind, or diverged). */
  unindexed: number;
  error?: string;
};

const sameHeads = (left: readonly string[] = [], right: readonly string[] = []): boolean =>
  left.length === right.length && [...left].sort().join() === [...right].sort().join();

/** Diffs the client's local document heads against the EDGE indexer's last-indexed heads. */
const compareHeads = (
  space: Space,
  local: Record<string, readonly string[]>,
  remote: IndexerHeadsResponse,
): IndexerRow => {
  const indexedHeads = new Map(remote.documents.map(({ documentId, heads }) => [documentId, heads]));
  return {
    spaceId: space.id,
    name: getSpaceDisplayName(space),
    unindexed: Object.keys(local).filter((documentId) => !sameHeads(local[documentId], indexedHeads.get(documentId)))
      .length,
  };
};

/** One row per ready space comparing local document heads with the EDGE indexer's, polled, plus a raw copy action. */
export const useIndexerRows = (): { spaces: IndexerRow[]; refresh: () => void; copy: () => void } => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const [rows, setRows] = useState<IndexerRow[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>>({});
  // A ref, since `useSpaces` returns a new array each render and would restart polling on every update.
  const spacesRef = useRef(spaces);
  spacesRef.current = spaces;
  // Bumped per fetch and on cleanup so a superseded or post-unmount fetch cannot overwrite newer rows.
  const generationRef = useRef(0);

  const fetchRows = useCallback(async () => {
    const generation = ++generationRef.current;
    const readySpaces = spacesRef.current.filter((space) => space.state.get() === SpaceState.SPACE_READY);
    const results = await Promise.all(
      readySpaces.map(async (space) => {
        try {
          const [{ heads }, remote] = await Promise.all([
            space.internal.db.getDocumentHeads(),
            client.edge.http.getIndexerHeads(Context.default(), space.id),
          ]);
          return { row: compareHeads(space, heads, remote), raw: { local: heads, indexer: remote } };
        } catch (err) {
          log.catch(err);
          const error = err instanceof Error ? err.message : String(err);
          const row: IndexerRow = {
            spaceId: space.id,
            name: getSpaceDisplayName(space),
            unindexed: 0,
            error,
          };
          return { row, raw: { error } };
        }
      }),
    );
    if (generation !== generationRef.current) {
      return;
    }
    setRows(results.map(({ row }) => row));
    setRaw(Object.fromEntries(results.map((result) => [result.row.spaceId, result.raw])));
  }, [client]);

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      client.edge.http.setIdentity(createEdgeIdentity(client));
      await fetchRows();
    });
    scheduleTaskInterval(ctx, fetchRows, POLL_INTERVAL);
    return () => {
      generationRef.current++;
      void ctx.dispose();
    };
  }, [client, fetchRows]);

  const refresh = useCallback(() => {
    void fetchRows();
  }, [fetchRows]);

  const copy = useCallback(() => {
    void navigator.clipboard.writeText(JSON.stringify(raw, null, 2));
  }, [raw]);

  return { spaces: rows, refresh, copy };
};
