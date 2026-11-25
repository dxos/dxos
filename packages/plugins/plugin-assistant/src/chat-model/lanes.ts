//
// Copyright 2026 DXOS.org
//

import type * as Reducer from '@dxos/compute/Reducer';
import { EntityId } from '@dxos/keys';
import { type LaneLine, type ThreadLane, laneTag } from '@dxos/react-ui-assistant/types';
import { Message } from '@dxos/types';

/** Gutter colours, in the order lanes take them; distinct from one another at a glance. */
export const LANE_HUES = ['sky', 'amber', 'emerald', 'fuchsia', 'rose', 'indigo', 'lime', 'orange'] as const;

export type LaneArrangement = {
  readonly messages: Message.Message[];
  /** The lane of each row that belongs to one shown in full, for its gutter. */
  readonly lanes: ReadonlyMap<string, ThreadLane>;
};

/** A message as compact lines: its text, and the tools it called. */
const toLines = (message: Message.Message): LaneLine[] => {
  const name = message.sender.name !== undefined ? { name: message.sender.name } : {};
  return message.blocks.flatMap((block): LaneLine[] => {
    switch (block._tag) {
      case 'text':
        return block.text.trim().length > 0 && block.disposition !== 'synthetic'
          ? [{ role: message.sender.role ?? 'assistant', ...name, text: block.text.trim() }]
          : [];
      case 'toolCall':
        return [{ role: 'tool', text: `→ ${block.operationName ?? block.name}` }];
      default:
        return [];
    }
  });
};

/** A lane's title when it has none of its own (a turn on main): the start of its request. */
const titleOf = (messages: readonly Message.Message[]): string | undefined => {
  const request = messages.find((message) => message.sender.role === 'user');
  const value = request ? Message.extractText(request).replace(/\s+/g, ' ').trim() : '';
  return value.length === 0 ? undefined : value.length > 80 ? `${value.slice(0, 79)}…` : value;
};

/**
 * Lane rows kept between arrangements of one chat: a row is reused while its text is unchanged, so a lane's card keeps
 * its identity until its lane moves, and a row is not an event, so it keeps an id of its own, stable for the lane.
 */
export type LaneRowCache = {
  readonly rows: Map<string, Message.Message>;
  readonly ids: Map<string, string>;
};

export const makeLaneRowCache = (): LaneRowCache => ({ rows: new Map(), ids: new Map() });

const laneRow = (cache: LaneRowCache, key: string, created: string, text: string): Message.Message => {
  const cached = cache.rows.get(key);
  if (cached && cached.blocks[0]?._tag === 'text' && cached.blocks[0].text === text) {
    return cached;
  }
  const id = cache.ids.get(key) ?? EntityId.random();
  cache.ids.set(key, id);
  const row = Message.make({ id, created, sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }] });
  cache.rows.set(key, row);
  return row;
};

/**
 * Each lane's gutter colour, in the order the lanes opened. Turns on main take none (main is the thread itself, not a
 * lane beside it), so a thread keeps its colour however many turns main runs; a host showing a thread elsewhere (its own
 * column) colours it from here so the two match.
 */
export const laneHues = (lanes: readonly Reducer.Lane[]): ReadonlyMap<string, string> =>
  new Map(
    lanes
      .filter((lane) => lane.kind !== 'turn')
      .map((lane, index) => [lane.id, LANE_HUES[index % LANE_HUES.length]] as const),
  );

const isActive = (lane: Reducer.Lane): boolean => lane.status === 'running' || lane.status === 'waiting';

/**
 * Arranges the thread's rows for a chat that ran several requests at once (light threads). Main reads as one thread:
 * its turns keep every row, in feed order, with no gutter. A lane in the background (a delegated thread, or a request
 * a newer one of the same owner moved past) keeps its work out of the transcript: while it works it is one row, pinned
 * after the transcript, and once it has finished its final answer shows where it landed, in the lane's colour. Every
 * other lane that overlapped one shows in place with its gutter, which is how agents talking to the reader at once
 * stay side by side. A chat whose lanes never overlapped is returned as it is.
 *
 * `tail` rows at the end (prompts not taken up yet) stay last.
 */
export const arrangeLanes = ({
  messages,
  tail,
  lanes,
  laneOf: laneOfMessage,
  delivery,
  cache = makeLaneRowCache(),
}: {
  messages: readonly Message.Message[];
  tail: number;
  lanes: readonly Reducer.Lane[];
  /** The lane of each message, by id. */
  laneOf: ReadonlyMap<string, string>;
  /** A prompt's row is keyed by its outbox id; its delivery names the message it became. */
  delivery?: ReadonlyMap<string, { entryId?: string; turnId?: string }>;
  /** Rows kept from the chat's previous arrangement; a fresh cache when absent. */
  cache?: LaneRowCache;
}): LaneArrangement => {
  const laneOf = (id: string): string | undefined => {
    const row = delivery?.get(id);
    return (
      laneOfMessage.get(id) ??
      (row?.turnId !== undefined ? laneOfMessage.get(row.turnId) : undefined) ??
      (row?.entryId !== undefined ? laneOfMessage.get(row.entryId) : undefined)
    );
  };
  const overlapped = lanes.filter((lane) => lane.overlapped);
  if (overlapped.length === 0) {
    return { messages: [...messages], lanes: new Map() };
  }

  const hues = laneHues(lanes);
  // Turns on main are main itself, so they are never set apart from it.
  const byId = new Map<string, Reducer.Lane>(
    overlapped.filter((lane) => lane.kind !== 'turn').map((lane) => [lane.id, lane]),
  );

  const body = messages.slice(0, messages.length - tail);
  const buckets = new Map<string, Message.Message[]>();
  for (const message of body) {
    const lane = laneOf(message.id);
    if (lane !== undefined && byId.has(lane)) {
      buckets.set(lane, [...(buckets.get(lane) ?? []), message]);
    }
  }

  // A finished background lane's answer: its last message from the agent with prose in it.
  const finals = new Map(
    [...byId.values()].flatMap((lane) => {
      const finished = lane.backgrounded && !isActive(lane);
      const final = finished
        ? (buckets.get(lane.id) ?? []).findLast(
            (message) =>
              message.sender.role === 'assistant' && toLines(message).some((line) => line.role === 'assistant'),
          )
        : undefined;
      return final ? [[lane.id, final.id] as const] : [];
    }),
  );

  const toThreadLane = (lane: Reducer.Lane): ThreadLane => {
    const waitingOn = lane.waitingOn !== undefined ? byId.get(lane.waitingOn) : undefined;
    return {
      id: lane.id,
      hue: hues.get(lane.id) ?? LANE_HUES[0],
      title: lane.purpose ?? titleOf(buckets.get(lane.id) ?? []),
      // A delegated lane is a thread of this chat, whoever runs it.
      ...(lane.kind === 'fresh'
        ? { owner: 'thread' }
        : lane.owner.name !== undefined
          ? { owner: lane.owner.name }
          : {}),
      status: lane.status,
      ...(waitingOn ? { waitingOn: { hue: hues.get(waitingOn.id) ?? LANE_HUES[0], title: waitingOn.purpose } } : {}),
      started: lane.created,
      // A background lane's header rides on its final answer.
      first: finals.get(lane.id) ?? buckets.get(lane.id)?.[0]?.id,
    };
  };

  const arranged: Message.Message[] = [];
  const chrome = new Map<string, ThreadLane>();
  const threadLanes = new Map<string, ThreadLane>();
  for (const message of body) {
    const id = laneOf(message.id);
    const lane = id !== undefined ? byId.get(id) : undefined;
    if (lane && (!lane.backgrounded || finals.get(lane.id) === message.id)) {
      const threadLane = threadLanes.get(lane.id) ?? toThreadLane(lane);
      threadLanes.set(lane.id, threadLane);
      chrome.set(message.id, threadLane);
      arranged.push(message);
    } else if (!lane) {
      arranged.push(message);
    }
  }

  // The lanes still working out of view, one row each, after everything the transcript holds.
  const pinned = [...byId.values()].filter((lane) => lane.backgrounded && isActive(lane));
  if (pinned.length > 0) {
    arranged.push(
      laneRow(
        cache,
        'lane:pinned',
        pinned[0].created,
        laneTag(pinned.map((lane) => ({ lane: { ...toThreadLane(lane), first: undefined }, lines: [] }))),
      ),
    );
  }

  // Only the rows still shown stay cached, so the cache is bounded by the chat rather than growing with every lane.
  for (const key of cache.rows.keys()) {
    if (key !== 'lane:pinned' || pinned.length === 0) {
      cache.rows.delete(key);
      cache.ids.delete(key);
    }
  }
  return { messages: [...arranged, ...messages.slice(messages.length - tail)], lanes: chrome };
};
