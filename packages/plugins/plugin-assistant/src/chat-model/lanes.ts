//
// Copyright 2026 DXOS.org
//

import { EntityId } from '@dxos/keys';
import { type LaneCardData, type LaneLine, type ThreadLane, laneTag } from '@dxos/react-ui-assistant/types';
import { type Reducer } from '@dxos/trajectory';
import { Message } from '@dxos/types';

/** Gutter colours, in the order lanes take them; distinct from one another at a glance. */
export const LANE_HUES = ['sky', 'amber', 'emerald', 'fuchsia', 'rose', 'indigo', 'lime', 'orange'] as const;

/** Lines a background lane's card keeps: its tail, which is what the reader glances at. */
const CARD_LINES = 40;

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

/** Rows reused while their text is unchanged, so a lane's card keeps its identity until its lane moves. */
const rows = new Map<string, Message.Message>();

/** Row ids by lane and kind: a row is not an event, so it gets an id of its own, stable for the lane. */
const rowIds = new Map<string, string>();

const laneRow = (key: string, created: string, text: string): Message.Message => {
  const cached = rows.get(key);
  if (cached && cached.blocks[0]?._tag === 'text' && cached.blocks[0].text === text) {
    return cached;
  }
  const id = rowIds.get(key) ?? EntityId.random();
  rowIds.set(key, id);
  const row = Message.make({ id, created, sender: { role: 'assistant' }, blocks: [{ _tag: 'text', text }] });
  rows.set(key, row);
  return row;
};

/**
 * Arranges the thread's rows by lane for a chat that ran several requests at once (light threads): rows keep feed
 * order, so lanes interleave and their gutters tell them apart (moving a row the list already placed makes the
 * virtual list re-anchor without end); the newest running lane is the foreground and shows in full, other running
 * lanes collapse into a card at their first row that follows their tail, and a lane that finished in the background
 * is echoed at the end. A chat whose lanes never overlapped is returned as it is.
 *
 * `tail` rows at the end (prompts not taken up yet) stay last.
 */
export const arrangeLanes = ({
  messages,
  tail,
  lanes,
  laneOf: laneOfMessage,
  delivery,
}: {
  messages: readonly Message.Message[];
  tail: number;
  lanes: readonly Reducer.Lane[];
  /** The lane of each message, by id. */
  laneOf: ReadonlyMap<string, string>;
  /** A prompt's row is keyed by its outbox id; its delivery names the message it became. */
  delivery?: ReadonlyMap<string, { entryId?: string; turnId?: string }>;
}): LaneArrangement => {
  const laneOf = {
    get: (id: string): string | undefined => {
      const row = delivery?.get(id);
      return (
        laneOfMessage.get(id) ??
        (row?.turnId !== undefined ? laneOfMessage.get(row.turnId) : undefined) ??
        (row?.entryId !== undefined ? laneOfMessage.get(row.entryId) : undefined)
      );
    },
  };
  const overlapped = lanes.filter((lane) => lane.overlapped);
  if (overlapped.length === 0) {
    return { messages: [...messages], lanes: new Map() };
  }

  const hues = new Map(overlapped.map((lane, index) => [lane.id, LANE_HUES[index % LANE_HUES.length]]));
  const byId = new Map(overlapped.map((lane) => [lane.id, lane]));
  const running = overlapped.filter((lane) => lane.status === 'running' || lane.status === 'waiting');
  const foreground = running.at(-1)?.id;
  const background = new Set(running.filter((lane) => lane.id !== foreground).map((lane) => lane.id));

  const body = messages.slice(0, messages.length - tail);
  const buckets = new Map<string, Message.Message[]>();
  for (const message of body) {
    const lane = laneOf.get(message.id);
    if (lane !== undefined && byId.has(lane)) {
      buckets.set(lane, [...(buckets.get(lane) ?? []), message]);
    }
  }

  const toThreadLane = (lane: Reducer.Lane): ThreadLane => {
    const waitingOn = lane.waitingOn !== undefined ? byId.get(lane.waitingOn) : undefined;
    return {
      id: lane.id,
      hue: hues.get(lane.id) ?? LANE_HUES[0],
      title: lane.purpose ?? titleOf(buckets.get(lane.id) ?? []),
      ...(lane.owner.name !== undefined ? { owner: lane.owner.name } : {}),
      status: lane.status,
      ...(waitingOn ? { waitingOn: { hue: hues.get(waitingOn.id) ?? LANE_HUES[0], title: waitingOn.purpose } } : {}),
      started: lane.created,
      first: buckets.get(lane.id)?.[0]?.id,
    };
  };

  const card = (lane: Reducer.Lane, kind: 'lane' | 'lane-done', lines: readonly LaneLine[]) => {
    const data: LaneCardData = { lane: toThreadLane(lane), lines };
    return laneRow(`${kind}:${lane.id}`, lane.created, laneTag(kind, data));
  };

  const arranged: Message.Message[] = [];
  const chrome = new Map<string, ThreadLane>();
  const carded = new Set<string>();
  const threadLanes = new Map<string, ThreadLane>();
  for (const message of body) {
    const id = laneOf.get(message.id);
    const lane = id !== undefined ? byId.get(id) : undefined;
    if (!lane) {
      arranged.push(message);
    } else if (background.has(lane.id)) {
      if (!carded.has(lane.id)) {
        carded.add(lane.id);
        arranged.push(card(lane, 'lane', (buckets.get(lane.id) ?? []).flatMap(toLines).slice(-CARD_LINES)));
      }
    } else {
      const threadLane = threadLanes.get(lane.id) ?? toThreadLane(lane);
      threadLanes.set(lane.id, threadLane);
      chrome.set(message.id, threadLane);
      arranged.push(message);
    }
  }

  // Lanes that finished in the latest run of overlapping lanes, other than the newest: their answer is echoed last.
  const burst: Reducer.Lane[] = [];
  for (const lane of [...lanes].reverse()) {
    if (!lane.overlapped) {
      break;
    }
    burst.unshift(lane);
  }
  // Only while a lane still runs: once every lane has finished, each answer is in view where its lane is.
  const notices = (running.length > 0 ? burst : [])
    .slice(0, -1)
    .filter((lane) => lane.status === 'done' || lane.status === 'failed')
    .flatMap((lane) => {
      const answer = (buckets.get(lane.id) ?? [])
        .filter((message) => message.sender.role === 'assistant')
        .flatMap(toLines)
        .filter((line) => line.role === 'assistant')
        .at(-1);
      return answer ? [card(lane, 'lane-done', [answer])] : [];
    });

  return { messages: [...arranged, ...notices, ...messages.slice(messages.length - tail)], lanes: chrome };
};
