//
// Copyright 2026 DXOS.org
//

import * as Result from 'effect/Result';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { log } from '@dxos/log';

import * as DeckSchema from '../types/DeckSchema';

/**
 * Superset of the current on-disk deck shape that additionally tolerates fields absent from the current
 * deck schema, so a pre-migration blob decodes without error and its legacy fields can be detected and
 * stripped. Tolerating is not migrating: only the fields listed in `hasLegacyFields` trigger a rewrite.
 * A blob whose deck shape simply predates the current one is left alone and dropped by the KVS decode,
 * which falls back to the default deck.
 */
const LegacyDeckState = Schema.Struct({
  active: Schema.mutable(Schema.Array(Schema.String)),
  inactive: Schema.mutable(Schema.Array(Schema.String)),
  plankSizing: Schema.mutable(DeckSchema.PlankSizing),
  companionPlanks: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  companionOpen: Schema.optional(Schema.Boolean),
  tilingSizing: Schema.optional(Schema.Number),
  companionFrameSizing: Schema.optional(Schema.mutable(DeckSchema.PlankSizing)),
  solo: Schema.optional(Schema.String),
  initialized: Schema.optional(Schema.Boolean),
  fullscreen: Schema.optional(Schema.Boolean),
  companionOrientation: Schema.optional(Schema.Literals(['horizontal', 'vertical'])),
}).mapFields(Struct.map(Schema.mutableKey));
type LegacyDeckState = Schema.Schema.Type<typeof LegacyDeckState>;

const LegacyStoredDeckState = Schema.Struct({
  sidebarState: Schema.Literals(['closed', 'collapsed', 'expanded']),
  complementarySidebarState: Schema.Literals(['closed', 'collapsed', 'expanded']),
  complementarySidebarPanel: Schema.optional(Schema.String),
  activeDeck: Schema.String,
  previousDeck: Schema.String,
  decks: Schema.mutable(Schema.Record(Schema.String, Schema.mutable(LegacyDeckState))),
  previousMode: Schema.optional(Schema.mutable(Schema.Record(Schema.String, Schema.Any))),
}).mapFields(Struct.map(Schema.mutableKey));
type LegacyStoredDeckState = Schema.Schema.Type<typeof LegacyStoredDeckState>;

const decodeLegacyState = Schema.decodeUnknownResult(LegacyStoredDeckState);

/** Whether any field absent from the current deck schema is still present. */
const hasLegacyFields = (state: LegacyStoredDeckState): boolean =>
  state.previousMode !== undefined ||
  Object.values(state.decks).some(
    (deck) =>
      deck.solo !== undefined ||
      deck.initialized !== undefined ||
      deck.fullscreen !== undefined ||
      deck.companionOrientation !== undefined,
  );

/** Strips fields absent from the current deck schema from a legacy deck, promoting a solo plank to the front of `active`. */
const migrateDeck = ({
  solo,
  initialized: _initialized,
  fullscreen: _fullscreen,
  companionOrientation: _companionOrientation,
  companionFrameSizing: _companionFrameSizing,
  companionOpen: _companionOpen,
  tilingSizing: _tilingSizing,
  ...deck
}: LegacyDeckState) => ({
  ...deck,
  active: solo ? [solo, ...deck.active.filter((id) => id !== solo)] : deck.active,
});

/** The subset of the `Storage` interface the migration needs, so tests can inject a fake. */
export type PersistedStateStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Migrates a legacy (pre single-mode-deck) persisted deck blob in `localStorage` in place, before
 * the KVS atom's Effect Schema decode gets a chance to silently strip the removed fields — which
 * would otherwise drop a user's open plank with no error to signal why (see the design spec's
 * "Persisted-state migration" section). No-ops outside the browser (no `localStorage`), when there
 * is nothing stored yet, or when the stored blob is already in the new shape. Corrupt/undecodable
 * JSON is removed, matching the KVS store's own corrupt-data fallback.
 */
export const migratePersistedState = (
  key: string,
  storage: PersistedStateStorage | undefined = typeof localStorage === 'undefined' ? undefined : localStorage,
): void => {
  if (!storage) {
    return;
  }

  const raw = storage.getItem(key);
  if (raw === null) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return;
  }

  const decoded = decodeLegacyState(parsed);
  if (Result.isFailure(decoded)) {
    log.warn('failed to decode persisted deck state; removing', { key, error: decoded.left.message });
    storage.removeItem(key);
    return;
  }

  const state = decoded.right;
  if (!hasLegacyFields(state)) {
    return;
  }

  const { previousMode: _previousMode, decks, ...rest } = state;
  const migrated = {
    ...rest,
    decks: Object.fromEntries(Object.entries(decks).map(([id, deck]) => [id, migrateDeck(deck)])),
  };
  storage.setItem(key, JSON.stringify(migrated));
};
