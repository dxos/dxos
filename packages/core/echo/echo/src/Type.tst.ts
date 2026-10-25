//
// Copyright 2026 DXOS.org
//

import { flow } from 'effect/Function';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'tstyche';

import { DXN } from '@dxos/keys';

import * as Annotation from './Annotation.ts';
import * as Obj from './Obj.ts';
import * as Type from './Type.ts';

class Labeled extends Type.makeObject<Labeled>(DXN.make('com.example.type.labeled', '0.1.0'))(
  {
    label: Schema.String,
    count: Schema.optional(Schema.Number),
  },
  Annotation.LabelAnnotation.set(['label']),
) {}

class FromStruct extends Type.makeObject<FromStruct>(DXN.make('com.example.type.fromStruct', '0.1.0'))(
  Schema.Struct({ label: Schema.String, count: Schema.optional(Schema.Number) }),
) {}

describe('Type.makeObject', () => {
  it('infers the same instance type from fields as from Schema.Struct', () => {
    expect<Type.InstanceType<typeof Labeled>>().type.toBe<Type.InstanceType<typeof FromStruct>>();
    expect<Type.InstanceType<typeof Labeled>['label']>().type.toBe<string>();
    expect<Type.InstanceType<typeof Labeled>['count']>().type.toBe<number | undefined>();
  });

  it('accepts fields without an annotate function', () => {
    class Plain extends Type.makeObject<Plain>(DXN.make('com.example.type.plain', '0.1.0'))({
      name: Schema.String,
    }) {}
    expect<Type.InstanceType<typeof Plain>['name']>().type.toBe<string>();
  });

  it('accepts several annotations composed with flow', () => {
    class Flowed extends Type.makeObject<Flowed>(DXN.make('com.example.type.flowed', '0.1.0'))(
      { label: Schema.String },
      flow(Annotation.LabelAnnotation.set(['label']), Annotation.DescriptionAnnotation.set('A flowed type.')),
    ) {}
    expect<Type.InstanceType<typeof Flowed>['label']>().type.toBe<string>();
  });

  it('accepts several annotations piped onto the struct', () => {
    class Piped extends Type.makeObject<Piped>(DXN.make('com.example.type.piped', '0.1.0'))(
      { label: Schema.String },
      (schema) =>
        schema.pipe(Annotation.LabelAnnotation.set(['label']), Annotation.DescriptionAnnotation.set('A piped type.')),
    ) {}
    expect<Type.InstanceType<typeof Piped>['label']>().type.toBe<string>();
  });

  it('infers the instance type from a combinator that changes the schema', () => {
    class Extended extends Type.makeObject<Extended>(DXN.make('com.example.type.extended', '0.1.0'))(
      { label: Schema.String },
      flow(Schema.fieldsAssign({ extra: Schema.Number }), Annotation.LabelAnnotation.set(['label'])),
    ) {}
    expect<Type.InstanceType<typeof Extended>['extra']>().type.toBe<number>();
  });

  it('still infers when piped as a schema combinator', () => {
    const Piped = Schema.Struct({ label: Schema.String }).pipe(
      Type.makeObject(DXN.make('com.example.type.pipedSchema', '0.1.0')),
    );
    expect<Type.InstanceType<typeof Piped>['label']>().type.toBe<string>();
  });

  it('passes the same struct schema to the annotate function as Schema.Struct builds', () => {
    const struct = Schema.Struct({ name: Schema.String });
    Type.makeObject(DXN.make('com.example.type.annotateArg', '0.1.0'))({ name: Schema.String }, (schema) => {
      expect(schema).type.toBe<typeof struct>();
      return schema;
    });
  });

  it('rejects field values that are not schemas', () => {
    expect(Type.makeObject(DXN.make('com.example.type.badField', '0.1.0'))({ name: 'not a schema' })).type.toRaiseError(
      'is not assignable',
    );
  });

  it('rejects an annotate function that does not return a schema', () => {
    expect(
      Type.makeObject(DXN.make('com.example.type.badAnnotate', '0.1.0'))({ name: Schema.String }, () => 'x'),
    ).type.toRaiseError();
  });

  it('rejects props that do not match the fields', () => {
    expect(Obj.make(Labeled, { label: 1 })).type.toRaiseError();
  });
});
