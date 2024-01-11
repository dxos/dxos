//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { type NoInfer, type Simplify } from 'effect/Types';

import { describe, test } from '@dxos/test';

import { type EchoObject, type TypedObject, type TypedObjectOptions } from '../object';
import { Schema } from '../proto';
import { type Filter, type OperatorFilter } from '../query';

const EchoTypenameId = Symbol.for('dxos.echo.typename');
const EffectSchemaId = Symbol.for('dxos.echo.effect-schema');

interface EffectSchema<I, A> extends Schema {
  readonly [EffectSchemaId]: S.Schema<I, A>;
}

const createType = <I, A>(typename: string, self: S.Schema<I, A>): EffectSchema<I, A> => {
  const annotated = S.make(AST.setAnnotation(self.ast, EchoTypenameId, typename));
  const schema = new Schema({ typename }) as EffectSchema<I, A>;
  (schema as any)[EffectSchemaId] = annotated;
  return schema;
};

type InferType<T extends EffectSchema<any, any>> = T extends EffectSchema<infer I, infer A>
  ? TypedObject<Extract<A, {}>>
  : never;

const defineType =
  <Self>(typename: string) =>
  <Fields extends S.StructFields>(
    fields: Fields,
  ): [unknown] extends [Self] ? never /* Error */ : TypeClass<Self, Extract<Simplify<S.ToStruct<Fields>>, {}>> => {
    return null as any;
  };

interface TypeClass<Self, Props> {
  new (initialProps?: NoInfer<Partial<Props>>, opts?: TypedObjectOptions): TypedObject<Extract<Props, {}>>;

  filter(filter?: Partial<Props> | OperatorFilter<Self & EchoObject>): Filter<Self & EchoObject>;

  readonly schema: Schema;
  readonly effectSchema: S.Schema<Props>;
}

const createSchema = (typename: string, self: S.Schema<any, any>): Schema => {
  return null as any;
};

describe('@effect/schema #1', () => {
  test('functional', () => {
    const Contact = createType(
      'example.com/Contact',
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    type Contact = InferType<typeof Contact>;

    // const Contact = new Contact();
  });

  test('class based', () => {
    class Contact extends defineType<Contact>('example.com/Contact')({
      name: S.string.pipe(S.nonEmpty()),
      age: S.number,
    }) {}

    const Contact = new Contact();

    Contact.filter({ name: 'John' });

    Contact.schema;
    Contact.effectSchema;
  });

  test('schema only', () => {
    const Contact = createSchema(
      'example.com/Contact',
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );
  });
});
