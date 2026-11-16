//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type EntityFilter, type RDF, type SemanticIndexError, type WindowedFactStoreApi } from '@dxos/pipeline-rdf';

import { type Group, groupFacts, termKey } from '../types.ts';
import {
  type EntityCardModel,
  type EntityTypeCount,
  entityKindOfType,
  entityTypeCounts,
  entityTypeOfKind,
  toEntityCards,
} from './subgraph.ts';

//
// Windowed sources: what a virtualized list asks for as it scrolls. A source answers one window of rows at a time
// (with the total, so the list can size itself), and the details of the rows in view. A store-backed source filters
// and counts in the store; a memory source does the same over an array, so stories and scoped views share the path.
//

/** What a list filters by: a display class and free text. */
export type WindowFilter = {
  readonly type?: string;
  readonly text?: string;
};

export type WindowRequest = WindowFilter & { readonly offset: number; readonly limit: number };

/** One window of rows, how many rows match in all, and (for entities) how many match per class ignoring `type`. */
export type Window<T> = {
  readonly total: number;
  readonly items: readonly T[];
  readonly types?: readonly EntityTypeCount[];
};

export type SourceError = SemanticIndexError | Error;

/** Entities by label: a window gives each row's name and class; `cards` gives what a card states. */
export type EntitySource = {
  readonly window: (request: WindowRequest) => Effect.Effect<Window<EntityCardModel>, SourceError>;
  /** Full cards (properties and inverse) for the entities, in no particular order; unknown ids are left out. */
  readonly cards: (ids: readonly string[]) => Effect.Effect<EntityCardModel[], SourceError>;
};

/** A subject's row before its facts load. */
export type SubjectSummary = { readonly id: string; readonly label: string };

/** Fact subjects by label: a window gives each group's header; `groups` gives each subject's facts. */
export type FactSource = {
  readonly window: (request: WindowRequest) => Effect.Effect<Window<SubjectSummary>, SourceError>;
  /** One group per subject that has facts, keyed by subject id. */
  readonly groups: (ids: readonly string[]) => Effect.Effect<ReadonlyMap<string, Group>, SourceError>;
};

const summary = (card: EntityCardModel): EntityCardModel => ({ ...card, properties: [], inverse: [] });

const matchesText = (text: string | undefined, ...values: (string | undefined)[]): boolean => {
  const needle = text?.trim().toLowerCase();
  return !needle || values.some((value) => value?.toLowerCase().includes(needle));
};

/** Entities held in memory, filtered and windowed as a store would, in the order given. */
export const memoryEntitySource = (cards: readonly EntityCardModel[]): EntitySource => {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return {
    window: ({ offset, limit, type, text }) =>
      Effect.sync(() => {
        const matching = cards.filter((card) => matchesText(text, card.label, card.type));
        const typed = type ? matching.filter((card) => card.type === type) : matching;
        return {
          total: typed.length,
          items: typed.slice(offset, offset + limit).map(summary),
          types: entityTypeCounts(matching),
        };
      }),
    cards: (ids) => Effect.sync(() => ids.flatMap((id) => byId.get(id) ?? [])),
  };
};

/** Statement graphs per entity a card loads: enough to fill it, without the thousands a hub entity takes part in. */
const CARD_GRAPHS = 50;

/** Entities a store lists, windowed and counted in the store; a card's facts load only when it is asked for. */
export const storeEntitySource = (store: WindowedFactStoreApi, filter: EntityFilter = {}): EntitySource => ({
  window: ({ offset, limit, type, text }) => {
    const kind = type === undefined ? undefined : entityKindOfType(type);
    // A class no kind names matches nothing in the store.
    if (type !== undefined && kind === undefined) {
      return Effect.succeed({ total: 0, items: [], types: [] });
    }
    return store.entities({ ...filter, offset, limit, ...(kind ? { kind } : {}), ...(text ? { text } : {}) }).pipe(
      Effect.map((window) => ({
        total: window.total,
        items: window.items.map((item) => ({
          id: item.key,
          label: item.label,
          ...(item.kind ? { type: entityTypeOfKind(item.kind) } : {}),
          properties: [],
          inverse: [],
        })),
        types: window.kinds.map(({ kind, count }) => ({ type: entityTypeOfKind(kind), count })),
      })),
    );
  },
  cards: (ids) =>
    ids.length === 0
      ? Effect.succeed([])
      : store.entityFacts({ ...filter, keys: ids, limit: CARD_GRAPHS }).pipe(
          Effect.map((facts) => {
            const wanted = new Set(ids);
            return toEntityCards(facts, { objects: true }).filter((card) => wanted.has(card.id));
          }),
        ),
});

/**
 * The entities `ids` names, in that order, for a column a choice opened. Without a filter a window loads only its own
 * cards; a filter needs every card's name and class, so the column's cards load once and filter in memory.
 */
export const idsEntitySource = (source: EntitySource, ids: readonly string[]): EntitySource => {
  let loaded: EntitySource | undefined;
  const loadAll = (): Effect.Effect<EntitySource, SourceError> =>
    loaded
      ? Effect.succeed(loaded)
      : source.cards(ids).pipe(
          Effect.map((cards) => {
            const byId = new Map(cards.map((card) => [card.id, card]));
            return memoryEntitySource(ids.flatMap((id) => byId.get(id) ?? []));
          }),
          Effect.tap((result) =>
            Effect.sync(() => {
              loaded = result;
            }),
          ),
        );
  return {
    window: (request) =>
      request.type || request.text?.trim()
        ? loadAll().pipe(Effect.flatMap((loaded) => loaded.window(request)))
        : source.cards(ids.slice(request.offset, request.offset + request.limit)).pipe(
            Effect.map((cards) => {
              const byId = new Map(cards.map((card) => [card.id, card]));
              return {
                total: ids.length,
                items: ids.slice(request.offset, request.offset + request.limit).flatMap((id) => {
                  const card = byId.get(id);
                  return card ? [summary(card)] : [];
                }),
                types: entityTypeCounts(cards),
              };
            }),
          ),
    cards: source.cards,
  };
};

/** Facts held in memory, grouped by subject in the order they arrived, filtered and windowed as a store would. */
export const memoryFactSource = (facts: readonly RDF.Fact[]): FactSource => {
  const all = groupFacts([...facts], '');
  const byId = new Map(all.map((group) => [termKey(group.facts[0].assertion.subject), group]));
  // First-seen order, as the facts arrived.
  const sorted = [...byId];
  return {
    window: ({ offset, limit, text }) =>
      Effect.sync(() => {
        const matching = sorted.filter(([id, group]) => matchesText(text, id, group.subject));
        return {
          total: matching.length,
          items: matching.slice(offset, offset + limit).map(([id, group]) => ({ id, label: group.subject })),
        };
      }),
    groups: (ids) =>
      Effect.sync(
        () =>
          new Map(
            ids.flatMap((id): [string, Group][] => {
              const group = byId.get(id);
              return group ? [[id, group]] : [];
            }),
          ),
      ),
  };
};

/** Facts a store holds, grouped by subject: subjects window and count in the store, each group's facts load in view. */
export const storeFactSource = (store: WindowedFactStoreApi, filter: Omit<EntityFilter, 'role'> = {}): FactSource => ({
  window: ({ offset, limit, text }) =>
    store.entities({ ...filter, role: 'subject', offset, limit, ...(text ? { text } : {}) }).pipe(
      Effect.map((window) => ({
        total: window.total,
        items: window.items.map((item) => ({ id: item.key, label: item.label })),
      })),
    ),
  groups: (ids) =>
    ids.length === 0
      ? Effect.succeed(new Map())
      : store.entityFacts({ ...filter, role: 'subject', keys: ids, limit: CARD_GRAPHS }).pipe(
          Effect.map((facts) => {
            const groups = groupFacts(facts, '');
            return new Map(groups.map((group) => [termKey(group.facts[0].assertion.subject), group]));
          }),
        ),
});
