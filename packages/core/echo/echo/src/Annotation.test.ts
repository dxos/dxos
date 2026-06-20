//
// Copyright 2026 DXOS.org
//

import * as Registry from '@effect-atom/atom/Registry';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as Obj from './Obj';
import * as Ref from './Ref';
import * as Type from './Type';

describe('Annotation', () => {
  describe('make', () => {
    test('creates an annotation with a string schema', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      expect(ColorAnnotation.key).toBe('org.dxos.annotation.color');
      expect(ColorAnnotation.schema).toBe(Schema.String);
      expect(ColorAnnotation[Annotation.TypeId]).toBeDefined();
    });

    test('creates an annotation with a number schema', ({ expect }) => {
      const PriorityAnnotation = Annotation.make({
        id: 'org.dxos.annotation.priority',
        schema: Schema.Number,
      });

      expect(PriorityAnnotation.key).toBe('org.dxos.annotation.priority');
      expect(PriorityAnnotation.schema).toBe(Schema.Number);
    });

    test('creates an annotation with a complex schema', ({ expect }) => {
      const MetadataSchema = Schema.Struct({
        author: Schema.String,
        version: Schema.Number,
        tags: Schema.Array(Schema.String),
      });
      const MetadataAnnotation = Annotation.make({
        id: 'org.dxos.annotation.metadata',
        schema: MetadataSchema,
      });

      expect(MetadataAnnotation.key).toBe('org.dxos.annotation.metadata');
      expect(MetadataAnnotation.schema).toBe(MetadataSchema);
    });
  });

  describe('getDictionary and setDictionary', () => {
    test('set and get a string value', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(values, ColorAnnotation, 'red');
      const result = Annotation.getDictionary(values, ColorAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('red');
    });

    test('set and get a number value', ({ expect }) => {
      const PriorityAnnotation = Annotation.make({
        id: 'org.dxos.annotation.priority',
        schema: Schema.Number,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(values, PriorityAnnotation, 42);
      const result = Annotation.getDictionary(values, PriorityAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe(42);
    });

    test('set and get a boolean value', ({ expect }) => {
      const EnabledAnnotation = Annotation.make({
        id: 'org.dxos.annotation.enabled',
        schema: Schema.Boolean,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(values, EnabledAnnotation, true);
      const result = Annotation.getDictionary(values, EnabledAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe(true);
    });

    test('set and get a complex object value', ({ expect }) => {
      const ConfigSchema = Schema.Struct({
        theme: Schema.String,
        fontSize: Schema.Number,
        darkMode: Schema.Boolean,
      });
      const ConfigAnnotation = Annotation.make({
        id: 'org.dxos.annotation.config',
        schema: ConfigSchema,
      });
      const values: Annotation.Dictionary = {};

      const config = { theme: 'modern', fontSize: 14, darkMode: true };
      Annotation.setDictionary(values, ConfigAnnotation, config);
      const result = Annotation.getDictionary(values, ConfigAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toEqual(config);
    });

    test('set and get an array value', ({ expect }) => {
      const TagsAnnotation = Annotation.make({
        id: 'org.dxos.annotation.tags',
        schema: Schema.Array(Schema.String),
      });
      const values: Annotation.Dictionary = {};

      const tags = ['important', 'urgent', 'review'];
      Annotation.setDictionary(values, TagsAnnotation, tags);
      const result = Annotation.getDictionary(values, TagsAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toEqual(tags);
    });

    test('get returns None for missing annotation', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};

      const result = Annotation.getDictionary(values, ColorAnnotation);

      expect(Option.isNone(result)).toBe(true);
    });

    test('overwriting an annotation value', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(values, ColorAnnotation, 'red');
      Annotation.setDictionary(values, ColorAnnotation, 'blue');
      const result = Annotation.getDictionary(values, ColorAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('blue');
    });

    test('multiple annotations on the same dictionary', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const PriorityAnnotation = Annotation.make({
        id: 'org.dxos.annotation.priority',
        schema: Schema.Number,
      });
      const EnabledAnnotation = Annotation.make({
        id: 'org.dxos.annotation.enabled',
        schema: Schema.Boolean,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(values, ColorAnnotation, 'green');
      Annotation.setDictionary(values, PriorityAnnotation, 5);
      Annotation.setDictionary(values, EnabledAnnotation, false);

      expect(Option.getOrThrow(Annotation.getDictionary(values, ColorAnnotation))).toBe('green');
      expect(Option.getOrThrow(Annotation.getDictionary(values, PriorityAnnotation))).toBe(5);
      expect(Option.getOrThrow(Annotation.getDictionary(values, EnabledAnnotation))).toBe(false);
    });
  });

  describe('curried forms', () => {
    test('getDictionary curried form', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};
      Annotation.setDictionary(values, ColorAnnotation, 'purple');

      const getColor = Annotation.getDictionary(ColorAnnotation);
      const result = getColor(values);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('purple');
    });

    test('setDictionary curried form', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};

      const setOrange = Annotation.setDictionary(ColorAnnotation, 'orange');
      setOrange(values);
      const result = Annotation.getDictionary(values, ColorAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('orange');
    });

    test('curried forms work in pipelines', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};

      Annotation.setDictionary(ColorAnnotation, 'cyan')(values);
      const result = Annotation.getDictionary(ColorAnnotation)(values);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('cyan');
    });
  });

  describe('Key', () => {
    test('Key.make creates a branded key', ({ expect }) => {
      const key = Annotation.Key.make('org.dxos.annotation.my-annotation');

      expect(key).toBe('org.dxos.annotation.my-annotation');
      expect(typeof key).toBe('string');
    });
  });

  describe('Dictionary schema', () => {
    test('Dictionary can be used as a schema', ({ expect }) => {
      const PersonWithAnnotations = Schema.Struct({
        name: Schema.String,
        extensions: Annotation.Dictionary,
      });

      const person = Schema.decodeUnknownSync(PersonWithAnnotations)({
        name: 'Alice',
        extensions: {},
      });

      expect(person.name).toBe('Alice');
      expect(person.extensions).toEqual({});
    });

    test('Dictionary schema accepts annotation data', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const values: Annotation.Dictionary = {};
      Annotation.setDictionary(values, ColorAnnotation, 'red');

      const PersonWithAnnotations = Schema.Struct({
        name: Schema.String,
        extensions: Annotation.Dictionary,
      });

      const person = Schema.decodeUnknownSync(PersonWithAnnotations)({
        name: 'Bob',
        extensions: values,
      });

      expect(person.name).toBe('Bob');
      const color = Annotation.getDictionary(person.extensions, ColorAnnotation);
      expect(Option.getOrThrow(color)).toBe('red');
    });
  });

  describe('TypeId', () => {
    test('TypeId is a unique symbol-like string', ({ expect }) => {
      expect(Annotation.TypeId).toBe('~@dxos/echo/Annotation');
    });

    test('annotations have TypeId property', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      expect(Annotation.TypeId in ColorAnnotation).toBe(true);
    });
  });

  describe('schema', () => {
    test('set and get on a struct schema', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      const PersonSchema = Schema.Struct({
        name: Schema.String,
      }).pipe(ColorAnnotation.set('crimson'));

      const result = ColorAnnotation.get(PersonSchema);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('crimson');
    });

    test('get returns None when annotation is not on schema', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      const PersonSchema = Schema.Struct({
        name: Schema.String,
      });

      expect(Option.isNone(ColorAnnotation.get(PersonSchema))).toBe(true);
    });

    test('set and get on a property schema', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      const PersonSchema = Schema.Struct({
        name: Schema.String.pipe(ColorAnnotation.set('navy')),
      });

      const nameProperty = SchemaAST.getPropertySignatures(PersonSchema.ast).find((prop) => prop.name === 'name');
      expect(nameProperty).toBeDefined();

      const result = ColorAnnotation.getFromAst(nameProperty!.type);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('navy');
    });

    test('annotation survives Type.makeObject and is readable from Type.getSchema', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });

      const TaggedPerson = Schema.Struct({
        name: Schema.String,
      })
        .pipe(ColorAnnotation.set('teal'))
        .pipe(Type.makeObject(DXN.make('com.example.type.taggedperson', '0.1.0')));

      const schema = Type.getSchema(TaggedPerson);
      const result = ColorAnnotation.get(schema);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('teal');
    });
  });

  describe('object', () => {
    const ColorAnnotation = Annotation.make({
      id: 'org.dxos.annotation.color',
      schema: Schema.String,
    });
    const Person = Schema.Struct({
      name: Schema.String,
    })
      .pipe(ColorAnnotation.set('schema-teal'))
      .pipe(Type.makeObject(DXN.make('com.example.type.taggedperson', '0.1.0')));

    test('set and get on Obj.make instance', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Alice' });

      Obj.update(person, (person) => {
        Annotation.set(person, ColorAnnotation, 'instance-red');
      });
      const result = Annotation.get(person, ColorAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('instance-red');
    });

    test('get returns None when instance has no annotation value', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Bob' });

      expect(Option.isNone(Annotation.get(person, ColorAnnotation))).toBe(true);
    });

    test('instance annotation is independent of schema default', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Carol' });

      expect(Option.getOrThrow(ColorAnnotation.get(Type.getSchema(Person)))).toBe('schema-teal');
      expect(Option.isNone(Annotation.get(person, ColorAnnotation))).toBe(true);

      Obj.update(person, (person) => {
        Annotation.set(person, ColorAnnotation, 'instance-blue');
      });

      expect(Option.getOrThrow(Annotation.get(person, ColorAnnotation))).toBe('instance-blue');
      expect(Option.getOrThrow(ColorAnnotation.get(Type.getSchema(Person)))).toBe('schema-teal');
    });

    test('set and get inside Obj.update', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Dana' });

      Obj.update(person, (person) => {
        Annotation.set(person, ColorAnnotation, 'updated');
      });

      expect(Option.getOrThrow(Annotation.get(person, ColorAnnotation))).toBe('updated');
    });

    test('curried get and set on instances', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Eve' });

      Obj.update(person, (person) => {
        Annotation.set(ColorAnnotation, 'curried')(person);
      });
      const result = Annotation.get(ColorAnnotation)(person);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('curried');
    });

    test('get reads annotation from a snapshot', ({ expect }) => {
      const person = Obj.make(Person, { name: 'Frank' });
      Obj.update(person, (person) => {
        Annotation.set(person, ColorAnnotation, 'snapshot-color');
      });

      const snapshot = Obj.getSnapshot(person);
      expect(Option.getOrThrow(Annotation.get(snapshot, ColorAnnotation))).toBe('snapshot-color');
    });
  });

  describe('atom', () => {
    // Record-valued annotation mirroring a per-key ordering (e.g. SectionOrderAnnotation).
    const OrderAnnotation = Annotation.make({
      id: 'org.dxos.test.order',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
    });
    const Container = Schema.Struct({ name: Schema.String }).pipe(
      Type.makeObject(DXN.make('com.example.type.container', '0.1.0')),
    );

    const setOrder = (obj: Obj.Unknown, order: Record<string, string[]>) =>
      Obj.update(obj, (obj) => {
        Annotation.set(obj, OrderAnnotation, order);
      });

    test('atomProperty reads the typed slice for a key', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      setOrder(obj, { typeA: ['x', 'y'], typeB: ['m'] });

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');
      expect(registry.get(atomA)).toEqual(['x', 'y']);
    });

    test('atomProperty returns undefined for a missing key or annotation', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });

      const missingAnnotation = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');
      expect(registry.get(missingAnnotation)).toBeUndefined();

      setOrder(obj, { typeA: ['x'] });
      const missingKey = Annotation.atomProperty(obj, OrderAnnotation, 'typeZ');
      expect(registry.get(missingKey)).toBeUndefined();
    });

    test('atomProperty updates when its own key changes', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      setOrder(obj, { typeA: ['x', 'y'] });

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');
      let fires = 0;
      registry.subscribe(atomA, () => {
        fires++;
      });
      expect(registry.get(atomA)).toEqual(['x', 'y']);

      setOrder(obj, { typeA: ['y', 'x'] });
      expect(registry.get(atomA)).toEqual(['y', 'x']);
      expect(fires).toBeGreaterThan(0);
    });

    test('atomProperty reflects only its own key', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      setOrder(obj, { typeA: ['x', 'y'], typeB: ['m'] });

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');
      expect(registry.get(atomA)).toEqual(['x', 'y']);

      // Changing a different key leaves typeA's value content unchanged.
      setOrder(obj, { typeA: ['x', 'y'], typeB: ['m', 'n'] });
      expect(registry.get(atomA)).toEqual(['x', 'y']);
    });

    test('atom exposes the whole annotation value as an Option', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });

      const wholeAtom = Annotation.atom(obj, OrderAnnotation);
      expect(Option.isNone(registry.get(wholeAtom))).toBe(true);

      setOrder(obj, { typeA: ['x'] });
      expect(Option.getOrThrow(registry.get(wholeAtom))).toEqual({ typeA: ['x'] });
    });
  });

  describe('reactive in-place mutation', () => {
    const OrderAnnotation = Annotation.make({
      id: 'org.dxos.test.mutable-order',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Schema.String) }),
    });
    const RefOrderAnnotation = Annotation.make({
      id: 'org.dxos.test.mutable-ref-order',
      schema: Schema.Record({ key: Schema.String, value: Schema.Array(Ref.Ref(Obj.Unknown)) }),
    });
    const Item = Schema.Struct({ name: Schema.String }).pipe(
      Type.makeObject(DXN.make('com.example.type.mutableItem', '0.1.0')),
    );
    const Container = Schema.Struct({ name: Schema.String }).pipe(
      Type.makeObject(DXN.make('com.example.type.mutableContainer', '0.1.0')),
    );

    test('push to an annotation array in place without Annotation.set', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => Annotation.set(obj, OrderAnnotation, { typeA: ['x', 'y'] }));

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');
      expect(registry.get(atomA)).toEqual(['x', 'y']);

      Annotation.update(obj, OrderAnnotation, (order) => {
        order.typeA.push('z');
      });

      expect(registry.get(atomA)).toEqual(['x', 'y', 'z']);
    });

    test('splice an annotation array in place reorders the value', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => Annotation.set(obj, OrderAnnotation, { typeA: ['x', 'y', 'z'] }));

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');

      Annotation.update(obj, OrderAnnotation, (order) => {
        order.typeA.splice(0, order.typeA.length, 'z', 'x', 'y');
      });

      expect(registry.get(atomA)).toEqual(['z', 'x', 'y']);
    });

    test('in-place mutation of one key leaves other keys untouched', ({ expect }) => {
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => Annotation.set(obj, OrderAnnotation, { typeA: ['x'], typeB: ['m'] }));

      Annotation.update(obj, OrderAnnotation, (order) => {
        order.typeA.push('y');
      });

      expect(Option.getOrThrow(Annotation.get(obj, OrderAnnotation))).toEqual({ typeA: ['x', 'y'], typeB: ['m'] });
    });

    test('push a Ref to an annotation array in place', ({ expect }) => {
      const obj = Obj.make(Container, { name: 'A' });
      const a = Obj.make(Item, { name: 'a' });
      const b = Obj.make(Item, { name: 'b' });
      Obj.update(obj, (obj) => Annotation.set(obj, RefOrderAnnotation, { typeA: [Ref.make(a)] }));

      Annotation.update(obj, RefOrderAnnotation, (order) => {
        order.typeA.push(Ref.make(b));
      });

      const result = Annotation.get(obj, RefOrderAnnotation).pipe(Option.getOrThrow);
      expect(result.typeA.map((ref) => ref.target?.id)).toEqual([a.id, b.id]);
    });

    test('atomProperty notifies subscribers when a Ref array is reordered in place', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      const a = Obj.make(Item, { name: 'a' });
      const b = Obj.make(Item, { name: 'b' });
      const c = Obj.make(Item, { name: 'c' });
      Obj.update(obj, (obj) =>
        Annotation.set(obj, RefOrderAnnotation, { typeA: [Ref.make(a), Ref.make(b), Ref.make(c)] }),
      );

      const atomA = Annotation.atomProperty(obj, RefOrderAnnotation, 'typeA');
      let fires = 0;
      registry.subscribe(atomA, () => {
        fires++;
      });
      registry.get(atomA);

      Annotation.update(obj, RefOrderAnnotation, (order) => {
        order.typeA.splice(0, order.typeA.length, Ref.make(c), Ref.make(a), Ref.make(b));
      });

      expect(fires).toBeGreaterThan(0);
      // The atom emits a shallow snapshot of the ref array (refs kept intact).
      expect(registry.get(atomA)?.map((ref) => ref.target?.id)).toEqual([c.id, a.id, b.id]);
    });

    test('reorder snapshot does not touch ref targets (tolerates cyclic targets)', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      const a = Obj.make(Item, { name: 'a' });
      // The annotation on `obj` holds a ref back to `obj`, so a loaded target forms a cycle —
      // the shallow snapshot copies the array without dereferencing its ref elements, so it tolerates this.
      Obj.update(obj, (obj) => Annotation.set(obj, RefOrderAnnotation, { typeA: [Ref.make(a), Ref.make(obj)] }));

      const atomA = Annotation.atomProperty(obj, RefOrderAnnotation, 'typeA');
      let fires = 0;
      registry.subscribe(atomA, () => {
        fires++;
      });
      registry.get(atomA);

      Annotation.update(obj, RefOrderAnnotation, (order) => {
        order.typeA.splice(0, order.typeA.length, Ref.make(obj), Ref.make(a));
      });

      expect(fires).toBeGreaterThan(0);
    });

    test('Annotation.update mutates in place (wraps its own change)', ({ expect }) => {
      const registry = Registry.make();
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => Annotation.set(obj, OrderAnnotation, { typeA: ['x', 'y'] }));

      const atomA = Annotation.atomProperty(obj, OrderAnnotation, 'typeA');

      // No surrounding Obj.update — Annotation.update opens its own change transaction.
      Annotation.update(obj, OrderAnnotation, (order) => {
        order.typeA.push('z');
      });

      expect(registry.get(atomA)).toEqual(['x', 'y', 'z']);
    });

    test('Annotation.update is a no-op when the annotation is absent', ({ expect }) => {
      const obj = Obj.make(Container, { name: 'A' });
      let called = false;
      Annotation.update(obj, OrderAnnotation, () => {
        called = true;
      });

      expect(called).toBe(false);
      expect(Option.isNone(Annotation.get(obj, OrderAnnotation))).toBe(true);
    });

    test('Annotation.update validates the mutated value against the annotation schema', ({ expect }) => {
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => Annotation.set(obj, OrderAnnotation, { typeA: ['x'] }));

      expect(() =>
        Annotation.update(obj, OrderAnnotation, (order) => {
          // Pushing a number into a string array violates the annotation schema.
          // @ts-expect-error intentional type violation to exercise runtime validation
          order.typeA.push(42);
        }),
      ).toThrow();
    });

    test('set validates the value against the annotation schema', ({ expect }) => {
      const obj = Obj.make(Container, { name: 'A' });
      Obj.update(obj, (obj) => {
        // OrderAnnotation values must be string arrays; a number element violates the schema.
        // @ts-expect-error intentional type violation to exercise runtime validation
        expect(() => Annotation.set(obj, OrderAnnotation, { typeA: [1] })).toThrow();
      });
    });
  });
});
