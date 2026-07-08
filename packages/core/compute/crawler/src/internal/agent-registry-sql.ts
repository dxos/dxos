//
// Copyright 2026 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';

import { type AgentRegistryApi, type Identifier, type Observation, type Profile } from '../AgentRegistry';
import { StateError } from '../errors';

/** Create the agent + identifier tables (idempotent). */
export const migrate = (sql: SqlClient.SqlClient) =>
  Effect.gen(function* () {
    yield* sql`CREATE TABLE IF NOT EXISTS agent (
      id TEXT PRIMARY KEY,
      label TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT,
      last_seen TEXT,
      ref TEXT
    )`;
    // kind 'identifier' rows carry a real (namespace, value); kind 'alias' rows map a merged
    // agent id onto its canonical agent (the sameAs record).
    yield* sql`CREATE TABLE IF NOT EXISTS agent_identifier (
      key TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      namespace TEXT,
      value TEXT,
      agent_id TEXT NOT NULL
    )`;
    yield* sql`CREATE INDEX IF NOT EXISTS agent_identifier_agent ON agent_identifier (agent_id)`;
  });

type AgentRow = {
  readonly id: string;
  readonly label: string | null;
  readonly message_count: number;
  readonly first_seen: string | null;
  readonly last_seen: string | null;
  readonly ref: string | null;
};

type IdentifierRow = {
  readonly key: string;
  readonly kind: string;
  readonly namespace: string | null;
  readonly value: string | null;
  readonly agent_id: string;
};

const identifierKey = (identifier: Identifier) => `${identifier.namespace}:${identifier.value}`;

const earliest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a < b ? a : b);
const latest = (a?: string, b?: string) => (a === undefined ? b : b === undefined ? a : a > b ? a : b);

const fail = (message: string) => (cause: unknown) =>
  cause instanceof StateError ? cause : new StateError({ message, cause });

export const makeSql = (sql: SqlClient.SqlClient): AgentRegistryApi => {
  const identifiersOf = (agentId: string) =>
    sql<IdentifierRow>`SELECT * FROM agent_identifier WHERE agent_id = ${agentId} AND kind = 'identifier' ORDER BY rowid ASC`.pipe(
      Effect.map((rows) =>
        rows.flatMap((row) =>
          row.namespace !== null && row.value !== null ? [{ namespace: row.namespace, value: row.value }] : [],
        ),
      ),
    );

  const toProfile = (row: AgentRow) =>
    identifiersOf(row.id).pipe(
      Effect.map(
        (identifiers): Profile => ({
          id: row.id,
          ...(row.label !== null ? { label: row.label } : {}),
          identifiers,
          messageCount: row.message_count,
          ...(row.first_seen !== null ? { firstSeen: row.first_seen } : {}),
          ...(row.last_seen !== null ? { lastSeen: row.last_seen } : {}),
          ...(row.ref !== null ? { ref: row.ref } : {}),
        }),
      ),
    );

  const agentRow = (id: string) =>
    sql<AgentRow>`SELECT * FROM agent WHERE id = ${id}`.pipe(Effect.map((rows) => rows[0]));

  /** Re-read a row that was just written in the same transaction; absence is a store invariant break. */
  const mustAgentRow = (id: string) =>
    agentRow(id).pipe(
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new StateError({ message: `agent row missing after write: ${id}` })),
      ),
    );

  /** Resolve any identifier key or (merged) agent id to the canonical agent id. */
  const canonicalId = (key: string) =>
    sql<IdentifierRow>`SELECT agent_id FROM agent_identifier WHERE key = ${key}`.pipe(
      Effect.map((rows) => rows[0]?.agent_id),
    );

  const findByIdentifiers = (identifiers: readonly Identifier[]) =>
    Effect.gen(function* () {
      for (const identifier of identifiers) {
        const id = yield* canonicalId(identifierKey(identifier));
        if (id !== undefined) {
          return yield* agentRow(id);
        }
      }
      return undefined;
    });

  const insertIdentifiers = (agentId: string, identifiers: readonly Identifier[]) =>
    Effect.forEach(
      identifiers,
      (identifier) =>
        sql`INSERT INTO agent_identifier (key, kind, namespace, value, agent_id)
          VALUES (${identifierKey(identifier)}, 'identifier', ${identifier.namespace}, ${identifier.value}, ${agentId})
          ON CONFLICT(key) DO NOTHING`,
      { discard: true },
    );

  const upsert = (identifiers: readonly Identifier[], label: string | undefined, at?: string, bump = false) =>
    sql.withTransaction(
      Effect.gen(function* () {
        const existing = yield* findByIdentifiers(identifiers);
        if (existing) {
          const nextCount = existing.message_count + (bump ? 1 : 0);
          const firstSeen = bump ? (earliest(existing.first_seen ?? undefined, at) ?? null) : existing.first_seen;
          const lastSeen = bump ? (latest(existing.last_seen ?? undefined, at) ?? null) : existing.last_seen;
          yield* sql`UPDATE agent SET label = COALESCE(label, ${label ?? null}), message_count = ${nextCount},
            first_seen = ${firstSeen}, last_seen = ${lastSeen} WHERE id = ${existing.id}`;
          yield* insertIdentifiers(existing.id, identifiers);
          return yield* toProfile(yield* mustAgentRow(existing.id));
        }

        // Canonical token = the first identifier (stable id chosen by the caller's ordering).
        const id = identifierKey(identifiers[0]);
        yield* sql`INSERT INTO agent (id, label, message_count, first_seen, last_seen)
          VALUES (${id}, ${label ?? null}, ${bump ? 1 : 0}, ${bump ? (at ?? null) : null}, ${bump ? (at ?? null) : null})`;
        yield* insertIdentifiers(id, identifiers);
        return yield* toProfile(yield* mustAgentRow(id));
      }),
    );

  return {
    resolve: (identifiers, label) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'resolve requires at least one identifier' }))
        : upsert(identifiers, label).pipe(Effect.mapError(fail('Failed to resolve agent'))),
    observe: ({ identifiers, label, at }: Observation) =>
      identifiers.length === 0
        ? Effect.fail(new StateError({ message: 'observe requires at least one identifier' }))
        : upsert(identifiers, label, at, true).pipe(Effect.mapError(fail('Failed to observe agent'))),
    get: (id) =>
      Effect.gen(function* () {
        const resolved = (yield* canonicalId(id)) ?? id;
        const row = yield* agentRow(resolved);
        return row ? yield* toProfile(row) : undefined;
      }).pipe(Effect.mapError(fail('Failed to get agent'))),
    list: () =>
      sql<AgentRow>`SELECT * FROM agent ORDER BY message_count DESC`.pipe(
        Effect.flatMap((rows) => Effect.forEach(rows, toProfile)),
        Effect.mapError(fail('Failed to list agents')),
      ),
    merge: (keepId, mergeId) =>
      sql
        .withTransaction(
          Effect.gen(function* () {
            const keep = yield* agentRow(keepId);
            if (keepId === mergeId) {
              if (!keep) {
                return yield* Effect.fail(new StateError({ message: `merge: unknown agent ${keepId}` }));
              }
              return yield* toProfile(keep);
            }
            const drop = yield* agentRow(mergeId);
            if (!keep || !drop) {
              return yield* Effect.fail(
                new StateError({ message: `merge: unknown agent ${!keep ? keepId : mergeId}` }),
              );
            }
            yield* sql`UPDATE agent SET
              label = COALESCE(label, ${drop.label}),
              message_count = message_count + ${drop.message_count},
              first_seen = ${earliest(keep.first_seen ?? undefined, drop.first_seen ?? undefined) ?? null},
              last_seen = ${latest(keep.last_seen ?? undefined, drop.last_seen ?? undefined) ?? null},
              ref = COALESCE(ref, ${drop.ref})
              WHERE id = ${keepId}`;
            // Point the dropped agent's identifiers and its own id (sameAs alias) at the canonical agent.
            // The dropped id usually IS one of its identifier keys — the conflict clause must leave
            // `kind` untouched so that identifier row keeps surfacing in the merged profile.
            yield* sql`UPDATE agent_identifier SET agent_id = ${keepId} WHERE agent_id = ${mergeId}`;
            yield* sql`INSERT INTO agent_identifier (key, kind, agent_id) VALUES (${mergeId}, 'alias', ${keepId})
              ON CONFLICT(key) DO UPDATE SET agent_id = ${keepId}`;
            yield* sql`DELETE FROM agent WHERE id = ${mergeId}`;
            return yield* toProfile(yield* mustAgentRow(keepId));
          }),
        )
        .pipe(Effect.mapError(fail('Failed to merge agents'))),
  };
};
