import { describe, test } from '@dxos/test';
import * as S from '@effect/schema/Schema';
import * as AST from '@effect/schema/AST';
import { Schema } from '../proto';
import { EchoObject, TypedObject, TypedObjectOptions } from '../object';
import { NoInfer, Simplify } from 'effect/Types';
import { Filter, OperatorFilter } from '../query';

const EchoTypenameId = Symbol.for('dxos.echo.typename');

const EffectSchemaId = Symbol.for('dxos.echo.effect-schema');

interface EffectSchema<I, A> extends Schema {
  readonly [EffectSchemaId]: S.Schema<I, A>;
}

const createType = <I, A>(typename: string, self: S.Schema<I, A>): EffectSchema<I, A> => {
  const annotated = S.make(AST.setAnnotation(self.ast, EchoTypenameId, typename));

  const schema = new Schema({
    typename,
  }) as EffectSchema<I, A>;
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
  new (
    initialProps?: NoInfer<Partial<Props>>,
    opts?: TypedObjectOptions,
  ): TypedObject<Extract<Props, {}>>;

  filter(
    filter?: Partial<Props> | OperatorFilter<Self & EchoObject>,
  ): Filter<Self & EchoObject>;

  readonly schema: Schema;

  readonly effectSchema: S.Schema<Props>;
}

const createSchema = (typename: string, self: S.Schema<any, any>): Schema => {
  return null as any;
}

describe('@effect/schema #1', () => {
  test('functional', () => {
    const Person = createType(
      'example.com/Person',
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    type Person = InferType<typeof Person>;

    // const person = new Person();
  });

  test('class based', () => {
    class Person extends defineType<Person>('example.com/Person')({
      name: S.string.pipe(S.nonEmpty()),
      age: S.number,
    }) {}

    const person = new Person();

    Person.filter({ name: 'John' });

    Person.schema;
    Person.effectSchema;
  });

  test('schema only', () => {
    const person = createSchema(
      'example.com/Person',
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );
  })  
});
