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
 * Arranges the thread's rows for a chat that ran several requests at once (light threads). Rows keep feed order:
 * moving a row the virtual list has already placed makes it re-anchor without end. A lane a newer lane of the same
 * owner sent to the background becomes a fixed-height card at its first row, holding all of its work, so its rows
 * never interleave with the newer request's; once it has finished, its final answer shows full height where it
 * landed, at the time it completed. Every other lane that overlapped one shows in place with its gutter, which is
 * how agents talking to the reader at once stay side by side. A chat whose lanes never overlapped is returned as it is.
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

  const hues = new Map(overlapped.map((lane, index) => [lane.id, LANE_HUES[index % LANE_HUES.length]]));
  const byId = new Map(overlapped.map((lane) => [lane.id, lane]));

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
    overlapped.flatMap((lane) => {
      const finished = lane.backgrounded && (lane.status === 'done' || lane.status === 'failed');
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
      ...(lane.owner.name !== undefined ? { owner: lane.owner.name } : {}),
      status: lane.status,
      ...(waitingOn ? { waitingOn: { hue: hues.get(waitingOn.id) ?? LANE_HUES[0], title: waitingOn.purpose } } : {}),
      started: lane.created,
      // A background lane's header rides on its final answer; its card carries one of its own.
      first: finals.get(lane.id) ?? buckets.get(lane.id)?.[0]?.id,
    };
  };

  const arranged: Message.Message[] = [];
  const chrome = new Map<string, ThreadLane>();
  const threadLanes = new Map<string, ThreadLane>();
  const carded = new Set<string>();
  const shown = (lane: Reducer.Lane, message: Message.Message) => {
    const threadLane = threadLanes.get(lane.id) ?? toThreadLane(lane);
    threadLanes.set(lane.id, threadLane);
    chrome.set(message.id, threadLane);
    arranged.push(message);
  };
  for (const message of body) {
    const id = laneOf(message.id);
    const lane = id !== undefined ? byId.get(id) : undefined;
    if (!lane) {
      arranged.push(message);
    } else if (!lane.backgrounded) {
      shown(lane, message);
    } else {
      if (!carded.has(lane.id)) {
        carded.add(lane.id);
        const data: LaneCardData = {
          lane: { ...toThreadLane(lane), first: undefined },
          lines: (buckets.get(lane.id) ?? []).flatMap(toLines).slice(-CARD_LINES),
        };
        arranged.push(laneRow(`lane:${lane.id}`, lane.created, laneTag(data)));
      }
      if (finals.get(lane.id) === message.id) {
        shown(lane, message);
      }
    }
  }

  return { messages: [...arranged, ...messages.slice(messages.length - tail)], lanes: chrome };
};
