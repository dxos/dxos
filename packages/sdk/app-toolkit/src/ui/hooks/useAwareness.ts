//
// Copyright 2026 DXOS.org
//

import { type JsonValue } from '@bufbuild/protobuf';
import * as Schema from 'effect/Schema';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { generateName } from '@dxos/display-name';
import { type Obj } from '@dxos/echo';
import { useIdentity } from '@dxos/halo-react';
import * as Awareness from '@dxos/protocols/Awareness';
import { getSpace } from '@dxos/react-client/echo';
import { hexToHue } from '@dxos/util';

export type UseAwarenessResult<T> = {
  /** Other clients' open sessions on this object, including those that share nothing right now. */
  sessions: readonly Awareness.RemoteSession<T>[];
  /** Sets this client's value; `undefined` withdraws it. */
  update: (value: T | undefined) => void;
};

const EMPTY: readonly Awareness.RemoteSession<never>[] = [];

/**
 * A pointer position in the surface's own world coordinates, so peers with different zoom and pan agree.
 */
export const Point = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  /** The nested view (page, frame) the point is in, on surfaces that have them. */
  view: Schema.optional(Schema.String),
});

export type Point = typeof Point.Type;

/** A pointer moves often and a parked one should not linger, unlike the channel's text-cursor default. */
const POINTER_TIMING: Awareness.Timing = { throttle: 50, heartbeat: 5_000, idle: 60_000 };

/**
 * Shares a value about `object` with the other clients in its space, tagged with this member's name and
 * hue. Inert without a space or an identity.
 *
 * @param kind Separates the kinds of awareness about one object (e.g. `pointer`, `selection`).
 * @param schema Must be stable across renders.
 * @param timing Must be stable across renders.
 */
export const useAwareness = <T, I extends JsonValue>(
  object: Obj.Unknown | undefined,
  kind: string,
  schema: Schema.Codec<T, I>,
  timing?: Awareness.Timing,
): UseAwarenessResult<T> => {
  const identity = useIdentity();
  const space = object ? getSpace(object) : undefined;
  const objectId = object?.id;
  const identityKey = identity?.identityKey;
  // A cleared display name is stored as an empty string, which would otherwise keep the member off the channel.
  const name = identityKey ? identity?.displayName || generateName(identityKey) : undefined;
  const hue = identityKey ? (readHue(identity?.data?.hue) ?? hexToHue(identityKey)) : undefined;

  const [channel, setChannel] = useState<Awareness.Channel<T, I>>();
  const [sessions, setSessions] = useState<readonly Awareness.RemoteSession<T>[]>(EMPTY);

  useEffect(() => {
    if (!space || !objectId || !identityKey || !name || !hue) {
      return;
    }

    // The colours markdown cursors read; drawing surfaces read the hue.
    const color = `var(--color-${hue}-border)`;
    const next = new Awareness.Channel({
      messenger: space,
      channel: Awareness.channelId(kind, objectId),
      peer: { peerId: identityKey, info: { displayName: name, darkColor: color, lightColor: color, hue } },
      schema,
      timing,
    });
    const unsubscribe = next.changed.on(() => setSessions(next.getSessions()));
    next.open();
    setChannel(next);
    return () => {
      unsubscribe();
      next.close();
      setChannel(undefined);
      setSessions(EMPTY);
    };
  }, [space, objectId, kind, schema, timing, identityKey, name, hue]);

  const update = useCallback((value: T | undefined) => channel?.update(value), [channel]);

  return { sessions, update };
};

/**
 * Shares this client's pointer on a drawing surface, in the surface's world coordinates.
 */
export const usePointerAwareness = (object: Obj.Unknown | undefined): UseAwarenessResult<Point> =>
  useAwareness(object, 'pointer', Point, POINTER_TIMING);

/**
 * A collaborator's pointer, ready to draw.
 */
export type PointerCursor = Point & {
  /** Their session, so one person on two devices draws two cursors. */
  id: string;
  name: string;
  hue: string;
};

/**
 * {@link usePointerAwareness} with the remote states flattened into cursors.
 */
export const usePointerCursors = (
  object: Obj.Unknown | undefined,
): { cursors: readonly PointerCursor[]; update: (point: Point | undefined) => void } => {
  const { sessions, update } = usePointerAwareness(object);
  const cursors = useMemo(
    () =>
      sessions.flatMap(({ sessionId, info, value }) =>
        value ? [{ ...value, id: sessionId, name: info.displayName, hue: info.hue ?? 'neutral' }] : [],
      ),
    [sessions],
  );
  return { cursors, update };
};

const readHue = (value: unknown): string | undefined => (typeof value === 'string' && value ? value : undefined);
