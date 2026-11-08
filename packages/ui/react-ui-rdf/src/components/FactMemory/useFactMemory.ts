//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useMemo, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { type FactAnalytics, type RDF } from '@dxos/pipeline-rdf';

//
// What a fact store already knows about the entities in a message it has never seen. The claim under test is that
// facts are memory for incoming mail: if the store cannot say anything useful about a new message's entities, the
// layer is not earning its cost (`stories-brain/ROADMAP.md` B5).
//

/** Prior facts loaded per entity; enough to read, far short of a whole-store query. */
export const FACTS_PER_ENTITY = 6;

/** An entity a message mentions, as the message names it. */
export type MentionedEntity = {
  readonly key: string;
  readonly label: string;
};

/** A message the store has not been written from: what it says, and who and what it is about. */
export type MessagePreview = {
  readonly from: string;
  readonly receivedAt: string;
  readonly body: string;
  readonly entities: ReadonlyArray<MentionedEntity>;
  /** The facts an extraction found in it — the answer key, shown only when asked for. */
  readonly facts?: ReadonlyArray<RDF.Fact>;
};

export type EntityMemory = {
  readonly key: string;
  readonly label: string;
  /** Prior statements about the entity across the whole store. */
  readonly total: number;
  /** The most recent of them, newest first. */
  readonly facts: RDF.Fact[];
};

export type FactMemory = {
  readonly entities: EntityMemory[];
  /** Entities the store has seen before — the context it can supply for this message. */
  readonly known: EntityMemory[];
  /** Entities new to the store; nothing it holds contextualizes these. */
  readonly unknown: EntityMemory[];
  readonly pending: boolean;
  readonly error?: string;
};

const EMPTY: FactMemory = { entities: [], known: [], unknown: [], pending: true };

const byRecency = (left: RDF.Fact, right: RDF.Fact) =>
  Date.parse(right.attribution.generatedAtTime) - Date.parse(left.attribution.generatedAtTime);

const load = (analytics: FactAnalytics, entities: ReadonlyArray<MentionedEntity>) =>
  Effect.gen(function* () {
    const loaded = yield* Effect.all(
      entities.map(({ key, label }) =>
        Effect.all([analytics.count({ entity: key }), analytics.facts({ entity: key, limit: FACTS_PER_ENTITY })]).pipe(
          Effect.map(([total, facts]): EntityMemory => ({ key, label, total, facts: facts.slice().sort(byRecency) })),
        ),
      ),
    );
    return {
      entities: loaded,
      known: loaded.filter((entity) => entity.total > 0),
      unknown: loaded.filter((entity) => entity.total === 0),
      pending: false,
    } satisfies FactMemory;
  });

/**
 * What the store knows about each entity a message mentions. One bounded read per entity, so the cost is the size
 * of the message rather than the size of the store.
 */
export const useFactMemory = (analytics: FactAnalytics, entities: ReadonlyArray<MentionedEntity>): FactMemory => {
  const [memory, setMemory] = useState<FactMemory>(EMPTY);
  // The entity list is rebuilt on every render upstream; key the read on its contents, not its identity.
  const signature = useMemo(() => entities.map((entity) => entity.key).join('\u0001'), [entities]);

  useEffect(() => {
    let cancelled = false;
    setMemory((current) => ({ ...current, pending: true }));
    void EffectEx.runPromise(
      load(analytics, entities).pipe(
        Effect.catch((error) => Effect.succeed({ ...EMPTY, pending: false, error: error.message })),
      ),
    ).then((next) => {
      if (!cancelled) {
        setMemory(next);
      }
    });
    return () => {
      cancelled = true;
    };
    // `entities` is covered by `signature`; depending on the array itself would reload on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics, signature]);

  return memory;
};
