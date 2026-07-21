//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';

import { type StateError } from './errors';
import { StateStore } from './StateStore';
import type * as Type from './types';

/**
 * An event-tap stage: applies `fn` to events matching `tags`, passes EVERY event through unchanged
 * (so downstream stages and the commit sink see the full stream), and isolates failures by
 * recording them on the event's target — a bad stage on one message never aborts the crawl.
 */
export const tapStage = <E, R>(
  name: string,
  tags: ReadonlyArray<Type.EventTag>,
  fn: (event: Type.Event) => Effect.Effect<void, E, R>,
): Stage.Stage<Type.Event, Type.Event, StateError, R | StateStore> =>
  Stage.map(name, (event: Type.Event) =>
    (tags.includes(event._tag) ? fn(event) : Effect.void).pipe(
      Effect.catchAll((error) =>
        Effect.flatMap(StateStore, (store) =>
          store.setStatus(
            event.target.id,
            event.target.status,
            `${name}: ${error instanceof Error ? error.message : String(error)}`,
          ),
        ),
      ),
      Effect.as(event),
    ),
  );
