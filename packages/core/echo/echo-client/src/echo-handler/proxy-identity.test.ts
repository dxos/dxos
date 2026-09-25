//
// Copyright 2026 DXOS.org
//

import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing/index.ts';

/**
 * Entity proxies key the reactive atom families (`Atom.family` resolves through `MutableHashMap`,
 * i.e. `Equal`/`Hash`), and a branch binding mints a fresh proxy over an entity the live object
 * already has one for. Effect compares an unmarked object structurally, which made every such proxy
 * a single family entry: the second binding was handed the first one's atom, whose subscription
 * points at a proxy the caller may already have disposed, and its updates never arrived.
 */
describe('entity proxy identity', () => {
  test('branch bindings and the live object are distinct atom-family keys', async () => {
    const builder = new EchoTestBuilder();
    await builder.open();
    const peer = await builder.createPeer({ types: [TestSchema.Task] });
    const db = await peer.createDatabase();

    const task = db.add(Obj.make(TestSchema.Task, { title: 'hello' }));
    await db.flush();

    await db.createBranch(task.id, 'branch');
    const first = await db.branch(task, 'branch');
    const second = await db.branch(task, 'branch');

    expect(first.object).not.toBe(second.object);
    expect(Equal.equals(first.object, second.object)).toBe(false);
    expect(Equal.equals(task, first.object)).toBe(false);

    const family = Atom.family((object: unknown) => Atom.make(() => object));
    expect(family(first.object)).not.toBe(family(second.object));
    expect(family(task)).not.toBe(family(first.object));

    // Reference equality still holds for the same proxy, so a family lookup is stable per binding.
    expect(Equal.equals(first.object, first.object)).toBe(true);
    expect(Hash.hash(first.object)).toBe(Hash.hash(first.object));
    expect(family(first.object)).toBe(family(first.object));

    first.dispose();
    second.dispose();
    await builder.close();
  });
});
