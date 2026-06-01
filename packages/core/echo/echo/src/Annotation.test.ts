//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation';
import * as Obj from './Obj';
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

      const nameProperty = PersonSchema.ast.propertySignatures.find((prop) => prop.name === 'name');
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
    const makeTaggedPersonType = (ColorAnnotation: Annotation.Annotation<string>) =>
      Schema.Struct({
        name: Schema.String,
      })
        .pipe(ColorAnnotation.set('schema-teal'))
        .pipe(Type.makeObject(DXN.make('com.example.type.taggedperson', '0.1.0')));

    test('set and get on Obj.make instance', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const TaggedPerson = makeTaggedPersonType(ColorAnnotation);

      const person = Obj.make(TaggedPerson, { name: 'Alice' });

      Obj.update(person, (obj) => {
        Annotation.set(obj, ColorAnnotation, 'instance-red');
      });
      const result = Annotation.get(person, ColorAnnotation);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('instance-red');
    });

    test('get returns None when instance has no annotation value', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const TaggedPerson = makeTaggedPersonType(ColorAnnotation);

      const person = Obj.make(TaggedPerson, { name: 'Bob' });

      expect(Option.isNone(Annotation.get(person, ColorAnnotation))).toBe(true);
    });

    test('instance annotation is independent of schema default', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const TaggedPerson = makeTaggedPersonType(ColorAnnotation);

      const person = Obj.make(TaggedPerson, { name: 'Carol' });

      expect(Option.getOrThrow(ColorAnnotation.get(Type.getSchema(TaggedPerson)))).toBe('schema-teal');
      expect(Option.isNone(Annotation.get(person, ColorAnnotation))).toBe(true);

      Obj.update(person, (obj) => {
        Annotation.set(obj, ColorAnnotation, 'instance-blue');
      });

      expect(Option.getOrThrow(Annotation.get(person, ColorAnnotation))).toBe('instance-blue');
      expect(Option.getOrThrow(ColorAnnotation.get(Type.getSchema(TaggedPerson)))).toBe('schema-teal');
    });

    test('set and get inside Obj.update', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const TaggedPerson = makeTaggedPersonType(ColorAnnotation);

      const person = Obj.make(TaggedPerson, { name: 'Dana' });

      Obj.update(person, (obj) => {
        Annotation.set(obj, ColorAnnotation, 'updated');
      });

      expect(Option.getOrThrow(Annotation.get(person, ColorAnnotation))).toBe('updated');
    });

    test('curried get and set on instances', ({ expect }) => {
      const ColorAnnotation = Annotation.make({
        id: 'org.dxos.annotation.color',
        schema: Schema.String,
      });
      const TaggedPerson = makeTaggedPersonType(ColorAnnotation);

      const person = Obj.make(TaggedPerson, { name: 'Eve' });

      Obj.update(person, (obj) => {
        Annotation.set(ColorAnnotation, 'curried')(obj);
      });
      const result = Annotation.get(ColorAnnotation)(person);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('curried');
    });
  });
});
