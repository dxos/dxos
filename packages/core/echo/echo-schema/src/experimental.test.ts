//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import { EchoObject, type JsonSchemaType, Ref as Ref$ } from './ast';
import { FormatEnum, FormatAnnotationId } from './formats/types';
import { createStatic, type Expando as Expando$, type ObjectId as ObjectId$ } from './object';
import { type BaseSchema, type EchoSchema, type ImmutableSchema } from './schema';
import { type WithId } from './types';

/**
 * ECHO API.
 */
export namespace Echo {
  export type ObjectId = ObjectId$;
  export type Expando = Expando$;

  // TODO(burdon): Type or Schema? (Type matches effect and typename "example.com/type/Foo").
  export type Type<T = any> = BaseSchema<T>;
  export type MutableType<T> = EchoSchema<T>;
  export type ImmutableType<T> = ImmutableSchema<T>;

  export type Ref<T> = Ref$<T>;
  export type JsonSchema = JsonSchemaType;

  export const Type = ({ typename, version }: { typename: string; version: string }) => EchoObject(typename, version);
  export const Ref = (schema: any) => Ref$(schema);
}

const getType = (obj: object): Echo.Type => null as any; // TODO(burdon): Remove getTypename, etc.
const createRef = <T extends WithId>(obj: T): Echo.Ref<T> => null as any; // TODO(burdon): Replace makeRef.

const Org = S.Struct({
  name: S.String,
}).pipe(
  Echo.Type({
    typename: 'example.com/type/Org',
    version: '0.1.0',
  }),
);

// TODO(burdon): Remove Type suffix in Composer?
interface Org extends S.Schema.Type<typeof Org> {}

const Contact = S.Struct({
  name: S.String,
  email: S.optional(
    S.String.annotations({
      // TODO(burdon): Rename TypeAnnotationId?
      [FormatAnnotationId]: FormatEnum.Email,
    }),
  ),
  org: S.optional(Echo.Ref(Org)),
}).pipe(
  Echo.Type({
    typename: 'example.com/type/Contact',
    version: '0.1.0',
  }),
);

interface Contact extends S.Schema.Type<typeof Contact> {}

// TODO(burdon): Support S.Date, etc.

describe('Experimental API review', () => {
  test.skip('basic', () => {
    const org: Org = createStatic(Org, { name: 'DXOS' });
    const contact: Contact = createStatic(Contact, { name: 'Test', org: createRef(org) });
    const type: Echo.Type<Contact> = getType(contact);
    const { typename, version } = type;
    log.info('obj', { id: contact.id, typename, version });
  });
});
