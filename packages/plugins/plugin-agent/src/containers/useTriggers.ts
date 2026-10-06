//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';

import { Trigger, TriggerOperation } from '#types';

import { triggerRegistry } from '../triggers.ts';

/** A trigger as the UI shows it, from whichever brain holds it. */
export type Watch = {
  id: string;
  goal?: Ref.Ref<Obj.Unknown>;
  /** The fact pattern, as one line. */
  when: string;
  recipient: Ref.Ref<Obj.Unknown>;
  message: string;
};

/** How often an EDGE-hosted agent's triggers are re-read; its brain has no change feed to subscribe to. */
const REMOTE_POLL_MS = 3_000;

const subscribe = (listener: () => void) => triggerRegistry.subscribe(listener);
const getSnapshot = () => triggerRegistry.snapshot;

/**
 * The agent's active triggers, oldest first. An agent whose chats run on EDGE keeps them in EDGE's brain,
 * read through `listTriggers` there; otherwise they live in this app's memory and re-render on every change.
 */
export const useTriggers = (agent: Agent.Agent): Watch[] => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  const chats: Chat.Chat[] = useQuery(db, chatFilter);
  const remote = chats.some((chat) => chat.remote);

  const local = useSyncExternalStore(subscribe, getSnapshot);
  const localWatches = useMemo(
    () =>
      local
        .filter((trigger) => trigger.agent === agent.id)
        .map(({ id, goal, when, then }): Watch => ({
          id,
          ...(goal ? { goal } : {}),
          when: Trigger.describePattern(when),
          recipient: then.recipient,
          message: then.message,
        })),
    [local, agent.id],
  );

  const [remoteWatches, setRemoteWatches] = useState<Watch[]>([]);
  useEffect(() => {
    if (!remote || !db) {
      return;
    }

    let cancelled = false;
    const read = async () => {
      const { data } = await invokePromise(
        TriggerOperation.ListTriggers,
        { agent: Ref.make(agent) },
        { spaceId: db.spaceId, on: 'edge' },
      );
      if (!cancelled && data) {
        setRemoteWatches(
          data.triggers.map(({ trigger, goal, when, recipient, message }) => ({
            id: trigger,
            ...(goal ? { goal } : {}),
            when,
            recipient,
            message,
          })),
        );
      }
    };
    void read();
    const interval = setInterval(() => void read(), REMOTE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [remote, db, agent, invokePromise]);

  return remote ? remoteWatches : localWatches;
};
