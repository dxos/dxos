//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { EchoObject, Ref as RefFn } from './ast';
import { FormatAnnotationId, FormatEnum } from './formats';
import { getTypename } from './object';

/**
 * ECHO API.
 */
export namespace Echo {
  export const Object = ({ typename, version }: { typename: string; version: string }) => EchoObject(typename, version);
  export const Ref = (schema: any) => RefFn(schema);
}

const Org = S.Struct({
  name: S.String,
}).pipe(
  Echo.Object({
    typename: 'example.com/type/Org',
    version: '0.1.0',
  }),
);

type Org = S.Schema.Type<typeof Org>;

const Contact = S.Struct({
  name: S.String,
  email: S.String.annotations({ [FormatAnnotationId]: FormatEnum.Email }),
  org: Echo.Ref(Org),
}).pipe(
  Echo.Object({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

type Contact = S.Schema.Type<typeof Contact>;

describe('api review', () => {
  test('basic', () => {
    const obj: Contact = {} as Contact;
    getTypename(obj);
  });
});
