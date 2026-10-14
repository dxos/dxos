//
// Copyright 2026 DXOS.org
//

import type * as Events from '../workspace/Events.ts';
import type * as Fold from '../workspace/Fold.ts';

/**
 * The turns this client has asked for that the log has not opened yet. A prompt reaches the log
 * only once the server has taken the project's turn gate, so between the click and that echo the
 * fold alone would report the agent idle.
 *
 * Kept by turn id because any other event is the wrong signal: a replayed or another tab's
 * `UserMessage` is not this prompt's echo, and the previous turn's `TurnEnded` says nothing about
 * a turn that has not started.
 */
export type Pending = ReadonlySet<string>;

export const none: Pending = new Set();

/** Records a prompt this client just dispatched. */
export const add = (pending: Pending, turnId: string): Pending => new Set([...pending, turnId]);

/** Drops `turnId`, e.g. when its dispatch was refused and no turn will ever open. */
export const remove = (pending: Pending, turnId: string): Pending => {
  if (!pending.has(turnId)) {
    return pending;
  }
  const next = new Set(pending);
  next.delete(turnId);
  return next;
};

/**
 * Settles a pending turn once the log mentions it. Its `UserMessage` hands it to the fold; a
 * `TurnFailed` also counts, because a turn that fails before recording its message never echoes.
 */
export const settle = (pending: Pending, entry: Events.Entry): Pending => {
  const event = entry.event;
  switch (event._tag) {
    case 'UserMessage':
    case 'TurnEnded':
    case 'TurnFailed':
      return event.turnId === undefined ? pending : remove(pending, event.turnId);
    default:
      return pending;
  }
};

/** Whether the agent is working on anything this client should wait for. */
export const isBusy = (state: Fold.State, pending: Pending): boolean => pending.size > 0 || state.running;
