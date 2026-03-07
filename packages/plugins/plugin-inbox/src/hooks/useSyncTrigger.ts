//
// Copyright 2025 DXOS.org
//

import { useCallback, useMemo, useState } from 'react';

import { type Client } from '@dxos/client';
import { DXN, type Database, type Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';
import { useClient } from '@dxos/react-client';
import { Query, useObject, useQuery } from '@dxos/react-client/echo';

/**
 * Finds or imports a function by key from Edge into the space database.
 * Updates existing functions if a newer version is available.
 */
const ensureFunction = async (
  client: Client,
  db: Database.Database,
  functionKey: string,
): Promise<Function.Function | undefined> => {
  const deployed = await getDeployedFunctions(client, true);
  const match = deployed.find((fn) => fn.key === functionKey);
  if (!match) {
    return undefined;
  }

  const existing = await db.query(Query.type(Function.Function, { key: functionKey })).run();
  const [existingFunc] = existing;
  if (existingFunc) {
    Function.setFrom(existingFunc, match);
    return existingFunc;
  }

  return db.add(match);
};

/**
 * Hook to find, create, and toggle a timer-based sync trigger for a feed.
 * Imports the required function from Edge if it doesn't exist in the space.
 */
export const useSyncTrigger = ({
  db,
  subject,
  functionKey,
  input: extraInput,
}: {
  db: Database.Database | undefined;
  subject: Feed.Feed;
  functionKey: string;
  /** Additional input fields merged into the trigger input alongside the feed ref. */
  input?: Record<string, unknown>;
}) => {
  const client = useClient();
  const [pending, setPending] = useState(false);
  const triggers = useQuery(db, Filter.type(Trigger.Trigger));

  const subjectDxn = Obj.getDXN(subject);
  const syncTrigger = useMemo(
    () =>
      triggers.find((trigger) => {
        if (trigger.spec?.kind !== 'timer') {
          return false;
        }
        const feedRef = trigger.input?.feed;
        return feedRef?.dxn && DXN.equalsEchoId(feedRef.dxn, subjectDxn);
      }),
    [triggers, subjectDxn],
  );

  const [syncEnabled, setSyncEnabled] = useObject(syncTrigger, 'enabled');

  const handleToggleSync = useCallback(async () => {
    if (!db) {
      return;
    }

    if (syncTrigger) {
      setSyncEnabled((enabled) => !enabled);
      return;
    }

    setPending(true);
    try {
      const fn = await ensureFunction(client, db, functionKey);
      if (!fn) {
        return;
      }

      const trigger = Trigger.make({
        enabled: true,
        spec: { kind: 'timer', cron: '*/5 * * * *' },
        function: Ref.make(fn),
        input: { feed: db.makeRef(Obj.getDXN(subject)), ...extraInput },
      });

      db.add(trigger);
    } finally {
      setPending(false);
    }
  }, [syncTrigger, db, client, subject, functionKey, extraInput]);

  return { syncEnabled, syncTrigger, pending, handleToggleSync };
};
