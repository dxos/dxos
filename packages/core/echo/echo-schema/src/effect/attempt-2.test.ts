import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';
import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { randomUUID } from 'node:crypto';

const EchoSchemaAnnotation = Symbol.for('dxos.echo.effect-schema');

class SchemaContext {
  public id = randomUUID();
  public typename: string;

  constructor(self: S.Schema<any, any>, params: ObjectSchemaParams) {
    this.typename = params.typename;
  }
}

type ObjectSchemaParams = {
  typename: string;
};

// TODO(dmaretskyi): Augment with ECHO fields: id, __schema, etc.
const objectSchema = <I, A>(params: ObjectSchemaParams, self: S.Schema<I, A>): S.Schema<I, A> =>
  S.make(AST.setAnnotation(self.ast, EchoSchemaAnnotation, new SchemaContext(self, params)));

const getSchemaContext = <I, A>(schema: S.Schema<I, A>): SchemaContext =>{
  const annotation = AST.getAnnotation(EchoSchemaAnnotation)(schema.ast);
  invariant(annotation, 'Not ECHO object schema.');
  return annotation as any;
}

class MockEchoObject {

  private _schema!: S.Schema<any>

  constructor({ schema }: { schema: S.Schema<any> }) {
    if(schema) {
      this.__schema = schema;
    }
  }

  get __schema() {
    return this._schema;
  }

  set __schema(value: S.Schema<any>) {
    this._schema = value;
    log.info('assign schema', {
      
    })
  }
}

describe.only('@effect/schema #1', () => {
  test('create schema', () => {
    const contact = objectSchema(
      {
        typename: 'example.org/Contact',
      },
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    log.info('schema id', { id: getSchemaContext(contact).id })
  });

  test('assign schema to object', () => {
    const contact = objectSchema(
      {
        typename: 'example.org/Contact',
      },
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    const obj = new MockEchoObject({ schema: contact });
  })
});
