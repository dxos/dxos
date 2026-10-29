//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import { type Database, Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as EffectEx from '@dxos/effect/EffectEx';
import { Connection } from '@dxos/link';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { type Session } from '#client';
import { toResearchRow } from '#model';
import { Research } from '#types';

import { ResearchList } from '../../components/ResearchList/index.ts';
import { LIGHTHOUSE_CONNECTOR_ID } from '../../constants.ts';
import { useConnectionClient } from '../../hooks/useConnectionClient.ts';
import { newestFirst } from '../../paths.ts';
import { makeResearch } from '../../util/new-research.ts';

export type ResearchListArticleProps = { role?: string; db?: Database.Database };

/** How often the list re-reads the sessions' status while it is open. */
const POLL = 10_000;

/**
 * The Research section (and the Research type in the Database) as lighthouse's session list: the space's Research
 * newest first with each session's status, pages and cost, read from the space's lighthouse connection.
 */
export const ResearchListArticle = ({ role, db }: ResearchListArticleProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const researches = useQuery(db, Filter.type(Research.Research));
  const connections = useQuery(db, Filter.type(Connection.Connection, { connectorId: LIGHTHOUSE_CONNECTOR_ID }));
  const client = useConnectionClient(connections[0]);
  const [sessions, setSessions] = useState<ReadonlyMap<string, Session>>(new Map());
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!client) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const list = await EffectEx.runPromise(client.listSessions());
        if (!cancelled) {
          setSessions(new Map(list.map((session) => [session.run, session])));
          setError(undefined);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
      if (!cancelled) {
        timer = setTimeout(() => void load(), POLL);
      }
    };
    void load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client]);

  const rows = useMemo(
    () =>
      [...researches]
        .sort(newestFirst)
        .map((research) => toResearchRow(research, research.run ? sessions.get(research.run) : undefined)),
    [researches, sessions],
  );

  // Where a Research lands in the tree is the resolver's question (as the create dialog asks it).
  const open = useCallback(
    async (object: Research.Research) => {
      const { data } = await invokePromise(NavigationOperation.ResolveNavigationTargets, {
        query: { uri: Obj.getURI(object) },
      });
      const target = data?.targets[0];
      if (target) {
        await invokePromise(LayoutOperation.Open, { subject: [target.path], navigation: 'immediate' });
        await invokePromise(LayoutOperation.Expose, { subject: target.path });
      }
    },
    [invokePromise],
  );

  const handleOpen = useCallback(
    (id: string) => {
      const research = researches.find((research) => research.id === id);
      if (research) {
        void open(research);
      }
    },
    [researches, open],
  );

  // The same as the section's +: a new Research opened on its goal.
  const handleNew = useCallback(async () => {
    if (!db) {
      return;
    }
    const research = await EffectEx.runPromise(makeResearch(db));
    const { data } = await invokePromise(SpaceOperation.AddObject, { object: research }, { spaceId: db.spaceId });
    if (data && Research.instanceOf(data.object)) {
      await open(data.object);
    }
  }, [db, invokePromise, open]);

  return <ResearchList role={role} rows={rows} error={error} onOpen={handleOpen} onNew={() => void handleNew()} />;
};
