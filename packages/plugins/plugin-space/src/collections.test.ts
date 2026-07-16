//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Collection, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Text } from '@dxos/schema';

import { SpacePlugin } from '#plugin';

// Headless coverage for the flows exercised by `composer-app/src/playwright/collections.spec.ts`
// and the collection parts of `basic.spec.ts`. Those Playwright tests drive the navtree UI; here we
// exercise the same data flows directly against a real ECHO space obtained from the composer test
// harness. The delete/undo cases mirror `SpaceOperation.RemoveObjects` / `RestoreObjects` semantics
// (splice the ref out of the parent collection + `db.remove`, then re-add) without the layout side
// effects those operations perform, which require the browser-only deck plugin.

const setup = async () => {
  const harness = await createComposerTestApp({ plugins: [ClientPlugin({}), SpacePlugin({})] });
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return { harness, db: personalSpace.db };
};

const objectIds = (collection: Collection.Collection): (string | undefined)[] =>
  collection.objects.map((ref) => ref.target?.id);

describe('collections', () => {
  test('create a collection and add an object to it', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    // Playwright: `create collection` — a Collection object rendered in the tree.
    const collection = db.add(Collection.make({ name: 'New collection' }));
    expect(Collection.isCollection(collection)).toBe(true);
    expect(collection.name).toBe('New collection');
    expect(collection.objects.length).toBe(0);

    // Playwright basic.spec: `create document` — documents are collection items.
    const document = db.add(Text.make({ content: 'hello' }));
    Obj.update(collection, (collection) => {
      collection.objects.push(Ref.make(document));
    });
    expect(collection.objects.length).toBe(1);
    expect(collection.objects[0].target?.id).toBe(document.id);
  });

  test('re-order sibling collections', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const root = db.add(Collection.make({ name: 'Root' }));
    const first = db.add(Collection.make({ name: 'Collection 1' }));
    const second = db.add(Collection.make({ name: 'Collection 2' }));
    Obj.update(root, (root) => {
      root.objects.push(Ref.make(first), Ref.make(second));
    });
    expect(objectIds(root)).toEqual([first.id, second.id]);

    // Playwright `re-order collections`: dragging Collection 2 above Collection 1 reverses order.
    Obj.update(root, (root) => {
      const [moved] = root.objects.splice(1, 1);
      root.objects.splice(0, 0, moved);
    });
    expect(objectIds(root)).toEqual([second.id, first.id]);
  });

  test('nest one collection inside another', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const root = db.add(Collection.make({ name: 'Root' }));
    const outer = db.add(Collection.make({ name: 'Collection 2' }));
    const inner = db.add(Collection.make({ name: 'Collection 1' }));
    Obj.update(root, (root) => {
      root.objects.push(Ref.make(outer), Ref.make(inner));
    });

    // Playwright `drag object into collection`: move `inner` out of root and into `outer`.
    Obj.update(root, (root) => {
      const index = root.objects.findIndex((ref) => ref.target === inner);
      root.objects.splice(index, 1);
    });
    Obj.update(outer, (outer) => {
      outer.objects.push(Ref.make(inner));
    });

    expect(objectIds(root)).toEqual([outer.id]);
    expect(objectIds(outer)).toEqual([inner.id]);
  });

  test('deleting a collection removes it and its contents from the tree', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const root = db.add(Collection.make({ name: 'Root' }));
    const parent = db.add(Collection.make({ name: 'Collection' }));
    const child = db.add(Text.make({ content: 'nested' }));
    Obj.update(parent, (parent) => {
      parent.objects.push(Ref.make(child));
    });
    Obj.update(root, (root) => {
      root.objects.push(Ref.make(parent));
    });
    expect(objectIds(root)).toEqual([parent.id]);

    // Playwright `delete a collection`: deleting the containing collection leaves the tree empty —
    // the child is no longer reachable from the root once its parent is gone.
    Obj.update(root, (root) => {
      const index = root.objects.findIndex((ref) => ref.target === parent);
      root.objects.splice(index, 1);
    });
    db.remove(parent);
    expect(root.objects.length).toBe(0);
    expect(Obj.isDeleted(parent)).toBe(true);
  });

  test('undo restores a deleted collection and its contents', async ({ expect }) => {
    const { harness, db } = await setup();
    await using _harness = harness;

    const root = db.add(Collection.make({ name: 'Root' }));
    const parent = db.add(Collection.make({ name: 'Collection' }));
    const child = db.add(Collection.make({ name: 'Child' }));
    const grandchild = db.add(Text.make({ content: 'leaf' }));
    Obj.update(child, (child) => {
      child.objects.push(Ref.make(grandchild));
    });
    Obj.update(parent, (parent) => {
      parent.objects.push(Ref.make(child));
    });
    Obj.update(root, (root) => {
      root.objects.push(Ref.make(parent));
    });

    // Remove (capturing the index for restore, exactly like RemoveObjects → RestoreObjects).
    const index = root.objects.findIndex((ref) => ref.target === parent);
    Obj.update(root, (root) => {
      root.objects.splice(index, 1);
    });
    db.remove(parent);
    expect(root.objects.length).toBe(0);

    // Playwright `deletion undo restores collection`: undo re-adds the object at its old index and
    // the full subtree (parent → child → grandchild) is reachable again.
    const restored = db.add(parent);
    Obj.update(root, (root) => {
      root.objects.splice(index, 0, Ref.make(restored));
    });
    expect(objectIds(root)).toEqual([parent.id]);
    expect(objectIds(parent)).toEqual([child.id]);
    expect(objectIds(child)).toEqual([grandchild.id]);
  });
});
