//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import type * as SpaceSchema from '../types/SpaceSchema.ts';
import { type FollowingTarget, isFollowTargetOf } from './presence.ts';

/** Awareness channel kind for the pointers of the sessions in a follow; one channel per space. */
export const POINTER_CHANNEL_KIND = 'pointer';

/**
 * A session's pointer while it takes part in a follow; see `FollowPointer` in PLUGIN.mdl.
 * The position is a fraction of the plank's box, so it lands on the same spot of a plank sized differently.
 */
export const FollowPointer = Schema.Struct({
  /** The sender's presence session, as in its viewing message. */
  sessionId: Schema.String,
  /** Whom the sender follows in the space. */
  following: Schema.optional(
    Schema.Struct({
      identityKey: Schema.String,
      sessionId: Schema.optional(Schema.String),
    }),
  ),
  /** Graph path of the plank under the pointer; absent while it is over none. */
  plank: Schema.optional(Schema.String),
  x: Schema.optional(Schema.Number),
  y: Schema.optional(Schema.Number),
  /** How the pointer draws; a cursor when absent. */
  style: Schema.optional(Schema.Literals(['cursor', 'laser'])),
});

export type FollowPointer = Schema.Schema.Type<typeof FollowPointer>;

export type Box = { left: number; top: number; width: number; height: number };

export type PlankPosition = { x: number; y: number };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Where a client point sits in a plank's box, as fractions of its width and height. */
export const toPlankPosition = (box: Box, clientX: number, clientY: number): PlankPosition | undefined =>
  box.width > 0 && box.height > 0
    ? { x: clamp((clientX - box.left) / box.width), y: clamp((clientY - box.top) / box.height) }
    : undefined;

/** The client point at a position in a plank's box; the inverse of {@link toPlankPosition}. */
export const fromPlankPosition = (box: Box, { x, y }: PlankPosition): { left: number; top: number } => ({
  left: box.left + clamp(x) * box.width,
  top: box.top + clamp(y) * box.height,
});

/** This session as the judge of whose pointer it draws. */
export type PointerViewer = {
  spaceId: string;
  identityKey: string;
  sessionId: string;
  following?: SpaceSchema.FollowTarget;
  /** The leader session the follow tracks right now; a follow by identity switches as the leader's sessions move. */
  leaderSessionId?: string;
};

const isSameTarget = (a: FollowingTarget | undefined, b: FollowingTarget | undefined) =>
  a !== undefined && b !== undefined && a.identityKey === b.identityKey && a.sessionId === b.sessionId;

/**
 * Whether the viewer shares a follow with the sender of a pointer: the sender is the leader session the viewer's
 * follow tracks, follows the viewer, or follows the same leader as the viewer.
 */
export const sharesFollow = (viewer: PointerViewer, sender: { identityKey: string; pointer: FollowPointer }) => {
  const { identityKey, pointer } = sender;
  if (identityKey === viewer.identityKey && pointer.sessionId === viewer.sessionId) {
    return false;
  }

  const following = viewer.following?.spaceId === viewer.spaceId ? viewer.following : undefined;
  const isLeader =
    following !== undefined &&
    identityKey === following.identityKey &&
    pointer.sessionId === (following.sessionId ?? viewer.leaderSessionId);
  return (
    isLeader ||
    isFollowTargetOf(pointer.following, viewer.identityKey, viewer.sessionId) ||
    isSameTarget(pointer.following, following)
  );
};

/** Whether a session posts its pointer in a space: while it follows someone there, or someone follows it there. */
export const takesPartInFollow = (
  spaceId: string,
  following: SpaceSchema.FollowTarget | undefined,
  followedSpaces: readonly string[],
) => following?.spaceId === spaceId || followedSpaces.includes(spaceId);
