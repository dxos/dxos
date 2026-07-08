//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { expect } from 'vitest';

import { AgentRegistry } from './AgentRegistry';

const suite = (name: string, layer: Layer.Layer<AgentRegistry>) =>
  describe(name, () => {
    it.effect(
      'resolves by stable id and treats the display name as an alias',
      Effect.fnUntraced(function* () {
        const registry = yield* AgentRegistry;
        const first = yield* registry.observe({
          identifiers: [
            { namespace: 'discord-user', value: '123' },
            { namespace: 'discord-username', value: 'alice' },
          ],
          label: 'Alice',
          at: '2026-06-01T00:00:00.000Z',
        });
        // Same user id, different display name => same canonical agent, count accrues.
        const second = yield* registry.observe({
          identifiers: [{ namespace: 'discord-user', value: '123' }],
          label: 'Alice (renamed)',
          at: '2026-06-02T00:00:00.000Z',
        });

        expect(first.id).toBe('discord-user:123');
        expect(second.id).toBe('discord-user:123');
        expect(second.messageCount).toBe(2);
        expect(second.firstSeen).toBe('2026-06-01T00:00:00.000Z');
        expect(second.lastSeen).toBe('2026-06-02T00:00:00.000Z');
      }, Effect.provide(layer)),
    );

    it.effect(
      'merges two agents under one canonical id (cross-namespace normalization)',
      Effect.fnUntraced(function* () {
        const registry = yield* AgentRegistry;
        const discord = yield* registry.observe({
          identifiers: [{ namespace: 'discord-user', value: '123' }],
          label: 'Alice',
          at: '2026-06-01T00:00:00.000Z',
        });
        const email = yield* registry.observe({
          identifiers: [{ namespace: 'email', value: 'alice@example.com' }],
          label: 'Alice Smith',
          at: '2026-06-03T00:00:00.000Z',
        });
        expect(discord.id).not.toBe(email.id);

        const merged = yield* registry.merge(discord.id, email.id);
        expect(merged.messageCount).toBe(2);
        expect(merged.identifiers.map((identifier) => identifier.namespace).sort()).toEqual(['discord-user', 'email']);

        // The dropped agent's identifiers now resolve (sameAs) to the canonical agent.
        const viaEmail = yield* registry.resolve([{ namespace: 'email', value: 'alice@example.com' }]);
        expect(viaEmail.id).toBe(discord.id);
        const list = yield* registry.list();
        expect(list.length).toBe(1);
      }, Effect.provide(layer)),
    );
  });

describe('AgentRegistry', () => {
  suite('memory', AgentRegistry.layerMemory);
  suite('sql', AgentRegistry.layerSql.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' }).pipe(Layer.orDie))));
});
