//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { EchoTestBuilder } from '../testing';
import { createBranch, getCurrentBranch, switchBranch } from './branching';

describe('branch bindings (per-surface)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase();
    const child = db.add(Obj.make(TestSchema.Expando, { content: 'child-v0' }));
    const root = db.add(Obj.make(TestSchema.Expando, { title: 'root-v0', child: Ref.make(child) }));
    await db.flush();
    return { db, root: root as any, child: child as any };
  };

  test('a binding reads and writes the branch while the device stays on main', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');

    const binding = await db.branch(root, 'b1');
    try {
      // The binding starts at the fork content; the device selection is untouched.
      expect((binding.object as any).title).toBe('root-v0');
      expect(getCurrentBranch(root)).toBe('main');

      // Writes land on the branch doc only.
      Obj.update(binding.object, (obj: any) => {
        obj.title = 'root-b1';
      });
      await db.flush();
      expect((binding.object as any).title).toBe('root-b1');
      expect(root.title).toBe('root-v0');
      expect(getCurrentBranch(root)).toBe('main');
    } finally {
      binding.dispose();
    }
  });

  test('multiple bindings to different branches of the same object coexist', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');
    await createBranch(root, 'b2');

    const binding1 = await db.branch(root, 'b1');
    const binding2 = await db.branch(root, 'b2');
    try {
      Obj.update(binding1.object, (obj: any) => {
        obj.title = 'root-b1';
      });
      Obj.update(binding2.object, (obj: any) => {
        obj.title = 'root-b2';
      });
      await db.flush();

      expect((binding1.object as any).title).toBe('root-b1');
      expect((binding2.object as any).title).toBe('root-b2');
      expect(root.title).toBe('root-v0');
    } finally {
      binding1.dispose();
      binding2.dispose();
    }
  });

  test("binding to 'main' returns the canonical live object", async () => {
    const { db, root } = await setup();
    const binding = await db.branch(root, 'main');
    expect(binding.object).toBe(root);
    expect(binding.branch).toBe('main');
    binding.dispose();
  });

  test('a binding is independent of the device-global branch switch', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');
    await createBranch(root, 'b2');

    const binding = await db.branch(root, 'b2');
    try {
      // Switch the device to b1; the binding keeps reading/writing b2.
      await switchBranch(root, 'b1');
      Obj.update(root, (root: any) => {
        root.title = 'root-b1';
      });
      Obj.update(binding.object, (obj: any) => {
        obj.title = 'root-b2';
      });
      await db.flush();

      expect(root.title).toBe('root-b1');
      expect((binding.object as any).title).toBe('root-b2');
      expect(getCurrentBranch(root)).toBe('b1');

      // Back on main, neither branch's edit is visible.
      await switchBranch(root, 'main');
      expect(root.title).toBe('root-v0');
      expect((binding.object as any).title).toBe('root-b2');
    } finally {
      binding.dispose();
    }
  });

  test('a bound subtree member edits the branch content of the child', async () => {
    const { db, root, child } = await setup();
    await createBranch(root, 'b1');

    // Bind the CHILD (a subtree member) to the branch directly.
    const binding = await db.branch(child, 'b1');
    try {
      Obj.update(binding.object, (obj: any) => {
        obj.content = 'child-b1';
      });
      await db.flush();
      expect(child.content).toBe('child-v0');

      // The device-global switch sees the binding's edit (same branch doc).
      await switchBranch(root, 'b1');
      expect(child.content).toBe('child-b1');
    } finally {
      binding.dispose();
    }
  });

  test('dispose stops update notifications for the binding', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');

    const binding = await db.branch(root, 'b1');
    const writer = await db.branch(root, 'b1');

    let updates = 0;
    const unsubscribe = Obj.subscribe(binding.object, () => {
      updates++;
    });

    // A write through a second binding to the same branch notifies the first binding.
    Obj.update(writer.object, (obj: any) => {
      obj.title = 'first';
    });
    await db.flush();
    expect(updates).toBeGreaterThan(0);
    const seen = updates;

    binding.dispose();
    Obj.update(writer.object, (obj: any) => {
      obj.title = 'second';
    });
    await db.flush();
    expect(updates).toBe(seen);

    unsubscribe();
    writer.dispose();
  });

  test('bindings never touch the persisted device selection', async () => {
    const { db, root } = await setup();
    await createBranch(root, 'b1');

    const binding = await db.branch(root, 'b1');
    Obj.update(binding.object, (obj: any) => {
      obj.title = 'root-b1';
    });
    await db.flush();
    binding.dispose();

    // The device selection (and hence what a reload would restore) stays main.
    expect(db.getCurrentBranch(root.id)).toBe('main');
  });
});
