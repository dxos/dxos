//
// Copyright 2024 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';
import { randomUUID } from 'node:crypto';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

const EchoSchemaAnnotation = Symbol.for('dxos.echo.effect-schema');
const StrongRefAnnotation = Symbol.for('dxos.echo.strong-ref');

enum RefKind {
  WEAK = 'weak',
  STRONG = 'strong',
}

// TODO(burdon): Rename SchemaMeta?
type SchemaMeta = {
  // Fully qualified schema name (e.g., "example.com/type/Contact").
  typename: string;

  // Semver string.
  version: string;
};

class SchemaRegistry {
  private readonly _schema = new Map<string, Map<string, S.Schema>>();

  // TODO(burdon): Standardize Schema name vs. Typename?
  getSchemaNames() {
    return Array.from(this._schema.keys());
  }

  getSchema(name: string, version?: string): S.Schema | undefined {
    const versions = this._schema.get(name);
    if (!versions) {
      return undefined;
    }

    // TODO(burdon): Get latest compatible version.
    const versions1 = Array.from(versions.keys()).sort();
    if (version) {
      return versions?.get(version);
    }

    return versions1[versions1.length - 1];
  }

  getVersions(name: string): string[] | undefined {
    const versions = this._schema.get(name);
    if (!versions) {
      return undefined;
    }

    // TODO(burdon): semver doesn't sort naturally.
    return Array.from(versions.keys()).sort();
  }

  _getOrCreateVersionMap(name: string) {
    let versions = this._schema.get(name);
    if (!versions) {
      versions = new Map<string, S.Schema>();
      this._schema.set(name, versions);
    }
    return versions;
  }
}

class SchemaContext {
  public id = randomUUID();
  public typename: string;

  constructor(self: S.Schema<any, any>, meta: SchemaMeta) {
    this.typename = meta.typename;
  }
}

// TODO(dmaretskyi): Augment with ECHO fields: id, __schema, etc.
const objectSchema = <I, A>(meta: SchemaMeta, schema: S.Schema<I, A>): S.Schema<I, A> => {
  return S.make(AST.setAnnotation(schema.ast, EchoSchemaAnnotation, new SchemaContext(schema, meta)));
};

const getSchemaContext = <I, A>(schema: S.Schema<I, A>): SchemaContext => {
  const annotation = AST.getAnnotation(EchoSchemaAnnotation)(schema.ast);
  invariant(annotation, 'Invalid ECHO object schema.');
  return annotation as any;
};

const ref = <I, A>(self: S.Schema<I, A>, kind: RefKind = RefKind.WEAK): S.Schema<I, A> =>
  S.make(AST.setAnnotation(self.ast, StrongRefAnnotation, RefKind.STRONG));

class MockEchoObject {
  private _schema!: S.Schema<any>;

  constructor({ schema }: { schema: S.Schema<any> }) {
    if (schema) {
      this.__schema = schema;
    }
  }

  get __schema() {
    return this._schema;
  }

  set __schema(value: S.Schema<any>) {
    this._schema = value;
    log.info('assign schema', {});
  }
}

describe.skip('@effect/schema #1', () => {
  test('create schema', () => {
    const contact = objectSchema(
      {
        typename: 'example.com/Contact',
      },
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    const task = objectSchema(
      {
        typename: 'example.com/Task',
      },
      S.struct({
        title: S.string,
        description: S.string,
        creator: ref(contact, RefKind.STRONG),
      }),
    );

    log.info('schema id', { id: getSchemaContext(contact).id });
  });

  test('assign schema to object', () => {
    const contact = objectSchema(
      {
        typename: 'example.com/Contact',
        version: '0.0.1',
      },
      S.struct({
        name: S.string,
        age: S.number,
      }),
    );

    const obj = new MockEchoObject({ schema: contact });
  });
});
