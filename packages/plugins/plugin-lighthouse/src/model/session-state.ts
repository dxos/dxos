//
// Copyright 2026 DXOS.org
//

import { type SessionSnapshot, type SessionUpdate } from '../client/types.ts';

/** A session's state as its stream builds it, plus whether the stream is connected. */
export type SessionState = SessionSnapshot & { connected: boolean };

export const emptySessionState = (): SessionState => ({
  events: [],
  results: [],
  rating: { feedback: {} },
  connected: false,
});

/** Applies one stream update; events are appended once each, in seq order, whatever the order they arrive in. */
export const applyUpdate = (state: SessionState, update: SessionUpdate): SessionState => {
  switch (update.type) {
    case 'snapshot': {
      const events = [...update.snapshot.events].sort((a, b) => a.seq - b.seq);
      return { ...state, ...update.snapshot, events, lastSeq: events.at(-1)?.seq ?? state.lastSeq };
    }
    case 'events': {
      const seen = new Set(state.events.map((event) => event.seq));
      const fresh = update.events.filter((event) => !seen.has(event.seq));
      if (fresh.length === 0) {
        return state;
      }
      const events = [...state.events, ...fresh].sort((a, b) => a.seq - b.seq);
      return { ...state, events, lastSeq: events.at(-1)?.seq };
    }
    case 'results':
      return { ...state, results: update.results };
    case 'rating':
      return { ...state, rating: update.rating };
    case 'session':
      return { ...state, session: update.session };
    case 'connection':
      return state.connected === update.connected ? state : { ...state, connected: update.connected };
  }
};

/** The vote as the person just cast it, ahead of the stream's next rating event. */
export const applyVote = (state: SessionState, id: string, vote: 'up' | 'down' | 'clear'): SessionState => {
  const feedback = { ...state.rating.feedback };
  if (vote === 'clear') {
    delete feedback[id];
  } else {
    feedback[id] = vote;
  }
  return { ...state, rating: { ...state.rating, feedback } };
};

/** The vote a click casts: the same thumb again clears it. */
export const nextVote = (current: 'up' | 'down' | undefined, clicked: 'up' | 'down'): 'up' | 'down' | 'clear' =>
  current === clicked ? 'clear' : clicked;
