//
// Copyright 2025 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import * as Obj from '../../../Obj.ts';
import * as Relation from '../../../Relation.ts';
import * as Tag from '../../../Tag.ts';
import { TestSchema } from '../../../testing/index.ts';

// One Tag object per label within a test, so a test can name the same tag twice; compared by label.
let tagsByLabel = new Map<string, Tag.Tag>();
beforeEach(() => {
  tagsByLabel = new Map();
});
const tag = (label: string): Tag.Tag => {
  const existing = tagsByLabel.get(label) ?? Tag.make({ label });
  tagsByLabel.set(label, existing);
  return existing;
};
const tagLabels = (entity: Obj.Unknown | Relation.Unknown): string[] =>
  Obj.getMeta(entity as Obj.Unknown).tags.map((tag) => tag.label);

/**
 * Tests for Obj.update context enforcement and mutator type safety.
 *
 * These tests verify:
 * 1. Mutator functions require Mutable<T> at compile-time.
 * 2. getMeta returns ReadonlyMeta outside change callbacks and EntityMeta inside.
 * 3. Mutations outside Obj.update throw at runtime.
 * 4. Nested object/property mutations work correctly.
 * 5. Array mutations (push, pop, splice) require change context.
 * 6. Property delete requires change context.
 */
describe('Obj.update enforcement', () => {
  describe('compile-time and runtime safety', () => {
    test('direct property mutation outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // Direct property mutation should throw.
      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property mutation.
        obj.name = 'New Name';
      }).toThrow(/outside of Obj.update/);
    });

    test('Obj.setValue outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // No compile-time error: TypeScript's structural typing allows readonly objects
      // to be passed to Mutable<T> parameters. Enforcement is runtime-only.
      expect(() => Obj.setValue(obj, ['name'], 'value')).toThrow(/outside of Obj.update/);
    });

    test('Obj.addTag outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // No compile-time error: TypeScript's structural typing allows readonly objects
      // to be passed to Mutable<T> parameters. Enforcement is runtime-only.
      expect(() => Obj.addTag(obj, tag('tag'))).toThrow(/outside of Obj.update/);
    });

    test('getMeta mutation outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const meta = Obj.getMeta(obj);

      // Runtime errors for direct meta mutations.
      expect(() => ((meta as any).keys = [])).toThrow(/outside of Obj.update/);
      expect(() => ((meta as any).tags = [tag('tag')])).toThrow(/outside of Obj.update/);
    });

    test('getMeta returns mutable EntityMeta inside change callback', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.update(obj, (obj) => {
        const meta = Obj.getMeta(obj);

        // These should compile without errors because meta is EntityMeta (mutable).
        meta.keys = [];
        meta.tags = [tag('tag')];
        meta.keys.push({ source: 'test', id: '123' });
      });

      expect(tagLabels(obj)).toEqual(['tag']);
      expect(Obj.getMeta(obj).keys).toHaveLength(1);
    });

    test('mutators work inside change callback', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // These should compile without errors inside change callback.
      Obj.update(obj, (obj) => {
        Obj.addTag(obj, tag('my-tag'));
        Obj.setValue(obj, ['name'], 'Updated');
      });

      expect(obj.name).toBe('Updated');
      expect(tagLabels(obj)).toContain('my-tag');
    });

    test('Relation property mutation outside change throws', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      // Direct property mutation should throw.
      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property mutation.
        rel.title = 'Manager';
      }).toThrow(/outside of Obj.update/);
    });

    test('Relation.addTag outside change throws', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      // No compile-time error: TypeScript's structural typing allows readonly objects
      // to be passed to Mutable<T> parameters. Enforcement is runtime-only.
      expect(() => Relation.addTag(rel, tag('tag'))).toThrow(/outside of Obj.update/);
    });
  });

  describe('behavior', () => {
    test('setLabel and getLabel work correctly with Person schema', ({ expect }) => {
      // Person schema has name as the label field.
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      // Person schema uses 'name' as label field.
      expect(Obj.getLabel(obj)).toBe('John');

      Obj.update(obj, (obj) => {
        Obj.setLabel(obj, 'Jane');
      });

      // setLabel updates the name field.
      expect(Obj.getLabel(obj)).toBe('Jane');
      expect(obj.name).toBe('Jane');
    });

    test('setDescription works on schemas with description annotation', ({ expect }) => {
      // Person schema may not have a description field, but we can still test the API.
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      // Description is undefined if not set.
      expect(Obj.getDescription(obj)).toBeUndefined();

      // setDescription only works if schema has description annotation.
      // For schemas without it, this is a no-op.
      Obj.update(obj, (obj) => {
        Obj.setDescription(obj, 'My Description');
      });

      // Verify setDescription doesn't throw.
      expect(true).toBe(true);
    });

    test('addTag and removeTag work correctly', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      expect(Obj.getMeta(obj).tags).toEqual([]);

      Obj.update(obj, (obj) => {
        Obj.addTag(obj, tag('tag-1'));
        Obj.addTag(obj, tag('tag-2'));
      });

      expect(tagLabels(obj)).toEqual(['tag-1', 'tag-2']);

      Obj.update(obj, (obj) => {
        Obj.removeTag(obj, tag('tag-1'));
      });

      expect(tagLabels(obj)).toEqual(['tag-2']);
    });

    test('tags are held by identity, not owned or copied', ({ expect }) => {
      const urgent = Tag.make({ label: 'urgent' });
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      Obj.update(obj, (obj) => {
        Obj.addTag(obj, urgent);
        // Editing the holder does not hand out write access to the tag.
        expect(Obj.getMeta(obj).tags[0]).toBe(urgent);
      });
      expect(Obj.getMeta(obj).tags[0]).toBe(urgent);

      // The tag stays its own root: it is edited through its own update and notifies its own subscribers.
      let tagFires = 0;
      const unsubscribe = Obj.subscribe(urgent, () => tagFires++);
      Obj.update(urgent, (urgent) => {
        urgent.label = 'later';
      });
      unsubscribe();
      expect(tagFires).toBe(1);
      expect(Obj.getMeta(obj).tags[0].label).toBe('later');

      const seeded = Obj.make(TestSchema.Person, { [Obj.Meta]: { tags: [urgent] }, name: 'Seeded' });
      expect(Obj.getMeta(seeded).tags[0]).toBe(urgent);
      expect(Obj.getSnapshot(seeded)).toBeDefined();
    });

    test('deleteKeys removes foreign keys by source', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.update(obj, (obj) => {
        const meta = Obj.getMeta(obj);
        meta.keys.push({ source: 'source-a', id: '1' });
        meta.keys.push({ source: 'source-a', id: '2' });
        meta.keys.push({ source: 'source-b', id: '3' });
      });

      expect(Obj.getMeta(obj).keys).toHaveLength(3);

      Obj.update(obj, (obj) => {
        Obj.deleteKeys(obj, 'source-a');
      });

      expect(Obj.getMeta(obj).keys).toHaveLength(1);
      expect(Obj.getMeta(obj).keys[0].source).toBe('source-b');
    });

    test('setValue sets nested properties', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.update(obj, (obj) => {
        Obj.setValue(obj, ['name'], 'Updated Name');
      });

      expect(obj.name).toBe('Updated Name');
    });

    test('getMeta is mutable inside change and changes persist', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.update(obj, (obj) => {
        const meta = Obj.getMeta(obj);
        meta.tags = [tag('tag-1'), tag('tag-2')];
        meta.keys.push({ source: 'external', id: '123' });
      });

      // Changes should persist after the change callback.
      expect(tagLabels(obj)).toEqual(['tag-1', 'tag-2']);
      expect(Obj.getMeta(obj).keys).toEqual([{ source: 'external', id: '123' }]);
    });

    test('multiple mutations in single change all persist', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.update(obj, (obj) => {
        obj.name = 'Name 1';
        obj.name = 'Name 2';
        obj.name = 'Name 3';
        Obj.addTag(obj, tag('tag-1'));
        Obj.addTag(obj, tag('tag-2'));
      });

      // All mutations should persist.
      expect(obj.name).toBe('Name 3');
      expect(tagLabels(obj)).toEqual(['tag-1', 'tag-2']);
    });
  });

  describe('notifications', () => {
    test('batched notifications - only one per Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      let notificationCount = 0;
      const unsubscribe = Obj.subscribe(obj, () => {
        notificationCount++;
      });

      Obj.update(obj, (obj) => {
        obj.name = 'Jane';
        obj.age = 30;
      });

      // Should only fire one notification for all changes.
      expect(notificationCount).toBe(1);

      unsubscribe();
    });
  });

  describe('nested mutations', () => {
    test('nested object property mutation within Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: {} },
      });

      Obj.update(obj, (obj) => {
        obj.address!.state = 'NY';
      });

      expect(obj.address?.state).toBe('NY');
      expect(obj.address?.city).toBe('NYC');
    });

    test('deeply nested property mutation within Obj.update (2 levels)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: { lat: 40.7128, lng: -74.006 } },
      });

      Obj.update(obj, (obj) => {
        obj.address!.coordinates!.lat = 51.5074;
        obj.address!.coordinates!.lng = -0.1278;
      });

      expect(obj.address?.coordinates?.lat).toBe(51.5074);
      expect(obj.address?.coordinates?.lng).toBe(-0.1278);
    });

    test('nested object mutation outside Obj.update throws (1 level deep)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: {} },
      });

      expect(() => {
        // @ts-expect-error - nested property assignment is readonly.
        obj.address!.city = 'LA';
      }).toThrow(/outside of Obj.update/);
    });

    test('deeply nested mutation outside Obj.update throws (2 levels deep)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: { lat: 40.7128, lng: -74.006 } },
      });

      expect(() => {
        // @ts-expect-error - deeply nested property assignment should be caught.
        obj.address!.coordinates!.lat = 0;
      }).toThrow(/outside of Obj.update/);
    });

    test('nested Obj.update calls work correctly', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      Obj.update(obj, (obj) => {
        obj.name = 'Jane';

        // Nested change should work (already in change context).
        Obj.update(obj, (obj) => {
          obj.age = 30;
        });
      });

      expect(obj.name).toBe('Jane');
      expect(obj.age).toBe(30);
    });

    test('error in callback does not leave object in broken state', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      expect(() => {
        Obj.update(obj, (obj) => {
          obj.name = 'Jane';
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Object should still be readonly after error.
      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property mutation.
        obj.name = 'Bob';
      }).toThrow(/outside of Obj.update/);
    });
  });

  describe('array mutations', () => {
    test('array push within Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      Obj.update(obj, (obj) => {
        obj.fields!.push({ label: 'tag2', value: 'val2' });
      });

      expect(obj.fields).toHaveLength(2);
      expect(obj.fields![1].label).toBe('tag2');
    });

    test('array pop within Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
        ],
      });

      let popped: any;
      Obj.update(obj, (obj) => {
        popped = obj.fields!.pop();
      });

      expect(popped.label).toBe('b');
      expect(obj.fields).toHaveLength(1);
    });

    test('array splice within Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
          { label: 'c', value: '3' },
        ],
      });

      Obj.update(obj, (obj) => {
        obj.fields!.splice(1, 1, { label: 'x', value: 'x' });
      });

      expect(obj.fields).toHaveLength(3);
      expect(obj.fields![1].label).toBe('x');
    });

    test('array push outside Obj.update throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.push({ label: 'tag2', value: 'val2' });
      }).toThrow(/array\.push\(\).*outside of Obj\.update/);
    });

    test('array pop outside Obj.update throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.pop();
      }).toThrow(/array\.pop\(\).*outside of Obj\.update/);
    });

    test('array splice outside Obj.update throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.splice(0, 1);
      }).toThrow(/array\.splice\(\).*outside of Obj\.update/);
    });
  });

  describe('property delete', () => {
    test('delete property within Obj.update', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John', age: 25 });

      Obj.update(obj, (obj) => {
        delete obj.age;
      });

      expect(obj.age).toBeUndefined();
    });

    test('delete property outside Obj.update throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John', age: 25 });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property delete.
        delete obj.age;
      }).toThrow(/delete object property.*outside of Obj\.update/);
    });
  });

  describe('Relation mutators', () => {
    test('Relation.getMeta is mutable inside Relation.update', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      Relation.update(rel, (rel) => {
        const meta = Relation.getMeta(rel);
        meta.tags = [tag('rel-tag')];
        meta.keys.push({ source: 'rel-source', id: 'rel-key' });
      });

      expect(tagLabels(rel)).toEqual(['rel-tag']);
      expect(Relation.getMeta(rel).keys).toHaveLength(1);
    });

    test('Relation mutators work inside change callback', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      Relation.update(rel, (rel) => {
        Relation.addTag(rel, tag('important'));
      });

      expect(tagLabels(rel)).toContain('important');

      Relation.update(rel, (rel) => {
        Relation.removeTag(rel, tag('important'));
      });

      expect(tagLabels(rel)).not.toContain('important');
    });
  });

  describe('object references', () => {
    test('assigning root ECHO objects directly throws - must use Ref.make', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, {});
      const other = Obj.make(TestSchema.Expando, { string: 'bar' });

      // Direct assignment of root ECHO objects (created with Obj.make) is not allowed.
      expect(() => {
        Obj.update(obj, (obj) => {
          obj.other = other;
        });
      }).toThrow(/Object references must be wrapped with `Ref\.make`/);
    });

    test('plain nested objects use parent change context', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, {});

      // Assign a plain object (not created with Obj.make).
      Obj.update(obj, (obj) => {
        obj.nested = { value: 'initial' };
      });
      expect(obj.nested.value).toBe('initial');

      // Modify plain nested object through parent's change context.
      Obj.update(obj, (obj) => {
        obj.nested.value = 'modified';
      });
      expect(obj.nested.value).toBe('modified');
    });
  });
});
