//
// Copyright 2022 DXOS.org
//

import * as JSONSchema from '@effect/schema/JSONSchema';
import type * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { getTypename, toEffectSchema, toJsonSchema } from './json-schema';
import { getSchema, object } from './reactive';
import { Expando } from '../object';
import { Schema } from '../proto';

describe('JSON Schema', () => {
  test('convert schema to JSON schema', async () => {
    const contact = new Schema({
      typename: 'example.com/schema/contact',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
          description: 'name of the person',
        },
      ],
    });

    {
      const jsonSchema = toJsonSchema(contact);
      expect(jsonSchema.$id).to.eq('example.com/schema/contact');
    }

    {
      const person = new Expando(
        {
          name: 'Satoshi',
        },
        { schema: contact },
      );

      const jsonSchema = toJsonSchema(person.__schema!);
      expect(jsonSchema.$id).to.eq('example.com/schema/contact');
    }
  });

  test('convert schema to ts-effect schema', async () => {
    const echoSchema = new Schema({
      typename: 'example.com/schema/contact',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
          description: 'name of the person',
        },
        {
          id: 'active',
          type: Schema.PropType.BOOLEAN,
          description: 'person is online',
        },
        {
          id: 'activity',
          type: Schema.PropType.NUMBER,
          description: 'activity score',
        },
      ],
    });

    // Convert to ts-effect schema.
    const Contact = toEffectSchema(echoSchema);
    type Contact = S.Schema.Type<typeof Contact>;

    const person: Contact = object(Contact, {
      name: 'Satoshi',
      active: true,
      activity: 100,
    });

    expect(getSchema(person)).to.equal(Contact);

    // Convert to JSON schema.
    const jsonSchema = JSONSchema.make(Contact);
    // console.log('JSON schema', JSON.stringify(jsonSchema, undefined, 2));
    expect(jsonSchema.$schema).to.eq('http://json-schema.org/draft-07/schema#');
    expect(getTypename(jsonSchema as any)).to.eq('example.com/schema/contact');
  });
});
