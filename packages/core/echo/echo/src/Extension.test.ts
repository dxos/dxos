//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Extension from './Extension';

describe('Extension', () => {
  describe('make', () => {
    test('creates an extension with a string schema', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);

      expect(ColorExtension.key).toBe('color');
      expect(ColorExtension.valueSchema).toBe(Schema.String);
      expect(ColorExtension[Extension.TypeId]).toBeDefined();
    });

    test('creates an extension with a number schema', ({ expect }) => {
      const PriorityExtension = Extension.make('priority', Schema.Number);

      expect(PriorityExtension.key).toBe('priority');
      expect(PriorityExtension.valueSchema).toBe(Schema.Number);
    });

    test('creates an extension with a complex schema', ({ expect }) => {
      const MetadataSchema = Schema.Struct({
        author: Schema.String,
        version: Schema.Number,
        tags: Schema.Array(Schema.String),
      });
      const MetadataExtension = Extension.make('metadata', MetadataSchema);

      expect(MetadataExtension.key).toBe('metadata');
      expect(MetadataExtension.valueSchema).toBe(MetadataSchema);
    });
  });

  describe('get and set', () => {
    test('set and get a string value', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};

      Extension.set(values, ColorExtension, 'red');
      const result = Extension.get(values, ColorExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('red');
    });

    test('set and get a number value', ({ expect }) => {
      const PriorityExtension = Extension.make('priority', Schema.Number);
      const values: Extension.Values = {};

      Extension.set(values, PriorityExtension, 42);
      const result = Extension.get(values, PriorityExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe(42);
    });

    test('set and get a boolean value', ({ expect }) => {
      const EnabledExtension = Extension.make('enabled', Schema.Boolean);
      const values: Extension.Values = {};

      Extension.set(values, EnabledExtension, true);
      const result = Extension.get(values, EnabledExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe(true);
    });

    test('set and get a complex object value', ({ expect }) => {
      const ConfigSchema = Schema.Struct({
        theme: Schema.String,
        fontSize: Schema.Number,
        darkMode: Schema.Boolean,
      });
      const ConfigExtension = Extension.make('config', ConfigSchema);
      const values: Extension.Values = {};

      const config = { theme: 'modern', fontSize: 14, darkMode: true };
      Extension.set(values, ConfigExtension, config);
      const result = Extension.get(values, ConfigExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toEqual(config);
    });

    test('set and get an array value', ({ expect }) => {
      const TagsExtension = Extension.make('tags', Schema.Array(Schema.String));
      const values: Extension.Values = {};

      const tags = ['important', 'urgent', 'review'];
      Extension.set(values, TagsExtension, tags);
      const result = Extension.get(values, TagsExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toEqual(tags);
    });

    test('get returns None for missing extension', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};

      const result = Extension.get(values, ColorExtension);

      expect(Option.isNone(result)).toBe(true);
    });

    test('overwriting an extension value', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};

      Extension.set(values, ColorExtension, 'red');
      Extension.set(values, ColorExtension, 'blue');
      const result = Extension.get(values, ColorExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('blue');
    });

    test('multiple extensions on the same values object', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const PriorityExtension = Extension.make('priority', Schema.Number);
      const EnabledExtension = Extension.make('enabled', Schema.Boolean);
      const values: Extension.Values = {};

      Extension.set(values, ColorExtension, 'green');
      Extension.set(values, PriorityExtension, 5);
      Extension.set(values, EnabledExtension, false);

      expect(Option.getOrThrow(Extension.get(values, ColorExtension))).toBe('green');
      expect(Option.getOrThrow(Extension.get(values, PriorityExtension))).toBe(5);
      expect(Option.getOrThrow(Extension.get(values, EnabledExtension))).toBe(false);
    });
  });

  describe('curried forms', () => {
    test('get curried form', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};
      Extension.set(values, ColorExtension, 'purple');

      const getColor = Extension.get(ColorExtension);
      const result = getColor(values);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('purple');
    });

    test('set curried form', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};

      const setOrange = Extension.set(ColorExtension, 'orange');
      setOrange(values);
      const result = Extension.get(values, ColorExtension);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('orange');
    });

    test('curried forms work in pipelines', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};

      Extension.set(ColorExtension, 'cyan')(values);
      const result = Extension.get(ColorExtension)(values);

      expect(Option.isSome(result)).toBe(true);
      expect(Option.getOrThrow(result)).toBe('cyan');
    });
  });

  describe('Key', () => {
    test('Key.make creates a branded key', ({ expect }) => {
      const key = Extension.Key.make('my-extension');

      expect(key).toBe('my-extension');
      expect(typeof key).toBe('string');
    });
  });

  describe('Values schema', () => {
    test('Values can be used as a schema', ({ expect }) => {
      const PersonWithExtensions = Schema.Struct({
        name: Schema.String,
        extensions: Extension.Values,
      });

      const person = Schema.decodeUnknownSync(PersonWithExtensions)({
        name: 'Alice',
        extensions: {},
      });

      expect(person.name).toBe('Alice');
      expect(person.extensions).toEqual({});
    });

    test('Values schema accepts extension data', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);
      const values: Extension.Values = {};
      Extension.set(values, ColorExtension, 'red');

      const PersonWithExtensions = Schema.Struct({
        name: Schema.String,
        extensions: Extension.Values,
      });

      const person = Schema.decodeUnknownSync(PersonWithExtensions)({
        name: 'Bob',
        extensions: values,
      });

      expect(person.name).toBe('Bob');
      const color = Extension.get(person.extensions, ColorExtension);
      expect(Option.getOrThrow(color)).toBe('red');
    });
  });

  describe('TypeId', () => {
    test('TypeId is a unique symbol-like string', ({ expect }) => {
      expect(Extension.TypeId).toBe('~@dxos/echo/Extension');
    });

    test('extensions have TypeId property', ({ expect }) => {
      const ColorExtension = Extension.make('color', Schema.String);

      expect(Extension.TypeId in ColorExtension).toBe(true);
    });
  });
});
