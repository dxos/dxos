//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Agent from '@dxos/compute/Agent';
import type * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { type Database, Feed, Filter, Order, Query, Scope } from '@dxos/echo';
import * as Chat from '@dxos/plugin-assistant/Chat';
import * as ChatPlane from '@dxos/plugin-assistant/ChatPlane';
import { useObject, useQuery, useResolveRef } from '@dxos/react-client/echo';
import { Dnd } from '@dxos/react-ui-dnd';
import { Timeline } from '@dxos/react-ui-trace';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

import { type ChatModel, useThreadModel } from './thread-model.ts';
import { toCommits } from './trajectory-commits.ts';

/** The events written in `lane` and in every turn or thread nested in it, in feed order. */
const laneEvents = (events: readonly Trajectory.Event[], lane: Trajectory.ThreadId): Trajectory.Event[] => {
  const threads = new Set<string>([lane]);
  return events.filter((event) => {
    const thread = Trajectory.threadOf(event);
    const payload = event.payload;
    if (
      thread !== undefined &&
      (payload._tag === 'turnBegin' || payload._tag === 'threadOpen') &&
      payload.from?.thread !== undefined &&
      threads.has(payload.from.thread)
    ) {
      threads.add(thread);
    }
    return thread !== undefined && threads.has(thread);
  });
};

/** The slice of the trajectory a subagent wrote, as a git graph: what it holds in memory, step by step. */
const LaneMemory = ({ events }: { events: readonly Trajectory.Event[] }) => {
  const commits = useMemo(() => toCommits(events), [events]);
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  return (
    <div className='flex flex-col h-56 shrink-0 border-t border-separator' data-testid='launch.memory'>
      <div className='px-3 py-1 text-xs text-description'>Memory · {events.length} events</div>
      <ScrollArea.Root classNames='dx-grow'>
        <ScrollArea.Viewport ref={setViewport}>
          <Timeline commits={commits} scroller={viewport} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </div>
  );
};

type ThreadColumnProps = {
  db: Database.Database;
  chat: Agent.Session;
  lane: Reducer.Lane;
  /** The lane's colour, as the agent's thread draws it, so the column and its row in the thread match. */
  hue: string;
  events: readonly Trajectory.Event[];
};

/** One subagent thread: its reasoning and turns, the document it wrote as a card, and its slice of memory. */
const ThreadColumn = ({ db, chat, lane, hue, events }: ThreadColumnProps) => {
  const chatModel = useThreadModel(db, chat, lane.id);
  const memory = useMemo(() => laneEvents(events, lane.id), [events, lane.id]);
  if (!chatModel) {
    return null;
  }

  return (
    <Chat.Root chat={chat} db={db} chatModel={chatModel}>
      <ChatPlane.Column value={lane.id}>
        <ChatPlane.Cell
          title={
            // As the thread's row in the agent's chat names it, so the two read as one thing.
            <Chat.LaneHeader
              lane={{
                id: lane.id,
                hue,
                title: lane.purpose,
                owner: 'thread',
                status: lane.status,
                started: lane.created,
              }}
              classNames='text-sm'
              statusEnd
            />
          }
        >
          <Panel.Body asChild>
            <Chat.Content>
              <Chat.Thread viewType='thinking' tailLines={4} />
            </Chat.Content>
          </Panel.Body>
          <LaneMemory events={memory} />
        </ChatPlane.Cell>
      </ChatPlane.Column>
    </Chat.Root>
  );
};

type ThreadPlaneProps = {
  db: Database.Database;
  chat: Agent.Session;
  chatModel: ChatModel;
};

/** How long a finished subagent's column stays open, so its result can be read before it closes. */
const CLOSE_DELAY = 6_000;

/**
 * Each subagent thread in a column of its own: a column opens as the agent delegates, and closes a few seconds after its
 * subagent reports, leaving the result in the agent's chat. The columns keep their width, so the strip scrolls sideways
 * once they outgrow it.
 */
const ThreadPlane = ({ db, chat, chatModel }: ThreadPlaneProps) => {
  const view = useAtomValue(chatModel.trajectory);
  const lanes = useMemo(() => view.lanes.filter((lane) => lane.kind === 'fresh'), [view.lanes]);
  const hues = useMemo(() => Chat.laneHues(view.lanes), [view.lanes]);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const [current, setCurrent] = useState<string>();

  // Every branch of the feed, so each column can show the events its subagent wrote.
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const feedUri = feed && Feed.getFeedUri(feed);
  const query = useMemo(
    () =>
      feedUri
        ? Query.select(Filter.type(Trajectory.Event))
            .from(Scope.feed(feedUri.toString(), { walk: { branch: 'all' } }))
            .orderBy(Order.natural('asc'))
        : Query.select(Filter.nothing()),
    [feedUri?.toString()],
  );
  const events = useQuery(db, query);

  // A finished thread's column closes once the reader has had a moment with its result.
  const done = useMemo(
    () =>
      lanes
        .filter((lane) => lane.status === 'done' || lane.status === 'failed')
        .map(({ id }) => id)
        .join(','),
    [lanes],
  );
  // One timer per lane, started when that lane finishes, so another lane finishing does not restart its delay.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    for (const id of done.split(',')) {
      if (id.length > 0 && !timersRef.current.has(id)) {
        timersRef.current.set(
          id,
          setTimeout(() => setClosed((previous) => new Set([...previous, id])), CLOSE_DELAY),
        );
      }
    }
  }, [done]);
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const open = useMemo(() => lanes.filter(({ id }) => !closed.has(id)), [lanes, closed]);
  const items = useMemo(() => open.map(({ id }) => ({ id })), [open]);
  const selected = current !== undefined && items.some(({ id }) => id === current) ? current : items[0]?.id;

  return (
    <Dnd.Root>
      <ChatPlane.Root value={selected} onValueChange={setCurrent} align='start'>
        <ChatPlane.Viewport>
          <ChatPlane.Columns items={items}>
            {(id) => {
              const lane = open.find((candidate) => candidate.id === id);
              return (
                lane && (
                  <ThreadColumn db={db} chat={chat} lane={lane} hue={hues.get(lane.id) ?? 'neutral'} events={events} />
                )
              );
            }}
          </ChatPlane.Columns>
        </ChatPlane.Viewport>
      </ChatPlane.Root>
    </Dnd.Root>
  );
};

/** The subagent threads of the space's newest chat, one column each while it runs. */
export const ThreadColumns = ({ db }: { db: Database.Database }) => {
  const chats = useQuery(db, Filter.type(Agent.Session));
  const chat = chats.at(-1);
  const chatModel = useThreadModel(db, chat);
  if (!chat || !chatModel) {
    return null;
  }

  return <ThreadPlane db={db} chat={chat} chatModel={chatModel} />;
};
