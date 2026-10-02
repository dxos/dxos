//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import { toEffectSchema, toJsonSchema } from './internal/JsonSchema/json-schema.ts';
import { getLabelWithSchema } from './internal/Property/index.ts';
import * as Obj from './Obj.ts';
import * as Property from './Property.ts';
import * as Type from './Type.ts';

const Contact = Type.makeObject(DXN.make('com.example.type.propertyContact', '0.1.0'))(
  Schema.Struct({
    first: Schema.optional(Schema.String),
    last: Schema.optional(Schema.String),
  }).pipe(Property.implement(Property.Title, { template: '{first} {last}' })),
);

const Note = Type.makeObject(DXN.make('com.example.type.propertyNote', '0.1.0'))(
  Schema.Struct({
    heading: Schema.optional(Schema.String),
    slug: Schema.optional(Schema.String),
  }).pipe(Property.implement(Property.Title, { path: ['heading', 'slug'] })),
);

const Legacy = Type.makeObject(DXN.make('com.example.type.propertyLegacy', '0.1.0'))(
  Schema.Struct({ subject: Schema.optional(Schema.String) }).pipe(Annotation.LabelAnnotation.set(['subject'])),
);

const RootPath = Type.makeObject(DXN.make('com.example.type.propertyRootPath', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(
    Annotation.LabelAnnotation.set(['$.name', 'not a path']),
  ),
);

const Plain = Type.makeObject(DXN.make('com.example.type.propertyPlain', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
);

const Due = Property.make({ key: 'com.example.property.due', schema: Schema.String, title: 'Due' });

describe('Property', () => {
  test('definition carries a DXN and metadata', ({ expect }) => {
    expect(Property.Title.dxn).toBe('dxn:org.dxos.property.title');
    expect(Property.Title.title).toBe('Title');
    expect(Property.isProperty(Due)).toBe(true);
    expect(Property.isProperty({})).toBe(false);
  });

  test('template implementation is computed and read-only', ({ expect }) => {
    const contact = Obj.make(Contact, { first: 'Ada', last: 'Lovelace' });
    expect(Property.get(contact, Property.Title)).toBe('Ada Lovelace');
    expect(Obj.getLabel(Obj.make(Contact, { first: 'Ada' }))).toBe('Ada');
    expect(Obj.getLabel(Obj.make(Contact, {}))).toBeUndefined();
    expect(Obj.getLabel(contact)).toBe('Ada Lovelace');
    expect(Property.isWritable(contact, Property.Title)).toBe(false);

    Obj.update(contact, (contact) => {
      expect(Property.set(contact, Property.Title, 'Grace')).toBe(false);
      Obj.setLabel(contact, 'Grace');
    });
    expect(Obj.getLabel(contact)).toBe('Ada Lovelace');
  });

  test('two-way path implementation reads the chain and writes the first field', ({ expect }) => {
    const note = Obj.make(Note, { slug: 'draft' });
    expect(Obj.getLabel(note)).toBe('draft');
    expect(Property.isWritable(note, Property.Title)).toBe(true);
    expect(Obj.labelProperty(note)).toBe('heading');

    Obj.update(note, (note) => {
      Obj.setLabel(note, 'Plan');
    });
    expect(note.heading).toBe('Plan');
    expect(Property.get(note, Property.Title)).toBe('Plan');
  });

  test('title falls back to LabelAnnotation, then name', ({ expect }) => {
    const legacy = Obj.make(Legacy, { subject: 'Hello' });
    expect(Obj.getLabel(legacy)).toBe('Hello');
    expect(Obj.labelProperty(legacy)).toBe('subject');

    const plain = Obj.make(Plain, { name: 'Plain' });
    expect(Obj.getLabel(plain)).toBe('Plain');
    expect(Obj.labelProperty(plain)).toBe('name');
  });

  test('root-prefixed paths resolve and invalid paths read as absent', ({ expect }) => {
    const obj = Obj.make(RootPath, { name: 'Root' });
    expect(Obj.getLabel(obj)).toBe('Root');
    Obj.update(obj, (obj) => {
      Obj.setLabel(obj, 'Renamed');
    });
    expect(obj.name).toBe('Renamed');

    const invalid = Obj.make(
      Type.makeObject(DXN.make('com.example.type.propertyInvalidPath', '0.1.0'))(
        Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(Annotation.LabelAnnotation.set(['not a path'])),
      ),
      { name: 'Ignored' },
    );
    expect(Obj.getLabel(invalid)).toBeUndefined();
  });

  test('empty paths read as absent and are not writable', ({ expect }) => {
    for (const path of ['', '$.']) {
      const obj = Obj.make(
        Type.makeObject(DXN.make('com.example.type.propertyEmptyPath', '0.1.0'))(
          Schema.Struct({ name: Schema.optional(Schema.String) }).pipe(Annotation.LabelAnnotation.set([path])),
        ),
        { name: 'Ignored' },
      );
      expect(Obj.getLabel(obj)).toBeUndefined();
      expect(Property.isWritable(obj, Property.Title)).toBe(false);
      Obj.update(obj, (obj) => {
        expect(Property.set(obj, Property.Title, 'Renamed')).toBe(false);
      });
      expect(obj.name).toBe('Ignored');
    }
  });

  test('implementations survive JSON-schema serialization', ({ expect }) => {
    const jsonSchema = toJsonSchema(Type.getSchema(Contact));
    expect(JSON.parse(JSON.stringify(jsonSchema)).annotations.properties).toEqual({
      [Property.Title.dxn]: { template: '{first} {last}' },
    });

    const decoded = toEffectSchema(jsonSchema);
    expect(Property.getImplementation(decoded, Property.Title)).toEqual(Option.some({ template: '{first} {last}' }));
    expect(getLabelWithSchema(decoded, { first: 'Grace', last: 'Hopper' })).toBe('Grace Hopper');
  });

  test('unimplemented property resolves to nothing', ({ expect }) => {
    const plain = Obj.make(Plain, { name: 'Plain' });
    expect(Option.isNone(Property.getImplementation(Type.getSchema(Plain), Due))).toBe(true);
    expect(Property.get(plain, Due)).toBeUndefined();
    expect(Property.isWritable(plain, Due)).toBe(false);
  });
});
