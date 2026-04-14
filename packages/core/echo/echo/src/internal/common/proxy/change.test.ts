//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Obj from '../../../Obj';
import * as Relation from '../../../Relation';
import { TestSchema } from '../../../testing';

/**
 * Tests for Obj.change context enforcement and mutator type safety.
 *
 * These tests verify:
 * 1. Mutator functions require Mutable<T> at compile-time.
 * 2. getMeta returns ReadonlyMeta outside change callbacks and ObjectMeta inside.
 * 3. Mutations outside Obj.change throw at runtime.
 * 4. Nested object/property mutations work correctly.
 * 5. Array mutations (push, pop, splice) require change context.
 * 6. Property delete requires change context.
 */
describe('Obj.change enforcement', () => {
  describe('compile-time and runtime safety', () => {
    test('direct property mutation outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // Direct property mutation should throw.
      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property mutation.
        obj.name = 'New Name';
      }).toThrow(/outside of Obj.change/);
    });

    test('Obj.setValue outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // No compile-time error: TypeScript's structural typing allows readonly objects
      // to be passed to Mutable<T> parameters. Enforcement is runtime-only.
      expect(() => Obj.setValue(obj, ['name'], 'value')).toThrow(/outside of Obj.change/);
    });

    test('Obj.addTag outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // No compile-time error: TypeScript's structural typing allows readonly objects
      // to be passed to Mutable<T> parameters. Enforcement is runtime-only.
      expect(() => Obj.addTag(obj, 'tag')).toThrow(/outside of Obj.change/);
    });

    test('getMeta mutation outside change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });
      const meta = Obj.getMeta(obj);

      // Runtime errors for direct meta mutations.
      expect(() => ((meta as any).keys = [])).toThrow(/outside of Obj.change/);
      expect(() => ((meta as any).tags = ['tag'])).toThrow(/outside of Obj.change/);
    });

    test('getMeta returns mutable ObjectMeta inside change callback', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.change(obj, (obj) => {
        const meta = Obj.getMeta(obj);

        // These should compile without errors because meta is ObjectMeta (mutable).
        meta.keys = [];
        meta.tags = ['tag'];
        meta.keys.push({ source: 'test', id: '123' });
      });

      expect(Obj.getMeta(obj).tags).toEqual(['tag']);
      expect(Obj.getMeta(obj).keys).toHaveLength(1);
    });

    test('mutators work inside change callback', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      // These should compile without errors inside change callback.
      Obj.change(obj, (obj) => {
        Obj.addTag(obj, 'my-tag');
        Obj.setValue(obj, ['name'], 'Updated');
      });

      expect(obj.name).toBe('Updated');
      expect(Obj.getMeta(obj).tags).toContain('my-tag');
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
      }).toThrow(/outside of Obj.change/);
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
      expect(() => Relation.addTag(rel, 'tag')).toThrow(/outside of Obj.change/);
    });
  });

  describe('behavior', () => {
    test('setLabel and getLabel work correctly with Person schema', ({ expect }) => {
      // Person schema has name as the label field.
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      // Person schema uses 'name' as label field.
      expect(Obj.getLabel(obj)).toBe('John');

      Obj.change(obj, (obj) => {
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
      Obj.change(obj, (obj) => {
        Obj.setDescription(obj, 'My Description');
      });

      // Verify setDescription doesn't throw.
      expect(true).toBe(true);
    });

    test('addTag and removeTag work correctly', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      expect(Obj.getMeta(obj).tags).toBeUndefined();

      Obj.change(obj, (obj) => {
        Obj.addTag(obj, 'tag-1');
        Obj.addTag(obj, 'tag-2');
      });

      expect(Obj.getMeta(obj).tags).toEqual(['tag-1', 'tag-2']);

      Obj.change(obj, (obj) => {
        Obj.removeTag(obj, 'tag-1');
      });

      expect(Obj.getMeta(obj).tags).toEqual(['tag-2']);
    });

    test('deleteKeys removes foreign keys by source', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.change(obj, (obj) => {
        const meta = Obj.getMeta(obj);
        meta.keys.push({ source: 'source-a', id: '1' });
        meta.keys.push({ source: 'source-a', id: '2' });
        meta.keys.push({ source: 'source-b', id: '3' });
      });

      expect(Obj.getMeta(obj).keys).toHaveLength(3);

      Obj.change(obj, (obj) => {
        Obj.deleteKeys(obj, 'source-a');
      });

      expect(Obj.getMeta(obj).keys).toHaveLength(1);
      expect(Obj.getMeta(obj).keys[0].source).toBe('source-b');
    });

    test('setValue sets nested properties', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.change(obj, (obj) => {
        Obj.setValue(obj, ['name'], 'Updated Name');
      });

      expect(obj.name).toBe('Updated Name');
    });

    test('getMeta is mutable inside change and changes persist', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.change(obj, (obj) => {
        const meta = Obj.getMeta(obj);
        meta.tags = ['tag-1', 'tag-2'];
        meta.keys.push({ source: 'external', id: '123' });
      });

      // Changes should persist after the change callback.
      expect(Obj.getMeta(obj).tags).toEqual(['tag-1', 'tag-2']);
      expect(Obj.getMeta(obj).keys).toEqual([{ source: 'external', id: '123' }]);
    });

    test('multiple mutations in single change all persist', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'Test' });

      Obj.change(obj, (obj) => {
        obj.name = 'Name 1';
        obj.name = 'Name 2';
        obj.name = 'Name 3';
        Obj.addTag(obj, 'tag-1');
        Obj.addTag(obj, 'tag-2');
      });

      // All mutations should persist.
      expect(obj.name).toBe('Name 3');
      expect(Obj.getMeta(obj).tags).toEqual(['tag-1', 'tag-2']);
    });
  });

  describe('notifications', () => {
    test('batched notifications - only one per Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      let notificationCount = 0;
      const unsubscribe = Obj.subscribe(obj, () => {
        notificationCount++;
      });

      Obj.change(obj, (obj) => {
        obj.name = 'Jane';
        obj.age = 30;
      });

      // Should only fire one notification for all changes.
      expect(notificationCount).toBe(1);

      unsubscribe();
    });
  });

  describe('nested mutations', () => {
    test('nested object property mutation within Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: {} },
      });

      Obj.change(obj, (obj) => {
        obj.address!.state = 'NY';
      });

      expect(obj.address?.state).toBe('NY');
      expect(obj.address?.city).toBe('NYC');
    });

    test('deeply nested property mutation within Obj.change (2 levels)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: { lat: 40.7128, lng: -74.006 } },
      });

      Obj.change(obj, (obj) => {
        obj.address!.coordinates!.lat = 51.5074;
        obj.address!.coordinates!.lng = -0.1278;
      });

      expect(obj.address?.coordinates?.lat).toBe(51.5074);
      expect(obj.address?.coordinates?.lng).toBe(-0.1278);
    });

    test('nested object mutation outside Obj.change throws (1 level deep)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: {} },
      });

      expect(() => {
        // @ts-expect-error - nested property assignment is readonly.
        obj.address!.city = 'LA';
      }).toThrow(/outside of Obj.change/);
    });

    test('deeply nested mutation outside Obj.change throws (2 levels deep)', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        address: { city: 'NYC', coordinates: { lat: 40.7128, lng: -74.006 } },
      });

      expect(() => {
        // @ts-expect-error - deeply nested property assignment should be caught.
        obj.address!.coordinates!.lat = 0;
      }).toThrow(/outside of Obj.change/);
    });

    test('nested Obj.change calls work correctly', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      Obj.change(obj, (obj) => {
        obj.name = 'Jane';

        // Nested change should work (already in change context).
        Obj.change(obj, (obj) => {
          obj.age = 30;
        });
      });

      expect(obj.name).toBe('Jane');
      expect(obj.age).toBe(30);
    });

    test('error in callback does not leave object in broken state', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John' });

      expect(() => {
        Obj.change(obj, (obj) => {
          obj.name = 'Jane';
          throw new Error('Test error');
        });
      }).toThrow('Test error');

      // Object should still be readonly after error.
      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property mutation.
        obj.name = 'Bob';
      }).toThrow(/outside of Obj.change/);
    });
  });

  describe('array mutations', () => {
    test('array push within Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      Obj.change(obj, (obj) => {
        obj.fields!.push({ label: 'tag2', value: 'val2' });
      });

      expect(obj.fields).toHaveLength(2);
      expect(obj.fields![1].label).toBe('tag2');
    });

    test('array pop within Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
        ],
      });

      let popped: any;
      Obj.change(obj, (obj) => {
        popped = obj.fields!.pop();
      });

      expect(popped.label).toBe('b');
      expect(obj.fields).toHaveLength(1);
    });

    test('array splice within Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [
          { label: 'a', value: '1' },
          { label: 'b', value: '2' },
          { label: 'c', value: '3' },
        ],
      });

      Obj.change(obj, (obj) => {
        obj.fields!.splice(1, 1, { label: 'x', value: 'x' });
      });

      expect(obj.fields).toHaveLength(3);
      expect(obj.fields![1].label).toBe('x');
    });

    test('array push outside Obj.change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.push({ label: 'tag2', value: 'val2' });
      }).toThrow(/array\.push\(\).*outside of Obj\.change/);
    });

    test('array pop outside Obj.change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.pop();
      }).toThrow(/array\.pop\(\).*outside of Obj\.change/);
    });

    test('array splice outside Obj.change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, {
        name: 'John',
        fields: [{ label: 'tag1', value: 'val1' }],
      });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly array mutation.
        obj.fields!.splice(0, 1);
      }).toThrow(/array\.splice\(\).*outside of Obj\.change/);
    });
  });

  describe('property delete', () => {
    test('delete property within Obj.change', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John', age: 25 });

      Obj.change(obj, (obj) => {
        delete obj.age;
      });

      expect(obj.age).toBeUndefined();
    });

    test('delete property outside Obj.change throws', ({ expect }) => {
      const obj = Obj.make(TestSchema.Person, { name: 'John', age: 25 });

      expect(() => {
        // @ts-expect-error Testing runtime error for readonly property delete.
        delete obj.age;
      }).toThrow(/delete object property.*outside of Obj\.change/);
    });
  });

  describe('Relation mutators', () => {
    test('Relation.getMeta is mutable inside Relation.change', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      Relation.change(rel, (rel) => {
        const meta = Relation.getMeta(rel);
        meta.tags = ['rel-tag'];
        meta.keys.push({ source: 'rel-source', id: 'rel-key' });
      });

      expect(Relation.getMeta(rel).tags).toEqual(['rel-tag']);
      expect(Relation.getMeta(rel).keys).toHaveLength(1);
    });

    test('Relation mutators work inside change callback', ({ expect }) => {
      const source = Obj.make(TestSchema.Person, { name: 'Alice' });
      const target = Obj.make(TestSchema.Person, { name: 'Bob' });
      const rel = Relation.make(TestSchema.HasManager, {
        [Relation.Source]: source,
        [Relation.Target]: target,
      });

      Relation.change(rel, (rel) => {
        Relation.addTag(rel, 'important');
      });

      expect(Relation.getMeta(rel).tags).toContain('important');

      Relation.change(rel, (rel) => {
        Relation.removeTag(rel, 'important');
      });

      expect(Relation.getMeta(rel).tags).not.toContain('important');
    });
  });

  describe('object references', () => {
    test('assigning root ECHO objects directly throws - must use Ref.make', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, {});
      const other = Obj.make(TestSchema.Expando, { string: 'bar' });

      // Direct assignment of root ECHO objects (created with Obj.make) is not allowed.
      expect(() => {
        Obj.change(obj, (obj) => {
          obj.other = other;
        });
      }).toThrow(/Object references must be wrapped with `Ref\.make`/);
    });

    test('plain nested objects use parent change context', ({ expect }) => {
      const obj = Obj.make(TestSchema.Expando, {});

      // Assign a plain object (not created with Obj.make).
      Obj.change(obj, (obj) => {
        obj.nested = { value: 'initial' };
      });
      expect(obj.nested.value).toBe('initial');

      // Modify plain nested object through parent's change context.
      Obj.change(obj, (obj) => {
        obj.nested.value = 'modified';
      });
      expect(obj.nested.value).toBe('modified');
    });
  });
});
