//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Obj, Ref } from '@dxos/echo';
import { useMembers } from '@dxos/halo-react';

import { TriggerOperation } from '#types';

import * as BrainInspection from '../brain/BrainInspection.ts';
import { labelOf } from '../operations/members.ts';
import { useRemoteBrain } from './useBrainLocation.ts';

/** How often the brain is re-read; neither brain has a change feed for its facts and outboxes. */
const POLL_MS = 3_000;

export type BrainStoreData = {
  /** Absent until the first read returns. */
  inspection?: BrainInspection.Inspection;
  /** Why the last read failed. */
  error?: string;
};

/** The agent's brain store as held, re-read while mounted, from EDGE's brain for an agent whose chats run there. */
export const useBrainStore = (agent: Agent.Agent): BrainStoreData => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const remote = useRemoteBrain(agent);
  const members = useMembers(db?.spaceId);
  const label = useMemo(() => labelOf(members), [members]);

  const [snapshot, setSnapshot] = useState<TriggerOperation.BrainSnapshot>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    // Never show the previous agent's brain while this one's loads.
    setSnapshot(undefined);
    setError(undefined);
    if (!db) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    // Each read schedules the next once it settles, so a slow call never overlaps (or overwrites) a newer one.
    const read = async () => {
      const { data, error } = await invokePromise(
        TriggerOperation.InspectBrain,
        { agent: Ref.make(agent) },
        { spaceId: db.spaceId, ...(remote ? { on: 'edge' as const } : {}) },
      );
      if (cancelled) {
        return;
      }
      if (data) {
        setSnapshot(data);
      }
      setError(error ? error.message : undefined);
      timeout = setTimeout(() => void read(), POLL_MS);
    };
    void read();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [remote, db, agent, invokePromise]);

  const inspection = useMemo(() => snapshot && BrainInspection.make(snapshot, { label }), [snapshot, label]);
  return { inspection, ...(error ? { error } : {}) };
};
