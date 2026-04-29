//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';

import { TRELLO_SOURCE } from '../constants';
import { type TrelloBoard } from '../services/trello-api';
import { findOrCreateKanbanForBoard } from './find-or-create-kanban';

describe('findOrCreateKanbanForBoard', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([Kanban.Kanban, Expando.Expando]);
    return { db };
  };

  const board = (id: string, name = 'My Board'): TrelloBoard => ({
    id,
    name,
    closed: false,
    url: `https://trello.com/b/${id}`,
    shortUrl: `https://trello.com/b/${id}`,
    dateLastActivity: '2026-04-29T00:00:00Z',
  });

  test('creates a new kind:items Kanban with the foreign key on first call', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const kanban = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1', 'Board One'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(kanban.spec.kind).toBe('items');
    expect(kanban.name).toBe('Board One');
    if (kanban.spec.kind === 'items') {
      expect(kanban.spec.pivotField).toBe('listName');
      expect(kanban.spec.items).toEqual([]);
    }
    expect(Obj.getMeta(kanban).keys.find((k) => k.source === TRELLO_SOURCE)?.id).toBe('board1');
  });

  test('returns the existing Kanban on subsequent calls (idempotent)', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const first = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    const second = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('board1'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(Obj.getDXN(first).toString()).toBe(Obj.getDXN(second).toString());
  });

  test('creates distinct Kanbans for distinct boards', async ({ expect }) => {
    const { db } = await setup();
    const testLayer = Database.layer(db);

    const a = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('boardA', 'A'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    const b = await Effect.gen(function* () {
      return yield* findOrCreateKanbanForBoard(board('boardB', 'B'));
    }).pipe(Effect.provide(testLayer), runAndForwardErrors);

    expect(Obj.getDXN(a).toString()).not.toBe(Obj.getDXN(b).toString());
    expect(a.name).toBe('A');
    expect(b.name).toBe('B');
  });
});
